begin;

grant create on schema app to app_reader,app_writer;
grant select,insert,update on app.application_profiles to app_writer;
create policy profiles_writer on app.application_profiles to app_writer using(true) with check(true);

drop policy audit_writer_insert on app.audit_events;
create policy audit_writer_insert on app.audit_events for insert to app_writer with check (
 (actor_type='SYSTEM' and action in ('PUBLIC_CONTENT_PUBLISHED','SETTINGS_UPDATED'))
 or (actor_type='USER' and action in ('PROFILE_UPDATED','LEGAL_ACKNOWLEDGED','SESSION_REVOKED','ACCOUNT_SECURITY_CHANGED'))
);

create function app.read_signup_legal(p_language text)
 returns table(terms_version_id uuid,terms_title text,terms_body text,privacy_version_id uuid,privacy_title text,privacy_body text)
 language sql stable security definer set search_path='' as $$
 with current_copy as (
  select p.page_key,v.id,t.title,t.body
  from app.public_pages p
  join app.public_page_versions v on v.page_id=p.id and v.version_number=p.current_version
  join app.public_page_translations t on t.version_id=v.id and t.language=p_language
  where p.page_key in ('TERMS','PRIVACY') and p_language in ('ar','fr','en')
 )
 select t.id,t.title,t.body,p.id,p.title,p.body
 from current_copy t cross join current_copy p where t.page_key='TERMS' and p.page_key='PRIVACY'
 $$;
alter function app.read_signup_legal(text) owner to app_reader;
revoke all on function app.read_signup_legal(text) from public,anon,authenticated,service_role,app_reader,app_writer;
grant execute on function app.read_signup_legal(text) to app_web;

create function app.provision_citizen(
 p_auth_user_id uuid,p_full_name text,p_contact_phone text,p_language text,
 p_terms_version_id uuid,p_privacy_version_id uuid
) returns table(profile_id uuid,created boolean,complete boolean)
 language plpgsql security definer set search_path='' as $$
declare
 v_profile app.application_profiles;
 v_created boolean:=false;
 v_profile_audit uuid;
 v_legal_audit uuid;
 v_ack_time timestamptz:=transaction_timestamp();
 v_terms_page uuid;
 v_privacy_page uuid;
 v_missing integer;
begin
 if p_language not in ('ar','fr','en') then raise exception using errcode='23514',message='Invalid locale'; end if;
 if length(btrim(p_full_name)) not between 1 and 200 then raise exception using errcode='23514',message='Invalid full name'; end if;
 if p_contact_phone is not null and btrim(p_contact_phone)='' then p_contact_phone:=null; end if;

 select p.id into v_terms_page from app.public_pages p
 join app.public_page_versions v on v.page_id=p.id and v.version_number=p.current_version
 join app.public_page_translations t on t.version_id=v.id and t.language=p_language
 where p.page_key='TERMS' and v.id=p_terms_version_id for update of p;
 select p.id into v_privacy_page from app.public_pages p
 join app.public_page_versions v on v.page_id=p.id and v.version_number=p.current_version
 join app.public_page_translations t on t.version_id=v.id and t.language=p_language
 where p.page_key='PRIVACY' and v.id=p_privacy_version_id for update of p;
 if v_terms_page is null or v_privacy_page is null then
  raise exception using errcode='40001',message='Legal publications changed';
 end if;

 select * into v_profile from app.application_profiles where auth_user_id=p_auth_user_id for update;
 if not found then
  insert into app.application_profiles(auth_user_id,full_name,contact_phone,preferred_language,role,access_status)
  values(p_auth_user_id,btrim(p_full_name),p_contact_phone,p_language,'CITIZEN','ACTIVE') returning * into v_profile;
  v_created:=true;
  v_profile_audit:=gen_random_uuid();
  insert into app.audit_events(id,actor_id,actor_type,actor_role,action,resource_type,resource_id,change_summary)
  values(v_profile_audit,v_profile.id,'USER','CITIZEN','PROFILE_UPDATED','APPLICATION_PROFILE',v_profile.id,
   jsonb_build_object('operation','CITIZEN_SIGNUP','fields',jsonb_build_array('full_name','contact_phone','preferred_language')));
 elsif v_profile.role<>'CITIZEN' then
  raise exception using errcode='42501',message='Citizen provisioning denied';
 end if;

 select count(*)::integer into v_missing from (values(p_terms_version_id),(p_privacy_version_id)) wanted(id)
 where not exists(select 1 from app.legal_acknowledgements a where a.citizen_id=v_profile.id and a.page_version_id=wanted.id);
 if v_missing>0 then
  v_legal_audit:=gen_random_uuid();
  insert into app.audit_events(id,actor_id,actor_type,actor_role,action,resource_type,resource_id,change_summary)
  values(v_legal_audit,v_profile.id,'USER','CITIZEN','LEGAL_ACKNOWLEDGED','APPLICATION_PROFILE',v_profile.id,
   jsonb_build_object('pages',jsonb_build_array('TERMS','PRIVACY'),'language',p_language));
  insert into app.legal_acknowledgements(citizen_id,page_version_id,language,acknowledged_at,audit_event_id)
  values(v_profile.id,p_terms_version_id,p_language,v_ack_time,v_legal_audit),
        (v_profile.id,p_privacy_version_id,p_language,v_ack_time,v_legal_audit)
  on conflict(citizen_id,page_version_id) do nothing;
 end if;
 return query select v_profile.id,v_created,
  (select count(distinct p.page_key)=2 from app.legal_acknowledgements a
   join app.public_page_versions v on v.id=a.page_version_id join app.public_pages p on p.id=v.page_id
   where a.citizen_id=v_profile.id and p.page_key in ('TERMS','PRIVACY'));
