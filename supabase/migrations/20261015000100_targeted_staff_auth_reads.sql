begin;
-- Targeted Admin-only projections replace full Auth directory downloads.
-- No table, index, complaint-query or lifecycle changes.
grant create on schema app to app_writer;
grant select(raw_user_meta_data) on auth.users to app_writer;

create function app.find_auth_user_for_staff_admin(p_auth uuid,p_provider uuid,p_digest bytea,p_email text)
returns table(auth_user_id uuid)
language plpgsql security definer set search_path='' as $$
begin
 perform * from app.require_staff_admin(p_auth,p_provider,p_digest);
 perform set_config('app.staff_admin_provider_read','on',true);
 if p_email is null or length(btrim(p_email)) not between 3 and 254 then
  raise exception using errcode='22023',message='Invalid account lookup';
 end if;
 return query select u.id from auth.users u where lower(u.email)=lower(btrim(p_email)) limit 1;
end $$;

create function app.read_staff_activation_states(p_auth uuid,p_provider uuid,p_digest bytea,p_profiles uuid[])
returns table(profile_id uuid,activation_pending boolean)
language plpgsql security definer set search_path='' as $$
begin
 perform * from app.require_staff_admin(p_auth,p_provider,p_digest);
 perform set_config('app.staff_admin_provider_read','on',true);
 if coalesce(cardinality(p_profiles),0)>50 then raise exception using errcode='22023',message='Bounded staff profiles required';end if;
 return query select p.id,coalesce(u.raw_user_meta_data->'staff_activation_pending'='true'::jsonb,false)
 from app.application_profiles p join auth.users u on u.id=p.auth_user_id
 where p.id=any(p_profiles) and p.role in ('AGENT','ADMIN');
end $$;

alter function app.find_auth_user_for_staff_admin(uuid,uuid,bytea,text) owner to app_writer;
alter function app.read_staff_activation_states(uuid,uuid,bytea,uuid[]) owner to app_writer;
revoke all on function app.find_auth_user_for_staff_admin(uuid,uuid,bytea,text),app.read_staff_activation_states(uuid,uuid,bytea,uuid[]) from public,anon,authenticated,service_role,app_reader;
grant execute on function app.find_auth_user_for_staff_admin(uuid,uuid,bytea,text),app.read_staff_activation_states(uuid,uuid,bytea,uuid[]) to app_web;
revoke create on schema app from app_writer;
commit;
