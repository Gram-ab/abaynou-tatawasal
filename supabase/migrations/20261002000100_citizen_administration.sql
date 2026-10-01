begin;
grant create on schema app to app_writer;

alter table app.command_receipts drop constraint command_receipts_command_type_check;
alter table app.command_receipts add constraint command_receipts_command_type_check check(command_type in (
 'COMPLAINT_SUBMIT','COMPLAINT_EDIT','COMPLAINT_WITHDRAW','COMPLAINT_START_REVIEW','COMPLAINT_START_PROCESSING',
 'COMPLAINT_SEND_RESPONSE','COMPLAINT_NOT_ACCEPT','COMPLAINT_CORRECT_RESPONSE','COMPLAINT_CLOSE',
 'CATEGORY_CREATE','CATEGORY_UPDATE','CATEGORY_SET_ACTIVE','LOCATION_CREATE','LOCATION_UPDATE','LOCATION_SET_ACTIVE',
 'PUBLIC_CONTENT_PUBLISH','COMMUNE_SETTINGS_UPDATE','CITIZEN_SET_STATUS'));
alter table app.command_receipts drop constraint command_receipts_result_resource_type_check;
alter table app.command_receipts add constraint command_receipts_result_resource_type_check check(
 result_resource_type in ('COMPLAINT','CATEGORY','LOCATION','PUBLIC_PAGE','COMMUNE_SETTINGS','APPLICATION_PROFILE'));

-- app_web can invoke only these projections/commands; the function owner is the
-- restricted app_writer role, and each entry point validates an ADMIN session.
create function app.list_citizen_accounts(p_auth uuid,p_provider uuid,p_digest bytea,p_query text,p_status text,p_page integer)
returns table(profile_id uuid,full_name text,email text,access_status text,created_at timestamptz,total_count bigint)
language plpgsql security definer set search_path='' as $$
begin
 perform * from app.require_staff_admin(p_auth,p_provider,p_digest);
 perform set_config('app.staff_admin_provider_read','on',true);
 if p_page is null or p_page<1 or p_page>10000 or (p_status is not null and p_status not in ('ACTIVE','DISABLED'))
  or length(coalesce(p_query,''))>160 then raise exception using errcode='22023',message='Invalid Citizen lookup';end if;
 return query select p.id,p.full_name,u.email::text,p.access_status,p.created_at,count(*) over()
 from app.application_profiles p join auth.users u on u.id=p.auth_user_id
 where p.role='CITIZEN' and u.email_confirmed_at is not null
  and (p_status is null or p.access_status=p_status)
  and (nullif(btrim(p_query),'') is null or p.full_name ilike '%'||btrim(p_query)||'%' or u.email ilike '%'||btrim(p_query)||'%')
 order by p.created_at desc,p.id desc offset (p_page-1)*20 limit 20;
end $$;

create function app.read_citizen_admin_account(p_auth uuid,p_provider uuid,p_digest bytea,p_profile uuid)
returns table(profile_id uuid,auth_user_id uuid,full_name text,email text,contact_phone text,preferred_language text,access_status text,revision bigint,security_epoch bigint,created_at timestamptz)
language plpgsql security definer set search_path='' as $$
begin
 perform * from app.require_staff_admin(p_auth,p_provider,p_digest);
 perform set_config('app.staff_admin_provider_read','on',true);
 return query select p.id,p.auth_user_id,p.full_name,u.email::text,p.contact_phone,p.preferred_language,p.access_status,p.revision,p.security_epoch,p.created_at
 from app.application_profiles p join auth.users u on u.id=p.auth_user_id where p.id=p_profile and p.role='CITIZEN' and u.email_confirmed_at is not null;
end $$;

create function app.read_citizen_status_audit(p_auth uuid,p_provider uuid,p_digest bytea,p_profile uuid)
returns table(action text,reason text,occurred_at timestamptz,change_summary jsonb)
language plpgsql security definer set search_path='' as $$
begin
 perform * from app.require_staff_admin(p_auth,p_provider,p_digest);
 if not exists(select 1 from app.application_profiles p where p.id=p_profile and p.role='CITIZEN') then return;end if;
 return query select a.action,a.reason,a.occurred_at,a.change_summary from app.audit_events a
 where a.resource_type='APPLICATION_PROFILE' and a.resource_id=p_profile and a.action in ('ACCOUNT_DISABLED','ACCOUNT_ENABLED')
 order by a.occurred_at desc,a.id desc limit 30;
