begin;
-- Managed Supabase may grant column SELECT without allowing postgres to delegate
-- auth-schema USAGE. Bind the relation once, then retain the invoking role's
-- existing column privileges and Auth RLS policies on every read (PostgreSQL 17).
create view app.provider_auth_users with (security_invoker=true,security_barrier=true) as
 select id,email,email_confirmed_at,last_sign_in_at,raw_user_meta_data from auth.users;
revoke all on app.provider_auth_users from public,anon,authenticated,service_role,
 app_web,app_reader,app_writer,app_mailer,app_mail_worker;
grant select on app.provider_auth_users to app_writer;
comment on view app.provider_auth_users is 'Internal read-only Auth projection; invoker column grants and RLS apply. No browser/runtime table access.';

-- Keep every existing authorization check, function owner, argument, return
-- contract and execute ACL. Only the internal relation name changes.
do $migration$
declare signature text;target oid;definition text;expected_acl aclitem[];expected_owner oid;temporary_execute boolean;
begin
 foreach signature in array array[
  'app.require_complaint_citizen(uuid,uuid,bytea,boolean)',
  'app.resolve_mail_recipient(uuid)',
  'app.list_staff_accounts(uuid,uuid,bytea,text,text,text,integer,integer)',
  'app.read_staff_account(uuid,uuid,bytea,uuid)',
  'app.provision_agent_profile(uuid,uuid,bytea,uuid,text,text,text,text)',
  'app.record_staff_security_action(uuid,uuid,bytea,uuid,text,bigint)',
  'app.read_staff_complaint(uuid,uuid,bytea,text)',
  'app.find_auth_user_for_staff_admin(uuid,uuid,bytea,text)',
  'app.read_staff_activation_states(uuid,uuid,bytea,uuid[])',
  'app.list_citizen_accounts(uuid,uuid,bytea,text,text,integer)',
  'app.read_citizen_admin_account(uuid,uuid,bytea,uuid)',
  'app.citizen_recovery_allowed(text)'
 ] loop
  target:=to_regprocedure(signature);
  if target is null then raise exception 'Required Auth projection function missing: %',signature;end if;
  select pg_get_functiondef(p.oid),p.proacl,p.proowner into definition,expected_acl,expected_owner
  from pg_proc p where p.oid=target and p.prosecdef and pg_get_userbyid(p.proowner)='app_writer'
   and exists(select 1 from pg_options_to_table(p.proconfig) o where o.option_name='search_path' and o.option_value in ('','""'));
  if definition is null or position('auth.users' in definition)=0 then
   raise exception 'Unexpected Auth projection function contract: %',signature;
  end if;
  -- Non-superuser hosted postgres also needs EXECUTE during function validation.
  -- Some frozen functions revoked it from their owner. Restore the exact ACL
  -- before commit; no application role gains any additional permission.
  temporary_execute:=not has_function_privilege(current_user,target,'EXECUTE');
  if temporary_execute then
   execute format('grant execute on function %s to %I',target::regprocedure,current_user);
  end if;
  execute replace(definition,'auth.users','app.provider_auth_users');
  if temporary_execute then
   execute format('revoke execute on function %s from %I',target::regprocedure,current_user);
  end if;
  if exists(select 1 from pg_proc p where p.oid=target and
    (p.proacl is distinct from expected_acl or p.proowner<>expected_owner or not p.prosecdef)) then
   raise exception 'Auth projection changed function security: %',signature;
  end if;
 end loop;
end $migration$;
commit;
