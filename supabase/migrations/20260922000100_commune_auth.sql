begin;
grant create on schema app to app_writer;
-- The non-login owner needs execution on the existing helpers for wrapper composition.
grant execute on function app.create_citizen_session(uuid,uuid,bytea),
 app.resolve_citizen_session(uuid,uuid,bytea,boolean),
 app.revoke_current_citizen_session(uuid,uuid,bytea),
 app.secure_citizen_sessions(uuid,text,uuid,bytea,bytea),
 app.update_citizen_profile(uuid,uuid,bytea,bigint,text,text,text) to app_writer;

-- Extend only the explicitly permitted local fixture audit source. No web provisioning grant.
do $$ declare c record; begin
 for c in select conname from pg_constraint where conrelid='app.audit_events'::regclass and contype='c'
 and pg_get_constraintdef(oid) like '%actor_type%' and pg_get_constraintdef(oid) like '%LOCAL_DEVELOPMENT_FIXTURE%'
 loop execute format('alter table app.audit_events drop constraint %I',c.conname); end loop;
 for c in select conname from pg_constraint where conrelid='app.audit_events'::regclass and contype='c'
 and pg_get_constraintdef(oid) like '%actor_type%' and pg_get_constraintdef(oid) like '%PUBLIC_CONTENT_PUBLISHED%'
 loop execute format('alter table app.audit_events drop constraint %I',c.conname); end loop;
end $$;
alter table app.audit_events add constraint audit_system_source check (
 actor_type='USER' or (actor_type='SYSTEM' and change_summary is not null and (
 (action in ('PUBLIC_CONTENT_PUBLISHED','SETTINGS_UPDATED') and change_summary=jsonb_build_object('source','LOCAL_DEVELOPMENT_FIXTURE'))
 or (action='STAFF_CREATED' and resource_type='APPLICATION_PROFILE' and change_summary=jsonb_build_object('source','LOCAL_STAFF_FIXTURE')))));

create function app.read_application_identity(p_auth uuid)
returns table(profile_id uuid,role text,access_status text,preferred_language text)
language sql stable security definer set search_path='' as $$
 select id,role,access_status,preferred_language from app.application_profiles where auth_user_id=p_auth
$$;

create function app.create_application_session(p_auth uuid,p_provider uuid,p_digest bytea,p_audience text)
returns table(session_id uuid,profile_id uuid,full_name text,preferred_language text,absolute_expires_at timestamptz)
language plpgsql security definer set search_path='' as $$
declare p app.application_profiles;s app.application_sessions;staff boolean;
begin
 select * into p from app.application_profiles where auth_user_id=p_auth for update;
 if not found or p.access_status<>'ACTIVE' then return; end if;
 staff:=p.role in ('AGENT','ADMIN');
 if p_audience is null or not ((p_audience='CITIZEN' and p.role='CITIZEN') or (p_audience='COMMUNE' and staff)) then return; end if;
 if not staff and (select count(distinct pg.page_key) from app.legal_acknowledgements a
 join app.public_page_versions v on v.id=a.page_version_id join app.public_pages pg on pg.id=v.page_id
 where a.citizen_id=p.id and pg.page_key in ('TERMS','PRIVACY'))<2 then return; end if;
 insert into app.application_sessions(profile_id,provider_session_id,secret_digest,security_epoch,idle_timeout_seconds,absolute_expires_at)
 values(p.id,p_provider,p_digest,p.security_epoch,case when staff then 3600 else 604800 end,
 transaction_timestamp()+case when staff then interval '8 hours' else interval '30 days' end) returning * into s;
 if staff then
 insert into app.audit_events(actor_id,actor_type,actor_role,action,resource_type,resource_id,change_summary)
 values(p.id,'USER',p.role,'ACCOUNT_SECURITY_CHANGED','APPLICATION_SESSION',s.id,jsonb_build_object('operation','SESSION_ISSUED'));
 end if;
 return query select s.id,p.id,p.full_name,p.preferred_language,s.absolute_expires_at;
end $$;