end $$;
alter function app.provision_citizen(uuid,text,text,text,uuid,uuid) owner to app_writer;

create function app.read_provisioning_state(p_auth_user_id uuid)
 returns table(profile_id uuid,state text,full_name text,contact_phone text,preferred_language text,revision bigint)
 language sql stable security definer set search_path='' as $$
 select p.id,
  case when p.access_status='DISABLED' then 'DISABLED'
       when p.role<>'CITIZEN' then 'DENIED'
       when (select count(distinct pg.page_key) from app.legal_acknowledgements a
          join app.public_page_versions v on v.id=a.page_version_id join app.public_pages pg on pg.id=v.page_id
          where a.citizen_id=p.id and pg.page_key in ('TERMS','PRIVACY'))<2 then 'INCOMPLETE'
       else 'COMPLETE' end,
  p.full_name,p.contact_phone,p.preferred_language,p.revision
 from app.application_profiles p where p.auth_user_id=p_auth_user_id
 $$;
alter function app.read_provisioning_state(uuid) owner to app_writer;

create function app.create_citizen_session(p_auth_user_id uuid,p_provider_session_id uuid,p_secret_digest bytea)
 returns table(session_id uuid,profile_id uuid,full_name text,preferred_language text,absolute_expires_at timestamptz)
 language plpgsql security definer set search_path='' as $$
declare p app.application_profiles;s app.application_sessions;
begin
 select * into p from app.application_profiles where auth_user_id=p_auth_user_id for update;
 if not found or p.role<>'CITIZEN' or p.access_status<>'ACTIVE' then return; end if;
 if (select count(distinct pg.page_key) from app.legal_acknowledgements a
     join app.public_page_versions v on v.id=a.page_version_id join app.public_pages pg on pg.id=v.page_id
     where a.citizen_id=p.id and pg.page_key in ('TERMS','PRIVACY'))<2 then return; end if;
 insert into app.application_sessions(profile_id,provider_session_id,secret_digest,security_epoch,idle_timeout_seconds,absolute_expires_at)
 values(p.id,p_provider_session_id,p_secret_digest,p.security_epoch,604800,transaction_timestamp()+interval '30 days') returning * into s;
 return query select s.id,p.id,p.full_name,p.preferred_language,s.absolute_expires_at;
end $$;
alter function app.create_citizen_session(uuid,uuid,bytea) owner to app_writer;

create function app.resolve_citizen_session(p_auth_user_id uuid,p_provider_session_id uuid,p_secret_digest bytea,p_meaningful_activity boolean default false)
 returns table(state text,session_id uuid,profile_id uuid,full_name text,contact_phone text,preferred_language text,profile_revision bigint,absolute_expires_at timestamptz)
 language plpgsql security definer set search_path='' as $$
