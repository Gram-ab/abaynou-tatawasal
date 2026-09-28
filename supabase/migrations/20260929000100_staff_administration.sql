begin;
grant create on schema app to app_writer;
grant usage on schema auth to app_writer;
grant select,insert,update on app.application_profiles to app_writer;
create policy staff_admin_profile_insert on app.application_profiles for insert to app_writer with check(current_setting('app.staff_admin_actor',true)<>'' and role='AGENT');
create policy staff_admin_profile_update on app.application_profiles for update to app_writer using(current_setting('app.staff_admin_actor',true)<>'') with check(role in ('AGENT','ADMIN'));
create policy staff_admin_session_update on app.application_sessions for update to app_writer using(current_setting('app.staff_admin_actor',true)<>'') with check(current_setting('app.staff_admin_actor',true)<>'');
create policy staff_admin_audit_insert on app.audit_events for insert to app_writer with check(
 actor_id=nullif(current_setting('app.staff_admin_actor',true),'')::uuid and actor_role in ('AGENT','ADMIN') and actor_type='USER'
 and action in ('AUDIT_ACCESSED','STAFF_CREATED','STAFF_UPDATED','ROLE_CHANGED','ACCOUNT_DISABLED','ACCOUNT_ENABLED','ACCOUNT_SECURITY_CHANGED'));

-- DEV-07 keeps application_profiles as the single staff identity model. Every
-- browser command re-resolves the application session and requires ADMIN.
create function app.require_staff_admin(p_auth uuid,p_provider uuid,p_digest bytea)
returns table(profile_id uuid,role text) language plpgsql security definer set search_path='' as $$
declare a record;
begin
 select * into a from app.resolve_application_session(p_auth,p_provider,p_digest,true);
 if a.state is distinct from 'VALID' or a.role is distinct from 'ADMIN' then
  raise exception using errcode='42501',message='Active administrator session required';
 end if;
 return query select a.profile_id,a.role;
end $$;

create function app.list_staff_accounts(p_auth uuid,p_provider uuid,p_digest bytea,p_query text,p_role text,p_status text,p_page integer,p_limit integer)
returns table(profile_id uuid,full_name text,email text,contact_phone text,preferred_language text,role text,access_status text,revision bigint,created_at timestamptz,email_confirmed_at timestamptz,last_sign_in_at timestamptz,total_count bigint)
language plpgsql security definer set search_path='' as $$
begin
 perform * from app.require_staff_admin(p_auth,p_provider,p_digest);
 perform set_config('app.staff_admin_provider_read','on',true);
 if coalesce(p_page,1)<1 or coalesce(p_limit,20) not between 1 and 50 then raise exception using errcode='22023',message='Invalid pagination'; end if;
 if p_role is not null and p_role not in ('AGENT','ADMIN') then raise exception using errcode='22023',message='Invalid role'; end if;
 if p_status is not null and p_status not in ('ACTIVE','DISABLED') then raise exception using errcode='22023',message='Invalid status'; end if;
 return query select ap.id,ap.full_name,u.email::text,ap.contact_phone,ap.preferred_language,ap.role,ap.access_status,ap.revision,ap.created_at,u.email_confirmed_at,u.last_sign_in_at,count(*) over()
 from app.application_profiles ap join auth.users u on u.id=ap.auth_user_id
 where ap.role in ('AGENT','ADMIN') and (p_role is null or ap.role=p_role) and (p_status is null or ap.access_status=p_status)
 and (nullif(btrim(p_query),'') is null or ap.full_name ilike '%'||btrim(p_query)||'%' or u.email ilike '%'||btrim(p_query)||'%')
 order by ap.created_at desc,ap.id desc offset (coalesce(p_page,1)-1)*coalesce(p_limit,20) limit coalesce(p_limit,20);
end $$;

create function app.read_staff_account(p_auth uuid,p_provider uuid,p_digest bytea,p_profile uuid)
returns table(profile_id uuid,full_name text,email text,contact_phone text,preferred_language text,role text,access_status text,revision bigint,created_at timestamptz,updated_at timestamptz,email_confirmed_at timestamptz,last_sign_in_at timestamptz)
language plpgsql security definer set search_path='' as $$
declare actor record;
begin
 select * into actor from app.require_staff_admin(p_auth,p_provider,p_digest);
 perform set_config('app.staff_admin_provider_read','on',true);
 perform set_config('app.staff_admin_actor',actor.profile_id::text,true);
 return query select ap.id,ap.full_name,u.email::text,ap.contact_phone,ap.preferred_language,ap.role,ap.access_status,ap.revision,ap.created_at,ap.updated_at,u.email_confirmed_at,u.last_sign_in_at
 from app.application_profiles ap join auth.users u on u.id=ap.auth_user_id where ap.id=p_profile and ap.role in ('AGENT','ADMIN');
 insert into app.audit_events(actor_id,actor_type,actor_role,action,resource_type,resource_id,change_summary)
 values(actor.profile_id,'USER','ADMIN','AUDIT_ACCESSED','APPLICATION_PROFILE',p_profile,jsonb_build_object('scope','STAFF_DETAIL'));
