begin;
grant create on schema app to app_writer;
grant usage on schema auth,extensions to app_writer;
grant select(id,email_confirmed_at) on auth.users to app_writer;
create policy complaint_verified_identity on auth.users for select to app_writer
 using(id=nullif(current_setting('app.complaint_auth_identity',true),'')::uuid);
grant update(revision) on app.categories,app.locations to app_writer;
-- Row-locking SELECT needs UPDATE visibility; WITH CHECK still forbids mutation.
create policy categories_submission_lock on app.categories for update to app_writer using(is_active) with check(false);
create policy locations_submission_lock on app.locations for update to app_writer using(is_active) with check(false);
create policy complaint_submission_audit on app.audit_events for insert to app_writer with check(
 actor_type='USER' and actor_role='CITIZEN' and action='COMPLAINT_SUBMITTED' and resource_type='COMPLAINT'
 and actor_id=nullif(current_setting('app.complaint_actor',true),'')::uuid and change_summary is null and reason is null);

create function app.require_complaint_citizen(p_auth uuid,p_provider uuid,p_digest bytea,p_activity boolean)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor record;
begin
 perform set_config('app.complaint_actor','',true);
 select * into actor from app.resolve_citizen_session(p_auth,p_provider,p_digest,p_activity);
 if actor.state is distinct from 'VALID' then raise exception using errcode='42501',message='Citizen session required';end if;
 perform set_config('app.complaint_auth_identity',p_auth::text,true);
 if not exists(select 1 from auth.users where id=p_auth and email_confirmed_at is not null) then
 raise exception using errcode='42501',message='Verified Citizen required';end if;
 perform set_config('app.complaint_actor',actor.profile_id::text,true);
 return actor.profile_id;
end $$;
alter function app.require_complaint_citizen(uuid,uuid,bytea,boolean) owner to app_writer;
revoke all on function app.require_complaint_citizen(uuid,uuid,bytea,boolean) from public,anon,authenticated,service_role,app_web,app_reader;

create function app.new_complaint_reference() returns text language plpgsql volatile set search_path='' as $$
declare alphabet constant text:='23456789ABCDEFGHJKLMNPQRSTUVWXYZ';result text:='AB';bytes bytea;n integer;i integer:=0;
begin
 while i<12 loop
 bytes:=extensions.gen_random_bytes(1);n:=get_byte(bytes,0);
 -- The approved alphabet has 32 characters; each byte maps uniformly.
 if i%4=0 then result:=result||'-';end if;
 result:=result||substr(alphabet,(n%32)+1,1);i:=i+1;
 end loop;
 return result;
end $$;
grant execute on function app.new_complaint_reference() to app_writer;
revoke all on function app.new_complaint_reference() from public,anon,authenticated,service_role,app_web,app_reader;

create function app.submit_complaint(p_auth uuid,p_provider uuid,p_digest bytea,p_key uuid,p_fingerprint bytea,
 p_category uuid,p_location uuid,p_subject text,p_description text,p_clarification text,p_confirmed boolean)
returns table(reference text,replayed boolean) language plpgsql security definer set search_path='' as $$
declare actor uuid;r app.command_receipts;c app.complaints;category_labels jsonb;location_labels jsonb;
 audit_id uuid:=gen_random_uuid();complaint_id uuid:=gen_random_uuid();candidate text;attempt integer;created boolean:=false;
