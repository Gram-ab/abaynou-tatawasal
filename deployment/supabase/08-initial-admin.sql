-- Offline owner-only initializer. The runner supplies non-secret transaction-local
-- settings. No reusable SQL function, public endpoint, Auth writes or grants.
do $bootstrap$
declare
 identity_id uuid:=nullif(current_setting('bootstrap.auth_id',true),'')::uuid;
 expected_email text:=current_setting('bootstrap.email',true);
 display_name text:=btrim(current_setting('bootstrap.full_name',true));
 language_code text:=current_setting('bootstrap.language',true);
 operation_id uuid:=nullif(current_setting('bootstrap.operation',true),'')::uuid;
 profile_id uuid;
begin
 if current_user<>'postgres' or not (select rolbypassrls from pg_roles where rolname=current_user) then
  raise exception using errcode='42501',message='Controlled project-owner connection required';
 end if;
 if identity_id is null or operation_id is null or expected_email is null
  or display_name is null or length(display_name) not between 1 and 200
  or language_code is null or language_code not in ('ar','fr','en') then
  raise exception using errcode='22023',message='Invalid initial Admin input';
 end if;
 perform pg_advisory_xact_lock(821107);
 if exists(select 1 from app.application_profiles where role='ADMIN') then
  raise exception using errcode='23514',message='Initial Admin already exists; use controlled authority management';
 end if;
 if exists(select 1 from app.application_profiles where auth_user_id=identity_id) then
  raise exception using errcode='23514',message='Existing application identity cannot be converted by bootstrap';
 end if;
 if not exists(select 1 from auth.users u where u.id=identity_id and lower(u.email)=lower(expected_email)
  and u.email_confirmed_at is not null
  and u.raw_app_meta_data->>'hosted_initial_admin_bootstrap'=operation_id::text) then
  raise exception using errcode='42501',message='Matching operator-created Auth identity required';
 end if;
 insert into app.application_profiles(auth_user_id,full_name,preferred_language,role,access_status)
 values(identity_id,display_name,language_code,'ADMIN','ACTIVE') returning id into profile_id;
 insert into app.audit_events(actor_type,action,resource_type,resource_id,reason,change_summary)
 values('SYSTEM','STAFF_CREATED','APPLICATION_PROFILE',profile_id,
  'Initial Administrator provisioned at the project owner request',
  jsonb_build_object('source','HOSTED_INITIAL_ADMIN_BOOTSTRAP','role','ADMIN'));
end $bootstrap$;