end $$;

create function app.read_staff_audit(p_auth uuid,p_provider uuid,p_digest bytea,p_profile uuid,p_limit integer default 30)
returns table(action text,reason text,change_summary jsonb,occurred_at timestamptz)
language plpgsql security definer set search_path='' as $$
begin
 perform * from app.require_staff_admin(p_auth,p_provider,p_digest);
 return query select a.action,a.reason,a.change_summary,a.occurred_at from app.audit_events a where a.resource_type='APPLICATION_PROFILE' and a.resource_id=p_profile order by a.occurred_at desc,a.id desc limit least(greatest(coalesce(p_limit,30),1),100);
end $$;

create function app.provision_agent_profile(p_auth uuid,p_provider uuid,p_digest bytea,p_target_auth uuid,p_email text,p_name text,p_phone text,p_language text)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor record;target app.application_profiles;provider_email text;
begin
 select * into actor from app.require_staff_admin(p_auth,p_provider,p_digest);
 perform set_config('app.staff_admin_provider_read','on',true);
 perform set_config('app.staff_admin_actor',actor.profile_id::text,true);
 select email into provider_email from auth.users where id=p_target_auth;
 if provider_email is null or lower(provider_email)<>lower(btrim(p_email)) then raise exception using errcode='23514',message='Provider identity mismatch'; end if;
 if length(btrim(p_name)) not between 2 and 160 or p_language not in ('ar','fr','en') then raise exception using errcode='23514',message='Invalid staff profile'; end if;
 select * into target from app.application_profiles where auth_user_id=p_target_auth for update;
 if found then
  if target.role='AGENT' and target.full_name=btrim(p_name) and target.contact_phone is not distinct from nullif(btrim(p_phone),'') and target.preferred_language=p_language then return target.id; end if;
  raise exception using errcode='23505',message='Conflicting staff identity';
 end if;
 insert into app.application_profiles(auth_user_id,full_name,contact_phone,preferred_language,role,access_status)
 values(p_target_auth,btrim(p_name),nullif(btrim(p_phone),''),p_language,'AGENT','ACTIVE') returning * into target;
 insert into app.audit_events(actor_id,actor_type,actor_role,action,resource_type,resource_id,change_summary)
 values(actor.profile_id,'USER','ADMIN','STAFF_CREATED','APPLICATION_PROFILE',target.id,jsonb_build_object('role','AGENT'));
 return target.id;
end $$;

create function app.update_agent_profile(p_auth uuid,p_provider uuid,p_digest bytea,p_profile uuid,p_revision bigint,p_name text,p_phone text,p_language text)
returns bigint language plpgsql security definer set search_path='' as $$
declare actor record;target app.application_profiles;
begin
 select * into actor from app.require_staff_admin(p_auth,p_provider,p_digest);
 perform set_config('app.staff_admin_provider_read','on',true);
 perform set_config('app.staff_admin_actor',actor.profile_id::text,true);
 select * into target from app.application_profiles where id=p_profile for update;
 if not found or target.role<>'AGENT' then raise exception using errcode='42501',message='Agent account required'; end if;
 if target.revision<>p_revision then raise exception using errcode='40001',message='Stale staff profile'; end if;
 if length(btrim(p_name)) not between 2 and 160 or p_language not in ('ar','fr','en') then raise exception using errcode='23514',message='Invalid staff profile'; end if;
 update app.application_profiles set full_name=btrim(p_name),contact_phone=nullif(btrim(p_phone),''),preferred_language=p_language,revision=revision+1,updated_at=transaction_timestamp() where id=p_profile returning * into target;
 insert into app.audit_events(actor_id,actor_type,actor_role,action,resource_type,resource_id,change_summary) values(actor.profile_id,'USER','ADMIN','STAFF_UPDATED','APPLICATION_PROFILE',target.id,jsonb_build_object('fields',jsonb_build_array('full_name','contact_phone','preferred_language')));
 return target.revision;
end $$;

create function app.set_agent_status(p_auth uuid,p_provider uuid,p_digest bytea,p_profile uuid,p_revision bigint,p_status text,p_reason text)
returns bigint language plpgsql security definer set search_path='' as $$
declare actor record;target app.application_profiles;
begin
 select * into actor from app.require_staff_admin(p_auth,p_provider,p_digest);
 perform set_config('app.staff_admin_actor',actor.profile_id::text,true);
 select * into target from app.application_profiles where id=p_profile for update;
 if not found or target.role<>'AGENT' or p_status not in ('ACTIVE','DISABLED') or length(btrim(p_reason)) not between 3 and 1000 then raise exception using errcode='23514',message='Invalid status command'; end if;
 if target.revision<>p_revision then raise exception using errcode='40001',message='Stale staff profile'; end if;
 if target.access_status<>p_status then
  update app.application_profiles set access_status=p_status,security_epoch=case when p_status='DISABLED' then security_epoch+1 else security_epoch end,revision=revision+1,updated_at=transaction_timestamp() where id=p_profile returning * into target;
  if p_status='DISABLED' then update app.application_sessions set revoked_at=coalesce(revoked_at,transaction_timestamp()),revocation_reason=coalesce(revocation_reason,'ACCOUNT_DISABLED') where profile_id=p_profile and revoked_at is null; end if;
  insert into app.audit_events(actor_id,actor_type,actor_role,action,resource_type,resource_id,reason,change_summary) values(actor.profile_id,'USER','ADMIN',case p_status when 'ACTIVE' then 'ACCOUNT_ENABLED' else 'ACCOUNT_DISABLED' end,'APPLICATION_PROFILE',target.id,btrim(p_reason),jsonb_build_object('status',p_status));
 end if;
 return target.revision;