begin
 actor:=app.require_complaint_citizen(p_auth,p_provider,p_digest,true);
 if p_key is null or p_fingerprint is null or octet_length(p_fingerprint)<>32 or p_confirmed is distinct from true then
 raise exception using errcode='23514',message='Invalid submission';end if;
 -- The profile lock serializes this actor's commands, including receipts and session revocation.
 select * into r from app.command_receipts where actor_id=actor and idempotency_key=p_key;
 if found then
 if r.command_type<>'COMPLAINT_SUBMIT' or r.request_fingerprint<>p_fingerprint then raise exception using errcode='P0409',message='Command conflict';end if;
 return query select x.reference,true from app.complaints x where x.id=r.result_resource_id and x.citizen_id=actor;return;
 end if;
 -- Shared, short technical burst protection, not a lifetime complaint quota. Replays remain available.
 if (select count(*) from app.command_receipts where actor_id=actor and completed_at>transaction_timestamp()-interval '1 minute')>=10 then
 raise exception using errcode='P0429',message='Submission rate limited';end if;
 perform 1 from app.categories where id=p_category and is_active for share;
 if not found then raise exception using errcode='P0401',message='Category unavailable';end if;
 perform 1 from app.locations where id=p_location and is_active for share;
 if not found then raise exception using errcode='P0402',message='Location unavailable';end if;
 select jsonb_object_agg(language,label) into category_labels from app.category_translations where category_id=p_category;
 select jsonb_object_agg(language,label) into location_labels from app.location_translations where location_id=p_location;
 if category_labels is null or not(category_labels ?& array['ar','fr','en']) then raise exception using errcode='P0401',message='Category unavailable';end if;
 if location_labels is null or not(location_labels ? 'ar') then raise exception using errcode='P0402',message='Location unavailable';end if;
 if app.complaint_effective_text(p_clarification)='' then p_clarification:=null;end if;
 for attempt in 1..10 loop
 candidate:=app.new_complaint_reference();
 insert into app.complaints(id,reference,citizen_id,category_id,category_labels_snapshot,location_id,location_labels_snapshot,subject,description,location_clarification,status)
 values(complaint_id,candidate,actor,p_category,category_labels,p_location,location_labels,p_subject,p_description,p_clarification,'SUBMITTED')
 on conflict on constraint complaints_reference_key do nothing returning * into c;
 if found then created:=true;exit;end if;
 end loop;
 if not created then raise exception using errcode='40001',message='Reference allocation retry required';end if;
 insert into app.audit_events(id,actor_id,actor_type,actor_role,action,resource_type,resource_id)
 values(audit_id,actor,'USER','CITIZEN','COMPLAINT_SUBMITTED','COMPLAINT',complaint_id);
 insert into app.complaint_events(audit_event_id,complaint_id,complaint_revision,event_type,previous_status,new_status)
 values(audit_id,complaint_id,1,'SUBMITTED',null,'SUBMITTED');
 insert into app.command_receipts(actor_id,idempotency_key,command_type,request_fingerprint,result_resource_type,result_resource_id,result_revision,source_event_id)
 values(actor,p_key,'COMPLAINT_SUBMIT',p_fingerprint,'COMPLAINT',complaint_id,1,audit_id);
 return query select c.reference,false;
end $$;

create function app.read_own_complaint(p_auth uuid,p_provider uuid,p_digest bytea,p_reference text)
returns table(reference text,category_labels jsonb,location_labels jsonb,subject text,description text,location_clarification text,status text,submitted_at timestamptz)
language plpgsql security definer set search_path='' as $$
declare actor uuid;
begin
 actor:=app.require_complaint_citizen(p_auth,p_provider,p_digest,false);
 return query select c.reference,c.category_labels_snapshot,c.location_labels_snapshot,c.subject,c.description,c.location_clarification,c.status,c.submitted_at
 from app.complaints c where c.reference=p_reference and c.citizen_id=actor;
end $$;
create function app.recover_complaint_command(p_auth uuid,p_provider uuid,p_digest bytea,p_key uuid)
returns table(reference text) language plpgsql security definer set search_path='' as $$
declare actor uuid;
begin
 actor:=app.require_complaint_citizen(p_auth,p_provider,p_digest,false);
 return query select c.reference from app.command_receipts r join app.complaints c on c.id=r.result_resource_id
 where r.actor_id=actor and r.idempotency_key=p_key and r.command_type='COMPLAINT_SUBMIT' and c.citizen_id=actor;
end $$;
do $$ declare f text;begin
 foreach f in array array['submit_complaint(uuid,uuid,bytea,uuid,bytea,uuid,uuid,text,text,text,boolean)',
 'read_own_complaint(uuid,uuid,bytea,text)','recover_complaint_command(uuid,uuid,bytea,uuid)'] loop
 execute 'alter function app.'||f||' owner to app_writer';
 execute 'revoke all on function app.'||f||' from public,anon,authenticated,service_role,app_reader';
 execute 'grant execute on function app.'||f||' to app_web';
 end loop;
end $$;
revoke create on schema app from app_writer;
commit;