end $$;

-- A neutral public recovery response is kept in the application action. Only
-- an active confirmed Citizen is allowed to receive an Auth recovery request.
create function app.citizen_recovery_allowed(p_email text) returns boolean
language plpgsql security definer set search_path='' as $$
declare allowed boolean;
begin
 perform set_config('app.staff_admin_provider_read','on',true);
 select true into allowed from auth.users u join app.application_profiles p on p.auth_user_id=u.id
 where lower(u.email)=lower(btrim(p_email)) and u.email_confirmed_at is not null and p.role='CITIZEN' and p.access_status='ACTIVE';
 return coalesce(allowed,false);
end $$;

create function app.set_citizen_access(p_auth uuid,p_provider uuid,p_digest bytea,p_profile uuid,p_expected bigint,p_status text,p_reason text,p_key uuid,p_fingerprint bytea)
returns table(auth_user_id uuid,access_status text,revision bigint,replayed boolean)
language plpgsql security definer set search_path='' as $$
declare actor record;target app.application_profiles;receipt app.command_receipts;event_id uuid;reason_text text;
begin
 select * into actor from app.require_staff_admin(p_auth,p_provider,p_digest);
 perform set_config('app.staff_admin_actor',actor.profile_id::text,true);
 perform set_config('app.complaint_actor',actor.profile_id::text,true);
 reason_text:=btrim(p_reason);
 if p_profile is null or p_expected is null or p_expected<1 or p_key is null or p_fingerprint is null or octet_length(p_fingerprint)<>32
  or p_status is null or p_status not in ('ACTIVE','DISABLED') or p_reason is null or char_length(reason_text) not between 3 and 1000 then
  raise exception using errcode='22023',message='Invalid Citizen status command';end if;
 -- The profile lock serializes competing status changes and all guarded
 -- Citizen commands. Application sessions are touched only afterward.
 select * into target from app.application_profiles where id=p_profile for update;
 if not found or target.role<>'CITIZEN' then raise exception using errcode='P0404',message='Citizen account unavailable';end if;
 select * into receipt from app.command_receipts where actor_id=actor.profile_id and idempotency_key=p_key;
 if found then
  if receipt.command_type<>'CITIZEN_SET_STATUS' or receipt.result_resource_id<>p_profile or receipt.request_fingerprint<>p_fingerprint then
   raise exception using errcode='P0409',message='Command key conflict';end if;
  return query select target.auth_user_id,target.access_status,target.revision,true;return;
 end if;
 if target.revision<>p_expected or target.access_status=p_status then raise exception using errcode='P0412',message='Citizen account changed';end if;
 update app.application_profiles p set access_status=p_status,security_epoch=p.security_epoch+case when p_status='DISABLED' then 1 else 0 end,
  revision=p.revision+1,updated_at=transaction_timestamp() where p.id=p_profile returning * into target;
 if p_status='DISABLED' then
  update app.application_sessions s set revoked_at=transaction_timestamp(),revocation_reason='ACCOUNT_DISABLED'
  where s.profile_id=p_profile and s.revoked_at is null;
 end if;
 insert into app.audit_events(actor_id,actor_type,actor_role,action,resource_type,resource_id,reason,change_summary)
 values(actor.profile_id,'USER','ADMIN',case when p_status='DISABLED' then 'ACCOUNT_DISABLED' else 'ACCOUNT_ENABLED' end,
  'APPLICATION_PROFILE',p_profile,reason_text,jsonb_build_object('status',p_status,'revision',target.revision,'security_epoch',target.security_epoch)) returning id into event_id;
 insert into app.command_receipts(actor_id,idempotency_key,command_type,request_fingerprint,result_resource_type,result_resource_id,result_revision,source_event_id)
 values(actor.profile_id,p_key,'CITIZEN_SET_STATUS',p_fingerprint,'APPLICATION_PROFILE',p_profile,target.revision,event_id);
 return query select target.auth_user_id,target.access_status,target.revision,false;