end $$;

create function app.record_staff_security_action(p_auth uuid,p_provider uuid,p_digest bytea,p_profile uuid,p_action text,p_revision bigint)
returns void language plpgsql security definer set search_path='' as $$
declare actor record;target app.application_profiles;
begin
 select * into actor from app.require_staff_admin(p_auth,p_provider,p_digest);
 perform set_config('app.staff_admin_provider_read','on',true);
 perform set_config('app.staff_admin_actor',actor.profile_id::text,true);
 select * into target from app.application_profiles where id=p_profile for update;
 if not found or target.role not in ('AGENT','ADMIN') or target.revision<>p_revision or p_action not in ('RECOVERY_INITIATED','INVITATION_EMAIL_CORRECTED') then raise exception using errcode='40001',message='Staff account changed'; end if;
 if p_action='RECOVERY_INITIATED' and target.access_status<>'ACTIVE' then raise exception using errcode='42501',message='Disabled account'; end if;
 if p_action='INVITATION_EMAIL_CORRECTED' and (target.role<>'AGENT' or exists(select 1 from auth.users u where u.id=target.auth_user_id and u.last_sign_in_at is not null)) then raise exception using errcode='42501',message='Invitation cannot be corrected'; end if;
 insert into app.audit_events(actor_id,actor_type,actor_role,action,resource_type,resource_id,change_summary) values(actor.profile_id,'USER','ADMIN','ACCOUNT_SECURITY_CHANGED','APPLICATION_PROFILE',target.id,jsonb_build_object('operation',p_action));
end $$;

create function app.complete_staff_email_change(p_auth uuid,p_provider uuid,p_digest bytea)
returns void language plpgsql security definer set search_path='' as $$
declare actor record;
begin
 select * into actor from app.resolve_application_session(p_auth,p_provider,p_digest,false);
 if actor.state is distinct from 'VALID' or actor.role not in ('AGENT','ADMIN') then raise exception using errcode='42501',message='Staff session required'; end if;
 perform set_config('app.staff_admin_actor',actor.profile_id::text,true);
 update app.application_profiles set security_epoch=security_epoch+1,revision=revision+1,updated_at=transaction_timestamp() where id=actor.profile_id;
 update app.application_sessions set revoked_at=coalesce(revoked_at,transaction_timestamp()),revocation_reason=coalesce(revocation_reason,'SECURITY_ACTION') where profile_id=actor.profile_id and revoked_at is null;
 insert into app.audit_events(actor_id,actor_type,actor_role,action,resource_type,resource_id,change_summary) values(actor.profile_id,'USER',actor.role,'ACCOUNT_SECURITY_CHANGED','APPLICATION_PROFILE',actor.profile_id,jsonb_build_object('operation','EMAIL_CHANGE'));
end $$;

grant select(id,email,email_confirmed_at,last_sign_in_at) on auth.users to app_writer;
create policy staff_admin_provider_read on auth.users for select to app_writer using(current_setting('app.staff_admin_provider_read',true)='on');
do $$ declare f text; begin foreach f in array array[
 'require_staff_admin(uuid,uuid,bytea)','list_staff_accounts(uuid,uuid,bytea,text,text,text,integer,integer)','read_staff_account(uuid,uuid,bytea,uuid)','read_staff_audit(uuid,uuid,bytea,uuid,integer)',
 'provision_agent_profile(uuid,uuid,bytea,uuid,text,text,text,text)','update_agent_profile(uuid,uuid,bytea,uuid,bigint,text,text,text)',
 'set_agent_status(uuid,uuid,bytea,uuid,bigint,text,text)','record_staff_security_action(uuid,uuid,bytea,uuid,text,bigint)','complete_staff_email_change(uuid,uuid,bytea)'
 ] loop execute 'alter function app.'||f||' owner to app_writer'; execute 'revoke all on function app.'||f||' from public,anon,authenticated,service_role,app_reader'; execute 'grant execute on function app.'||f||' to app_web'; end loop; end $$;
revoke execute on function app.require_staff_admin(uuid,uuid,bytea) from app_web;
revoke create on schema app from app_writer;
commit;