declare s app.application_sessions;p app.application_profiles;v_state text;
begin
 select * into s from app.application_sessions where secret_digest=p_secret_digest for update;
 if not found or s.provider_session_id<>p_provider_session_id then return; end if;
 select * into p from app.application_profiles where id=s.profile_id and auth_user_id=p_auth_user_id for update;
 if not found or p.role<>'CITIZEN' then return; end if;
 if s.revoked_at is not null then v_state:='REVOKED';
 elsif p.access_status<>'ACTIVE' then v_state:='DISABLED';
 elsif s.security_epoch<>p.security_epoch then v_state:='STALE';
 elsif s.absolute_expires_at<=transaction_timestamp()
    or s.last_user_activity_at+(s.idle_timeout_seconds*interval '1 second')<=transaction_timestamp() then v_state:='EXPIRED';
 elsif (select count(distinct pg.page_key) from app.legal_acknowledgements a
     join app.public_page_versions v on v.id=a.page_version_id join app.public_pages pg on pg.id=v.page_id
     where a.citizen_id=p.id and pg.page_key in ('TERMS','PRIVACY'))<2 then v_state:='INCOMPLETE';
 else v_state:='VALID'; end if;
 if v_state in ('DISABLED','STALE','EXPIRED','INCOMPLETE') and s.revoked_at is null then
  update app.application_sessions set revoked_at=transaction_timestamp(),revocation_reason=
   case v_state when 'DISABLED' then 'ACCOUNT_DISABLED' when 'EXPIRED' then 'EXPIRED' else 'SECURITY_ACTION' end where id=s.id returning * into s;
 elsif v_state='VALID' and p_meaningful_activity and s.last_user_activity_at<transaction_timestamp()-interval '5 minutes' then
  update app.application_sessions set last_user_activity_at=transaction_timestamp() where id=s.id returning * into s;
 end if;
 return query select v_state,s.id,p.id,p.full_name,p.contact_phone,p.preferred_language,p.revision,s.absolute_expires_at;
end $$;
alter function app.resolve_citizen_session(uuid,uuid,bytea,boolean) owner to app_writer;

create function app.update_citizen_profile(p_auth_user_id uuid,p_provider_session_id uuid,p_secret_digest bytea,p_expected_revision bigint,p_full_name text,p_contact_phone text,p_language text)
 returns table(full_name text,contact_phone text,preferred_language text,revision bigint)
 language plpgsql security definer set search_path='' as $$
declare s app.application_sessions;p app.application_profiles;changed text[]:=array[]::text[];
begin
 select * into s from app.application_sessions where secret_digest=p_secret_digest and provider_session_id=p_provider_session_id and revoked_at is null for update;
 if not found then raise exception using errcode='42501',message='Invalid application session'; end if;
 select * into p from app.application_profiles where id=s.profile_id and auth_user_id=p_auth_user_id and role='CITIZEN' and access_status='ACTIVE' for update;
 if not found or p.security_epoch<>s.security_epoch or s.absolute_expires_at<=transaction_timestamp()
    or s.last_user_activity_at+(s.idle_timeout_seconds*interval '1 second')<=transaction_timestamp() then
  raise exception using errcode='42501',message='Invalid application session';
 end if;
 if p.revision<>p_expected_revision then raise exception using errcode='40001',message='Stale profile revision'; end if;
 if p.full_name is distinct from btrim(p_full_name) then changed:=array_append(changed,'full_name'); end if;
 if p.contact_phone is distinct from p_contact_phone then changed:=array_append(changed,'contact_phone'); end if;
 if p.preferred_language is distinct from p_language then changed:=array_append(changed,'preferred_language'); end if;
 if cardinality(changed)>0 then
  update app.application_profiles as target set full_name=btrim(p_full_name),contact_phone=p_contact_phone,preferred_language=p_language,
   updated_at=transaction_timestamp(),revision=target.revision+1 where target.id=p.id returning target.* into p;
  insert into app.audit_events(actor_id,actor_type,actor_role,action,resource_type,resource_id,change_summary)
  values(p.id,'USER','CITIZEN','PROFILE_UPDATED','APPLICATION_PROFILE',p.id,jsonb_build_object('fields',to_jsonb(changed)));
 end if;
 return query select p.full_name,p.contact_phone,p.preferred_language,p.revision;
end $$;
alter function app.update_citizen_profile(uuid,uuid,bytea,bigint,text,text,text) owner to app_writer;

create function app.revoke_current_citizen_session(p_auth_user_id uuid,p_provider_session_id uuid,p_secret_digest bytea)
 returns boolean language plpgsql security definer set search_path='' as $$