end $$;

-- The existing Citizen resolver locked session before profile. Resolve the
-- profile identity without a lock, then lock profile before re-reading and
-- locking the session, and validate every binding again.
create or replace function app.resolve_citizen_session(p_auth_user_id uuid,p_provider_session_id uuid,p_secret_digest bytea,p_meaningful_activity boolean default false)
returns table(state text,session_id uuid,profile_id uuid,full_name text,contact_phone text,preferred_language text,profile_revision bigint,absolute_expires_at timestamptz)
language plpgsql security definer set search_path='' as $$
declare s app.application_sessions;p app.application_profiles;candidate uuid;v_state text;
begin
 select x.profile_id into candidate from app.application_sessions x where x.secret_digest=p_secret_digest and x.provider_session_id=p_provider_session_id;
 if candidate is null then return;end if;
 select * into p from app.application_profiles where id=candidate and auth_user_id=p_auth_user_id for update;
 if not found or p.role<>'CITIZEN' then return;end if;
 select x.* into s from app.application_sessions x where x.secret_digest=p_secret_digest and x.provider_session_id=p_provider_session_id and x.profile_id=p.id for update;
 if not found then return;end if;
 if s.revoked_at is not null then v_state:='REVOKED';
 elsif p.access_status<>'ACTIVE' then v_state:='DISABLED';
 elsif s.security_epoch<>p.security_epoch then v_state:='STALE';
 elsif s.absolute_expires_at<=transaction_timestamp() or s.last_user_activity_at+s.idle_timeout_seconds*interval '1 second'<=transaction_timestamp() then v_state:='EXPIRED';
 elsif (select count(distinct pg.page_key) from app.legal_acknowledgements a join app.public_page_versions v on v.id=a.page_version_id join app.public_pages pg on pg.id=v.page_id where a.citizen_id=p.id and pg.page_key in ('TERMS','PRIVACY'))<2 then v_state:='INCOMPLETE';
 else v_state:='VALID';end if;
 if v_state in ('DISABLED','STALE','EXPIRED','INCOMPLETE') and s.revoked_at is null then
  update app.application_sessions set revoked_at=transaction_timestamp(),revocation_reason=case v_state when 'DISABLED' then 'ACCOUNT_DISABLED' when 'EXPIRED' then 'EXPIRED' else 'SECURITY_ACTION' end where id=s.id;
 elsif v_state='VALID' and p_meaningful_activity and s.last_user_activity_at<transaction_timestamp()-interval '5 minutes' then
  update app.application_sessions set last_user_activity_at=transaction_timestamp() where id=s.id;
 end if;
 return query select v_state,s.id,p.id,p.full_name,p.contact_phone,p.preferred_language,p.revision,s.absolute_expires_at;
end $$;