-- Every command takes the profile lock before session locks. No activity can revive expiry.
create function app.resolve_application_session(p_auth uuid,p_provider uuid,p_digest bytea,p_activity boolean default false)
returns table(state text,session_id uuid,profile_id uuid,full_name text,contact_phone text,preferred_language text,profile_revision bigint,absolute_expires_at timestamptz,role text)
language plpgsql security definer set search_path='' as $$
declare p app.application_profiles;s app.application_sessions;v_state text;
begin
 select * into p from app.application_profiles where auth_user_id=p_auth for update;
 if not found then return; end if;
 select candidate.* into s from app.application_sessions candidate where candidate.profile_id=p.id and candidate.provider_session_id=p_provider and candidate.secret_digest=p_digest for update;
 if not found then return; end if;
 if p.access_status<>'ACTIVE' then v_state:='DISABLED';
 elsif s.revoked_at is not null then v_state:='REVOKED';
 elsif s.security_epoch<>p.security_epoch then v_state:='STALE';
 elsif (p.role='CITIZEN' and s.idle_timeout_seconds<>604800) or (p.role in ('AGENT','ADMIN') and s.idle_timeout_seconds<>3600) then v_state:='STALE';
 elsif s.absolute_expires_at<=transaction_timestamp() or s.last_user_activity_at+s.idle_timeout_seconds*interval '1 second'<=transaction_timestamp() then v_state:='EXPIRED';
 elsif p.role='CITIZEN' and (select count(distinct pg.page_key) from app.legal_acknowledgements a
 join app.public_page_versions v on v.id=a.page_version_id join app.public_pages pg on pg.id=v.page_id
 where a.citizen_id=p.id and pg.page_key in ('TERMS','PRIVACY'))<2 then v_state:='INCOMPLETE';
 else v_state:='VALID'; end if;
 if v_state<>'VALID' and s.revoked_at is null then
 update app.application_sessions set revoked_at=transaction_timestamp(),revocation_reason=case v_state when 'DISABLED' then 'ACCOUNT_DISABLED' when 'EXPIRED' then 'EXPIRED' else 'SECURITY_ACTION' end where id=s.id;
 elsif v_state='VALID' and p_activity and s.last_user_activity_at<transaction_timestamp()-(case when p.role='CITIZEN' then interval '5 minutes' else interval '1 minute' end) then
 update app.application_sessions set last_user_activity_at=transaction_timestamp() where id=s.id;
 end if;
 return query select v_state,s.id,p.id,p.full_name,p.contact_phone,p.preferred_language,p.revision,s.absolute_expires_at,p.role;
end $$;

create function app.revoke_application_session(p_auth uuid,p_provider uuid,p_digest bytea)
returns boolean language plpgsql security definer set search_path='' as $$
declare p app.application_profiles;s app.application_sessions;
begin
 select * into p from app.application_profiles where auth_user_id=p_auth for update;
 if not found then return false; end if;
 select candidate.* into s from app.application_sessions candidate where candidate.profile_id=p.id and candidate.provider_session_id=p_provider and candidate.secret_digest=p_digest for update;
 if not found then return false; end if;
 if s.revoked_at is null then
 update app.application_sessions set revoked_at=transaction_timestamp(),revocation_reason='LOGOUT' where id=s.id;
 insert into app.audit_events(actor_id,actor_type,actor_role,action,resource_type,resource_id,change_summary)
 values(p.id,'USER',p.role,'SESSION_REVOKED','APPLICATION_SESSION',s.id,jsonb_build_object('reason','LOGOUT'));
 end if;
 return true;
end $$;