declare s app.application_sessions;p app.application_profiles;
begin
 select * into s from app.application_sessions where secret_digest=p_secret_digest and provider_session_id=p_provider_session_id for update;
 if not found then return false; end if;
 select * into p from app.application_profiles where id=s.profile_id and auth_user_id=p_auth_user_id;
 if not found then return false; end if;
 if s.revoked_at is null then
  update app.application_sessions set revoked_at=transaction_timestamp(),revocation_reason='LOGOUT' where id=s.id;
  insert into app.audit_events(actor_id,actor_type,actor_role,action,resource_type,resource_id,change_summary)
  values(p.id,'USER','CITIZEN','SESSION_REVOKED','APPLICATION_SESSION',s.id,jsonb_build_object('reason','LOGOUT'));
 end if;
 return true;
end $$;
alter function app.revoke_current_citizen_session(uuid,uuid,bytea) owner to app_writer;

create function app.secure_citizen_sessions(p_auth_user_id uuid,p_reason text,p_keep_provider_session_id uuid,p_current_secret_digest bytea,p_new_secret_digest bytea)
 returns bigint language plpgsql security definer set search_path='' as $$
declare p app.application_profiles;s app.application_sessions;new_epoch bigint;
begin
 if p_reason not in ('PASSWORD_RESET','PASSWORD_CHANGE','EMAIL_CHANGE','ACCOUNT_DISABLED','AUTHORITY_CHANGED','SECURITY_ACTION') then
  raise exception using errcode='23514',message='Invalid security action';
 end if;
 select * into p from app.application_profiles where auth_user_id=p_auth_user_id and role='CITIZEN' for update;
 if not found then raise exception using errcode='42501',message='Citizen account unavailable'; end if;
 if p_keep_provider_session_id is not null then
  select * into s from app.application_sessions where profile_id=p.id and provider_session_id=p_keep_provider_session_id
   and secret_digest=p_current_secret_digest and revoked_at is null for update;
  if not found or p_new_secret_digest is null then raise exception using errcode='42501',message='Current application session required'; end if;
 end if;
 new_epoch:=p.security_epoch+1;
 update app.application_profiles set security_epoch=new_epoch,updated_at=transaction_timestamp(),revision=revision+1 where id=p.id;
 update app.application_sessions set revoked_at=transaction_timestamp(),revocation_reason=p_reason
  where profile_id=p.id and revoked_at is null and (p_keep_provider_session_id is null or provider_session_id<>p_keep_provider_session_id);
 if p_keep_provider_session_id is not null then
  update app.application_sessions set security_epoch=new_epoch,secret_digest=p_new_secret_digest,reauthenticated_at=transaction_timestamp()
   where id=s.id;
 end if;
 insert into app.audit_events(actor_id,actor_type,actor_role,action,resource_type,resource_id,change_summary)
 values(p.id,'USER','CITIZEN','ACCOUNT_SECURITY_CHANGED','APPLICATION_PROFILE',p.id,
  jsonb_build_object('operation',p_reason,'current_session_retained',p_keep_provider_session_id is not null));
 return new_epoch;
end $$;
alter function app.secure_citizen_sessions(uuid,text,uuid,bytea,bytea) owner to app_writer;

revoke all on function app.provision_citizen(uuid,text,text,text,uuid,uuid) from public,anon,authenticated,service_role,app_reader,app_writer;
revoke all on function app.read_provisioning_state(uuid) from public,anon,authenticated,service_role,app_reader,app_writer;
revoke all on function app.create_citizen_session(uuid,uuid,bytea) from public,anon,authenticated,service_role,app_reader,app_writer;
revoke all on function app.resolve_citizen_session(uuid,uuid,bytea,boolean) from public,anon,authenticated,service_role,app_reader,app_writer;
revoke all on function app.update_citizen_profile(uuid,uuid,bytea,bigint,text,text,text) from public,anon,authenticated,service_role,app_reader,app_writer;
revoke all on function app.revoke_current_citizen_session(uuid,uuid,bytea) from public,anon,authenticated,service_role,app_reader,app_writer;
revoke all on function app.secure_citizen_sessions(uuid,text,uuid,bytea,bytea) from public,anon,authenticated,service_role,app_reader,app_writer;
grant execute on function app.provision_citizen(uuid,text,text,text,uuid,uuid),app.read_provisioning_state(uuid),
 app.create_citizen_session(uuid,uuid,bytea),app.resolve_citizen_session(uuid,uuid,bytea,boolean),
 app.update_citizen_profile(uuid,uuid,bytea,bigint,text,text,text),app.revoke_current_citizen_session(uuid,uuid,bytea),
 app.secure_citizen_sessions(uuid,text,uuid,bytea,bytea) to app_web;

revoke create on schema app from app_reader,app_writer;
commit;
