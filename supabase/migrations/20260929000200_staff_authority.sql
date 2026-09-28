begin;
grant create on schema app to app_writer;

-- This command is intentionally absent from the web UI. The controlled CLI
-- supplies a freshly authenticated ADMIN application session and a reason.
create function app.manage_staff_authority(p_auth uuid,p_provider uuid,p_digest bytea,p_profile uuid,p_revision bigint,p_command text,p_reason text)
returns table(role text,access_status text,revision bigint,auth_user_id uuid)
language plpgsql security definer set search_path='' as $$
declare actor record;target app.application_profiles;new_role text;new_status text;event text;
begin
 perform pg_advisory_xact_lock(821107);
 select * into actor from app.require_staff_admin(p_auth,p_provider,p_digest);
 perform set_config('app.staff_admin_actor',actor.profile_id::text,true);
 perform 1 from app.application_profiles locked where locked.role='ADMIN' order by locked.id for update;
 select * into target from app.application_profiles where id=p_profile for update;
 if not found or target.role not in ('AGENT','ADMIN') or target.revision<>p_revision then raise exception using errcode='40001',message='Staff account changed'; end if;
 if length(btrim(p_reason)) not between 3 and 1000 or p_command not in ('PROMOTE','DEMOTE','DISABLE_ADMIN','ENABLE_ADMIN') then raise exception using errcode='23514',message='Invalid authority command'; end if;
 if target.id=actor.profile_id and p_command in ('DEMOTE','DISABLE_ADMIN') then raise exception using errcode='42501',message='Self-demotion and self-disable are forbidden'; end if;
 new_role:=target.role;new_status:=target.access_status;
 if p_command='PROMOTE' then if target.role<>'AGENT' then raise exception using errcode='23514',message='Agent required'; end if;new_role:='ADMIN';event:='ROLE_CHANGED';
 elsif p_command='DEMOTE' then if target.role<>'ADMIN' then raise exception using errcode='23514',message='Administrator required';end if;new_role:='AGENT';event:='ROLE_CHANGED';
 elsif p_command='DISABLE_ADMIN' then if target.role<>'ADMIN' then raise exception using errcode='23514',message='Administrator required';end if;new_status:='DISABLED';event:='ACCOUNT_DISABLED';
 else if target.role<>'ADMIN' then raise exception using errcode='23514',message='Administrator required';end if;new_status:='ACTIVE';event:='ACCOUNT_ENABLED';end if;
 if p_command in ('DEMOTE','DISABLE_ADMIN') and (select count(*) from app.application_profiles remaining where remaining.role='ADMIN' and remaining.access_status='ACTIVE' and remaining.id<>target.id)=0 then raise exception using errcode='23514',message='At least one active administrator is required'; end if;
 update app.application_profiles set role=new_role,access_status=new_status,security_epoch=security_epoch+1,revision=app.application_profiles.revision+1,updated_at=transaction_timestamp() where id=target.id returning * into target;
 update app.application_sessions set revoked_at=coalesce(revoked_at,transaction_timestamp()),revocation_reason=coalesce(revocation_reason,'SECURITY_ACTION') where profile_id=target.id and revoked_at is null;
 insert into app.audit_events(actor_id,actor_type,actor_role,action,resource_type,resource_id,reason,change_summary) values(actor.profile_id,'USER','ADMIN',event,'APPLICATION_PROFILE',target.id,btrim(p_reason),jsonb_build_object('command',p_command,'role',new_role,'status',new_status));
 return query select target.role,target.access_status,target.revision,target.auth_user_id;
end $$;
alter function app.manage_staff_authority(uuid,uuid,bytea,uuid,bigint,text,text) owner to app_writer;
revoke all on function app.manage_staff_authority(uuid,uuid,bytea,uuid,bigint,text,text) from public,anon,authenticated,service_role,app_reader;
grant execute on function app.manage_staff_authority(uuid,uuid,bytea,uuid,bigint,text,text) to app_web;
revoke create on schema app from app_writer;
commit;