create function app.secure_application_sessions(p_auth uuid,p_reason text,p_keep uuid,p_current bytea,p_new bytea,p_audience text)
returns bigint language plpgsql security definer set search_path='' as $$
declare p app.application_profiles;s app.application_sessions;new_epoch bigint;
begin
 if p_reason is null or p_reason not in ('PASSWORD_RESET','PASSWORD_CHANGE','EMAIL_CHANGE','ACCOUNT_DISABLED','AUTHORITY_CHANGED','SECURITY_ACTION') then raise exception using errcode='23514',message='Invalid security action'; end if;
 select * into p from app.application_profiles where auth_user_id=p_auth for update;
 if not found or p_audience is null or not ((p_audience='CITIZEN' and p.role='CITIZEN') or (p_audience='COMMUNE' and p.role in ('AGENT','ADMIN'))) then raise exception using errcode='42501',message='Account unavailable'; end if;
 if p_audience='COMMUNE' and (p.access_status<>'ACTIVE' or p_reason='EMAIL_CHANGE') then raise exception using errcode='42501',message='Account unavailable'; end if;
 if p_keep is not null then
 select * into s from app.application_sessions where profile_id=p.id and provider_session_id=p_keep and secret_digest=p_current for update;
 if not found or p_new is null or s.revoked_at is not null or p.access_status<>'ACTIVE' or s.security_epoch<>p.security_epoch
 or s.absolute_expires_at<=transaction_timestamp() or s.last_user_activity_at+s.idle_timeout_seconds*interval '1 second'<=transaction_timestamp()
 then raise exception using errcode='42501',message='Valid current session required'; end if;
 end if;
 new_epoch:=p.security_epoch+1;
 update app.application_profiles set security_epoch=new_epoch,updated_at=transaction_timestamp(),revision=revision+1 where id=p.id;
 update app.application_sessions set revoked_at=transaction_timestamp(),revocation_reason=p_reason where profile_id=p.id and revoked_at is null and (p_keep is null or provider_session_id<>p_keep);
 if p_keep is not null then
 update app.application_sessions set security_epoch=new_epoch,secret_digest=p_new,reauthenticated_at=transaction_timestamp() where id=s.id;
 end if;
 insert into app.audit_events(actor_id,actor_type,actor_role,action,resource_type,resource_id,change_summary)
 values(p.id,'USER',p.role,'ACCOUNT_SECURITY_CHANGED','APPLICATION_PROFILE',p.id,jsonb_build_object('operation',p_reason,'current_session_retained',p_keep is not null));
 return new_epoch;
end $$;

create function app.update_staff_language(p_auth uuid,p_provider uuid,p_digest bytea,p_revision bigint,p_language text)
returns void language plpgsql security definer set search_path='' as $$
declare actor record;
begin
 select * into actor from app.resolve_application_session(p_auth,p_provider,p_digest,true);
 if actor.state is distinct from 'VALID' or actor.role not in ('AGENT','ADMIN') then raise exception using errcode='42501',message='Staff session required'; end if;
 if actor.profile_revision<>p_revision then raise exception using errcode='40001',message='Stale profile revision'; end if;
 if p_language not in ('ar','fr','en') or p_language is null then raise exception using errcode='23514',message='Invalid language'; end if;
 if actor.preferred_language<>p_language then
 update app.application_profiles set preferred_language=p_language,revision=revision+1,updated_at=transaction_timestamp() where id=actor.profile_id;
 insert into app.audit_events(actor_id,actor_type,actor_role,action,resource_type,resource_id,change_summary)
 values(actor.profile_id,'USER',actor.role,'PROFILE_UPDATED','APPLICATION_PROFILE',actor.profile_id,jsonb_build_object('fields',jsonb_build_array('preferred_language')));
 end if;
end $$;

-- Preserve existing Citizen contracts, with an explicit role check before shared work.
create or replace function app.create_citizen_session(p_auth_user_id uuid,p_provider_session_id uuid,p_secret_digest bytea)
returns table(session_id uuid,profile_id uuid,full_name text,preferred_language text,absolute_expires_at timestamptz)
language sql security definer set search_path='' as $$ select * from app.create_application_session(p_auth_user_id,p_provider_session_id,p_secret_digest,'CITIZEN') $$;
create or replace function app.resolve_citizen_session(p_auth_user_id uuid,p_provider_session_id uuid,p_secret_digest bytea,p_meaningful_activity boolean default false)
returns table(state text,session_id uuid,profile_id uuid,full_name text,contact_phone text,preferred_language text,profile_revision bigint,absolute_expires_at timestamptz)
language plpgsql security definer set search_path='' as $$ begin
 perform 1 from app.application_profiles where auth_user_id=p_auth_user_id and role='CITIZEN' for update;
 if not found then return; end if;
 return query select r.state,r.session_id,r.profile_id,r.full_name,r.contact_phone,r.preferred_language,r.profile_revision,r.absolute_expires_at from app.resolve_application_session(p_auth_user_id,p_provider_session_id,p_secret_digest,p_meaningful_activity) r;