create or replace function app.update_citizen_profile(p_auth_user_id uuid,p_provider_session_id uuid,p_secret_digest bytea,p_expected_revision bigint,p_full_name text,p_contact_phone text,p_language text)
returns table(full_name text,contact_phone text,preferred_language text,revision bigint)
language plpgsql security definer set search_path='' as $$
declare s app.application_sessions;p app.application_profiles;candidate uuid;changed text[]:=array[]::text[];
begin
 select x.profile_id into candidate from app.application_sessions x where x.secret_digest=p_secret_digest and x.provider_session_id=p_provider_session_id;
 if candidate is null then raise exception using errcode='42501',message='Invalid application session';end if;
 select * into p from app.application_profiles where id=candidate and auth_user_id=p_auth_user_id and role='CITIZEN' for update;
 if not found or p.access_status<>'ACTIVE' then raise exception using errcode='42501',message='Invalid application session';end if;
 select x.* into s from app.application_sessions x where x.secret_digest=p_secret_digest and x.provider_session_id=p_provider_session_id and x.profile_id=p.id for update;
 if not found or s.revoked_at is not null or p.security_epoch<>s.security_epoch or s.absolute_expires_at<=transaction_timestamp()
  or s.last_user_activity_at+s.idle_timeout_seconds*interval '1 second'<=transaction_timestamp() then raise exception using errcode='42501',message='Invalid application session';end if;
 if p.revision<>p_expected_revision then raise exception using errcode='40001',message='Stale profile revision';end if;
 if p.full_name is distinct from btrim(p_full_name) then changed:=array_append(changed,'full_name');end if;
 if p.contact_phone is distinct from p_contact_phone then changed:=array_append(changed,'contact_phone');end if;
 if p.preferred_language is distinct from p_language then changed:=array_append(changed,'preferred_language');end if;
 if cardinality(changed)>0 then
  update app.application_profiles as x set full_name=btrim(p_full_name),contact_phone=p_contact_phone,preferred_language=p_language,
   updated_at=transaction_timestamp(),revision=x.revision+1 where x.id=p.id returning x.* into p;
  insert into app.audit_events(actor_id,actor_type,actor_role,action,resource_type,resource_id,change_summary)
  values(p.id,'USER','CITIZEN','PROFILE_UPDATED','APPLICATION_PROFILE',p.id,jsonb_build_object('fields',to_jsonb(changed)));
 end if;
 return query select p.full_name,p.contact_phone,p.preferred_language,p.revision;
end $$;

create or replace function app.revoke_current_citizen_session(p_auth_user_id uuid,p_provider_session_id uuid,p_secret_digest bytea)
returns boolean language plpgsql security definer set search_path='' as $$
declare s app.application_sessions;p app.application_profiles;candidate uuid;
begin
 select x.profile_id into candidate from app.application_sessions x where x.secret_digest=p_secret_digest and x.provider_session_id=p_provider_session_id;
 if candidate is null then return false;end if;
 select * into p from app.application_profiles where id=candidate and auth_user_id=p_auth_user_id for update;
 if not found then return false;end if;
 select * into s from app.application_sessions where secret_digest=p_secret_digest and provider_session_id=p_provider_session_id and profile_id=p.id for update;
 if not found then return false;end if;
 if s.revoked_at is null then
  update app.application_sessions set revoked_at=transaction_timestamp(),revocation_reason='LOGOUT' where id=s.id;
  insert into app.audit_events(actor_id,actor_type,actor_role,action,resource_type,resource_id,change_summary)
  values(p.id,'USER','CITIZEN','SESSION_REVOKED','APPLICATION_SESSION',s.id,jsonb_build_object('reason','LOGOUT'));
 end if;
 return true;
end $$;

-- A stale recovery or email-change callback cannot rotate security state or
-- retain a session after the account becomes disabled.
create or replace function app.secure_citizen_sessions(p_auth_user_id uuid,p_reason text,p_keep_provider_session_id uuid,p_current_secret_digest bytea,p_new_secret_digest bytea)
returns bigint language plpgsql security definer set search_path='' as $$
declare p app.application_profiles;s app.application_sessions;new_epoch bigint;
begin
 if p_reason not in ('PASSWORD_RESET','PASSWORD_CHANGE','EMAIL_CHANGE','ACCOUNT_DISABLED','AUTHORITY_CHANGED','SECURITY_ACTION') then raise exception using errcode='23514',message='Invalid security action';end if;
 select * into p from app.application_profiles where auth_user_id=p_auth_user_id and role='CITIZEN' for update;
 if not found or p.access_status<>'ACTIVE' then raise exception using errcode='42501',message='Citizen account unavailable';end if;
 if p_keep_provider_session_id is not null then
  select * into s from app.application_sessions where profile_id=p.id and provider_session_id=p_keep_provider_session_id and secret_digest=p_current_secret_digest and revoked_at is null for update;
  if not found or p_new_secret_digest is null or s.security_epoch<>p.security_epoch or s.absolute_expires_at<=transaction_timestamp()
   or s.last_user_activity_at+s.idle_timeout_seconds*interval '1 second'<=transaction_timestamp() then raise exception using errcode='42501',message='Current application session required';end if;
 end if;
 new_epoch:=p.security_epoch+1;
 update app.application_profiles set security_epoch=new_epoch,updated_at=transaction_timestamp(),revision=revision+1 where id=p.id;
 update app.application_sessions set revoked_at=transaction_timestamp(),revocation_reason=p_reason where profile_id=p.id and revoked_at is null and (p_keep_provider_session_id is null or provider_session_id<>p_keep_provider_session_id);
 if p_keep_provider_session_id is not null then update app.application_sessions set security_epoch=new_epoch,secret_digest=p_new_secret_digest,reauthenticated_at=transaction_timestamp() where id=s.id;end if;
 insert into app.audit_events(actor_id,actor_type,actor_role,action,resource_type,resource_id,change_summary)
 values(p.id,'USER','CITIZEN','ACCOUNT_SECURITY_CHANGED','APPLICATION_PROFILE',p.id,jsonb_build_object('operation',p_reason,'current_session_retained',p_keep_provider_session_id is not null));
 return new_epoch;