end $$;
create or replace function app.revoke_current_citizen_session(p_auth_user_id uuid,p_provider_session_id uuid,p_secret_digest bytea)
returns boolean language plpgsql security definer set search_path='' as $$ begin
 perform 1 from app.application_profiles where auth_user_id=p_auth_user_id and role='CITIZEN' for update;
 if not found then return false; end if;
 return app.revoke_application_session(p_auth_user_id,p_provider_session_id,p_secret_digest);
end $$;
create or replace function app.secure_citizen_sessions(p_auth_user_id uuid,p_reason text,p_keep_provider_session_id uuid,p_current_secret_digest bytea,p_new_secret_digest bytea)
returns bigint language sql security definer set search_path='' as $$ select app.secure_application_sessions(p_auth_user_id,p_reason,p_keep_provider_session_id,p_current_secret_digest,p_new_secret_digest,'CITIZEN') $$;

-- Profile-first locking also applies to the existing Citizen profile command.
create or replace function app.update_citizen_profile(p_auth_user_id uuid,p_provider_session_id uuid,p_secret_digest bytea,p_expected_revision bigint,p_full_name text,p_contact_phone text,p_language text)
returns table(full_name text,contact_phone text,preferred_language text,revision bigint)
language plpgsql security definer set search_path='' as $$
declare actor record;p app.application_profiles;changed text[]:=array[]::text[];
begin
 select * into actor from app.resolve_citizen_session(p_auth_user_id,p_provider_session_id,p_secret_digest,false);
 if actor.state is distinct from 'VALID' then raise exception using errcode='42501',message='Invalid application session'; end if;
 select * into p from app.application_profiles where id=actor.profile_id;
 if p.revision<>p_expected_revision then raise exception using errcode='40001',message='Stale profile revision'; end if;
 if p.full_name is distinct from btrim(p_full_name) then changed:=array_append(changed,'full_name'); end if;
 if p.contact_phone is distinct from p_contact_phone then changed:=array_append(changed,'contact_phone'); end if;
 if p.preferred_language is distinct from p_language then changed:=array_append(changed,'preferred_language'); end if;
 if cardinality(changed)>0 then
 update app.application_profiles target set full_name=btrim(p_full_name),contact_phone=p_contact_phone,preferred_language=p_language,updated_at=transaction_timestamp(),revision=target.revision+1 where target.id=p.id returning target.* into p;
 insert into app.audit_events(actor_id,actor_type,actor_role,action,resource_type,resource_id,change_summary)
 values(p.id,'USER',p.role,'PROFILE_UPDATED','APPLICATION_PROFILE',p.id,jsonb_build_object('fields',to_jsonb(changed)));
 end if;
 return query select p.full_name,p.contact_phone,p.preferred_language,p.revision;
end $$;

do $$ declare f text; begin
 foreach f in array array['read_application_identity(uuid)','create_application_session(uuid,uuid,bytea,text)',
 'resolve_application_session(uuid,uuid,bytea,boolean)','revoke_application_session(uuid,uuid,bytea)',
 'secure_application_sessions(uuid,text,uuid,bytea,bytea,text)','update_staff_language(uuid,uuid,bytea,bigint,text)'] loop
 execute 'alter function app.'||f||' owner to app_writer';
 execute 'revoke all on function app.'||f||' from public,anon,authenticated,service_role,app_reader';
 execute 'grant execute on function app.'||f||' to app_web';
 end loop;
end $$;
revoke create on schema app from app_writer;
commit;