end $$;

-- Lock the recipient profile so eligibility serializes with an Admin disable.
create or replace function app.enqueue_complaint_notification(p_recipient uuid,p_event uuid,p_complaint uuid,p_type text)
returns void language plpgsql security definer set search_path='' as $$
declare sequence bigint;original_actor text:=current_setting('app.complaint_actor',true);original_staff text:=current_setting('app.complaint_staff',true);recipient_role text;recipient_status text;
begin
 select role,access_status into recipient_role,recipient_status from app.application_profiles where id=p_recipient for share;
 if recipient_role is null or recipient_status<>'ACTIVE' then return;end if;
 perform set_config('app.complaint_actor',p_recipient::text,true);
 perform set_config('app.complaint_staff',case when recipient_role in ('AGENT','ADMIN') then 'true' else '' end,true);
 insert into app.notification_state(profile_id) values(p_recipient) on conflict(profile_id) do nothing;
 update app.notification_state set last_sequence=last_sequence+1,change_revision=change_revision+1 where profile_id=p_recipient returning last_sequence into sequence;
 insert into app.notifications(recipient_id,source_event_id,complaint_id,type,recipient_sequence) values(p_recipient,p_event,p_complaint,p_type,sequence) on conflict(recipient_id,source_event_id,type) do nothing;
 perform set_config('app.complaint_actor',coalesce(original_actor,''),true);
 perform set_config('app.complaint_staff',coalesce(original_staff,''),true);
end $$;

create or replace function app.enqueue_complaint_email(p_recipient uuid,p_event uuid,p_complaint uuid,p_type text,p_language text)
returns void language plpgsql security definer set search_path='' as $$
declare original_actor text:=current_setting('app.complaint_actor',true);original_staff text:=current_setting('app.complaint_staff',true);recipient_status text;
begin
 select access_status into recipient_status from app.application_profiles where id=p_recipient and role='CITIZEN' for share;
 if recipient_status is distinct from 'ACTIVE' then return;end if;
 perform set_config('app.complaint_actor',p_recipient::text,true);perform set_config('app.complaint_staff','',true);
 insert into app.email_outbox(recipient_id,complaint_id,source_event_id,event_type,language) values(p_recipient,p_complaint,p_event,p_type,p_language);
 perform set_config('app.complaint_actor',coalesce(original_actor,''),true);perform set_config('app.complaint_staff',coalesce(original_staff,''),true);
end $$;

do $$ declare f text;begin foreach f in array array[
 'list_citizen_accounts(uuid,uuid,bytea,text,text,integer)',
 'read_citizen_admin_account(uuid,uuid,bytea,uuid)',
 'read_citizen_status_audit(uuid,uuid,bytea,uuid)',
 'citizen_recovery_allowed(text)',
 'set_citizen_access(uuid,uuid,bytea,uuid,bigint,text,text,uuid,bytea)'
 ] loop
 execute 'alter function app.'||f||' owner to app_writer';
 execute 'revoke all on function app.'||f||' from public,anon,authenticated,service_role,app_reader,app_writer';
 execute 'grant execute on function app.'||f||' to app_web';
 end loop;end $$;
revoke create on schema app from app_writer;
commit;
