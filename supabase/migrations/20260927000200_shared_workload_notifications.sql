begin;
grant create on schema app to app_writer;
grant select(email) on auth.users to app_writer;

alter table app.notifications drop constraint notifications_type_check;
alter table app.notifications add constraint notifications_type_check check(type in ('COMPLAINT_RECEIVED','NEW_COMPLAINT','COMPLAINT_WITHDRAWN','COMPLAINT_UNDER_REVIEW'));

create function app.require_complaint_staff(p_auth uuid,p_provider uuid,p_digest bytea,p_activity boolean)
returns uuid language plpgsql security definer set search_path='' as $$
declare actor record;
begin
 perform set_config('app.complaint_actor','',true);perform set_config('app.complaint_staff','',true);
 select * into actor from app.resolve_application_session(p_auth,p_provider,p_digest,p_activity);
 if actor.state is distinct from 'VALID' or actor.role not in ('AGENT','ADMIN') then raise exception using errcode='42501',message='Active staff session required';end if;
 perform set_config('app.complaint_actor',actor.profile_id::text,true);perform set_config('app.complaint_staff','true',true);return actor.profile_id;
end $$;

drop policy complaint_owner on app.complaints;
create policy complaint_authorized on app.complaints to app_writer using(citizen_id=nullif(current_setting('app.complaint_actor',true),'')::uuid or current_setting('app.complaint_staff',true)='true')
 with check(citizen_id=nullif(current_setting('app.complaint_actor',true),'')::uuid or current_setting('app.complaint_staff',true)='true');

create function app.list_staff_complaints(p_auth uuid,p_provider uuid,p_digest bytea,p_search text default null,p_status text default null,p_location uuid default null,
 p_before_time timestamptz default null,p_before_reference text default null,p_limit integer default 20)
returns table(reference text,category_labels jsonb,location_labels jsonb,subject text,status text,submitted_at timestamptz,updated_at timestamptz,revision bigint,citizen_name text)
language plpgsql security definer set search_path='' as $$
declare actor uuid;bounded integer;query_text text;
begin
 actor:=app.require_complaint_staff(p_auth,p_provider,p_digest,false);bounded:=least(greatest(coalesce(p_limit,20),1),50);query_text:=nullif(btrim(p_search),'');
 if p_status is not null and p_status not in ('SUBMITTED','UNDER_REVIEW','IN_PROCESSING','RESPONSE_SENT','CLOSED','WITHDRAWN','NOT_ACCEPTED') then raise exception using errcode='23514',message='Invalid status';end if;
 return query select c.reference,c.category_labels_snapshot,c.location_labels_snapshot,c.subject,c.status,c.submitted_at,c.updated_at,c.revision,p.full_name
 from app.complaints c join app.application_profiles p on p.id=c.citizen_id
 where (p_status is null or c.status=p_status) and (p_location is null or c.location_id=p_location)
 and (query_text is null or c.reference ilike '%'||query_text||'%' or c.subject ilike '%'||query_text||'%' or p.full_name ilike '%'||query_text||'%')
 and (p_before_time is null or (c.submitted_at,c.reference)<(p_before_time,p_before_reference)) order by c.submitted_at desc,c.reference desc limit bounded;
end $$;

create function app.page_staff_complaints(p_auth uuid,p_provider uuid,p_digest bytea,p_search text default null,p_status text default null,p_location uuid default null,
 p_page integer default 1,p_limit integer default 20)
returns table(reference text,category_labels jsonb,location_labels jsonb,subject text,status text,submitted_at timestamptz,updated_at timestamptz,revision bigint,citizen_name text,total_count bigint)
language plpgsql security definer set search_path='' as $$
declare actor uuid;bounded integer;page_number integer;query_text text;
begin
 actor:=app.require_complaint_staff(p_auth,p_provider,p_digest,false);bounded:=least(greatest(coalesce(p_limit,20),1),50);page_number:=least(greatest(coalesce(p_page,1),1),10000);query_text:=nullif(btrim(p_search),'');
 if p_status is not null and p_status not in ('SUBMITTED','UNDER_REVIEW','IN_PROCESSING','RESPONSE_SENT','CLOSED','WITHDRAWN','NOT_ACCEPTED') then raise exception using errcode='23514',message='Invalid status';end if;
 return query select c.reference,c.category_labels_snapshot,c.location_labels_snapshot,c.subject,c.status,c.submitted_at,c.updated_at,c.revision,p.full_name,count(*) over()
 from app.complaints c join app.application_profiles p on p.id=c.citizen_id
 where (p_status is null or c.status=p_status) and (p_location is null or c.location_id=p_location)
 and (query_text is null or c.reference ilike '%'||query_text||'%' or c.subject ilike '%'||query_text||'%' or p.full_name ilike '%'||query_text||'%')
 order by c.submitted_at desc,c.reference desc limit bounded offset (page_number-1)*bounded;
end $$;

create function app.read_staff_complaint(p_auth uuid,p_provider uuid,p_digest bytea,p_reference text)
returns table(reference text,category_id uuid,category_labels jsonb,location_id uuid,location_labels jsonb,subject text,description text,location_clarification text,status text,
 submitted_at timestamptz,updated_at timestamptz,status_changed_at timestamptz,revision bigint,citizen_name text,citizen_email text,citizen_phone text)
language plpgsql security definer set search_path='' as $$
declare actor uuid;
begin actor:=app.require_complaint_staff(p_auth,p_provider,p_digest,false);
 perform set_config('app.complaint_auth_identity',(select p.auth_user_id::text from app.complaints c join app.application_profiles p on p.id=c.citizen_id where c.reference=p_reference),true);
 return query select c.reference,c.category_id,c.category_labels_snapshot,c.location_id,c.location_labels_snapshot,c.subject,c.description,c.location_clarification,c.status,
 c.submitted_at,c.updated_at,c.status_changed_at,c.revision,p.full_name,u.email::text,p.contact_phone
 from app.complaints c join app.application_profiles p on p.id=c.citizen_id join auth.users u on u.id=p.auth_user_id where c.reference=p_reference;
end $$;

create function app.read_staff_complaint_history(p_auth uuid,p_provider uuid,p_digest bytea,p_reference text,p_limit integer default 50)
returns table(revision bigint,event_type text,previous_status text,new_status text,occurred_at timestamptz)
language plpgsql security definer set search_path='' as $$
declare actor uuid;bounded integer;
begin actor:=app.require_complaint_staff(p_auth,p_provider,p_digest,false);bounded:=least(greatest(coalesce(p_limit,50),1),100);
 return query select e.complaint_revision,e.event_type,e.previous_status,e.new_status,a.occurred_at from app.complaint_events e join app.complaints c on c.id=e.complaint_id join app.audit_events a on a.id=e.audit_event_id
 where c.reference=p_reference order by e.complaint_revision asc limit bounded;end $$;

create function app.staff_complaint_counts(p_auth uuid,p_provider uuid,p_digest bytea)
returns table(status text,total bigint) language plpgsql security definer set search_path='' as $$
declare actor uuid;
begin actor:=app.require_complaint_staff(p_auth,p_provider,p_digest,false);return query select c.status,count(*) from app.complaints c group by c.status order by c.status;end $$;

create or replace function app.verify_receipt_notification_link() returns trigger language plpgsql security definer set search_path='' as $$
declare c app.complaints;a app.audit_events;p app.application_profiles;
begin select * into c from app.complaints where id=NEW.complaint_id;select * into a from app.audit_events where id=NEW.source_event_id;select * into p from app.application_profiles where id=NEW.recipient_id;
 if c.id is null or a.id is null or p.id is null or a.resource_type<>'COMPLAINT' or a.resource_id<>c.id then raise exception using errcode='23514',message='Notification relationship invalid';end if;
 if NEW.type='COMPLAINT_RECEIVED' and not(c.citizen_id=NEW.recipient_id and a.action='COMPLAINT_SUBMITTED') then raise exception using errcode='23514',message='Notification relationship invalid';end if;
 if NEW.type='COMPLAINT_UNDER_REVIEW' and not(c.citizen_id=NEW.recipient_id and a.action='REVIEW_STARTED') then raise exception using errcode='23514',message='Notification relationship invalid';end if;
 if NEW.type='NEW_COMPLAINT' and not(p.role in ('AGENT','ADMIN') and p.access_status='ACTIVE' and a.action='COMPLAINT_SUBMITTED') then raise exception using errcode='23514',message='Notification relationship invalid';end if;
 if NEW.type='COMPLAINT_WITHDRAWN' and not(p.role in ('AGENT','ADMIN') and p.access_status='ACTIVE' and a.action='COMPLAINT_WITHDRAWN') then raise exception using errcode='23514',message='Notification relationship invalid';end if;
 return NEW;end $$;

drop trigger notification_complete on app.notifications;

create or replace function app.notification_summary(p_auth uuid,p_provider uuid,p_digest bytea)
returns table(change_revision bigint,last_sequence bigint,unread_count bigint) language plpgsql security definer set search_path='' as $$
declare actor record;
begin select * into actor from app.resolve_application_session(p_auth,p_provider,p_digest,false);if actor.state is distinct from 'VALID' then raise exception using errcode='42501',message='Session required';end if;perform set_config('app.complaint_actor',actor.profile_id::text,true);perform set_config('app.complaint_staff',case when actor.role in ('AGENT','ADMIN') then 'true' else '' end,true);
 return query select coalesce(s.change_revision,0),coalesce(s.last_sequence,0),count(n.id) from (select actor.profile_id profile_id)x left join app.notification_state s on s.profile_id=x.profile_id left join app.notifications n on n.recipient_id=x.profile_id and n.read_at is null group by s.change_revision,s.last_sequence;end $$;

create or replace function app.list_own_notifications(p_auth uuid,p_provider uuid,p_digest bytea,p_before bigint default null,p_limit integer default 20)
returns table(id uuid,type text,reference text,recipient_sequence bigint,created_at timestamptz,read_at timestamptz) language plpgsql security definer set search_path='' as $$
declare actor record;bounded integer;
begin select * into actor from app.resolve_application_session(p_auth,p_provider,p_digest,false);if actor.state is distinct from 'VALID' then raise exception using errcode='42501',message='Session required';end if;perform set_config('app.complaint_actor',actor.profile_id::text,true);perform set_config('app.complaint_staff',case when actor.role in ('AGENT','ADMIN') then 'true' else '' end,true);bounded:=least(greatest(coalesce(p_limit,20),1),50);
 return query select n.id,n.type,c.reference,n.recipient_sequence,n.created_at,n.read_at from app.notifications n join app.complaints c on c.id=n.complaint_id where n.recipient_id=actor.profile_id and (p_before is null or n.recipient_sequence<p_before) order by n.recipient_sequence desc limit bounded;end $$;

create or replace function app.open_own_notification(p_auth uuid,p_provider uuid,p_digest bytea,p_notification uuid)
returns table(reference text,changed boolean) language plpgsql security definer set search_path='' as $$
declare actor record;s app.notification_state;n app.notifications;did_change boolean:=false;
begin select * into actor from app.resolve_application_session(p_auth,p_provider,p_digest,true);if actor.state is distinct from 'VALID' then raise exception using errcode='42501',message='Session required';end if;
 perform set_config('app.complaint_actor',actor.profile_id::text,true);perform set_config('app.complaint_staff',case when actor.role in ('AGENT','ADMIN') then 'true' else '' end,true);select * into s from app.notification_state where profile_id=actor.profile_id for update;select * into n from app.notifications where id=p_notification and recipient_id=actor.profile_id for update;
 if not found then return;end if;if n.read_at is null then update app.notifications set read_at=transaction_timestamp() where id=n.id;update app.notification_state set change_revision=change_revision+1 where profile_id=actor.profile_id;did_change:=true;end if;
 return query select c.reference,did_change from app.complaints c where c.id=n.complaint_id;end $$;

create or replace function app.mark_all_own_notifications_read(p_auth uuid,p_provider uuid,p_digest bytea)
returns integer language plpgsql security definer set search_path='' as $$
declare actor record;s app.notification_state;changed integer:=0;
begin select * into actor from app.resolve_application_session(p_auth,p_provider,p_digest,true);if actor.state is distinct from 'VALID' then raise exception using errcode='42501',message='Session required';end if;perform set_config('app.complaint_actor',actor.profile_id::text,true);
 select * into s from app.notification_state where profile_id=actor.profile_id for update;if not found then return 0;end if;update app.notifications set read_at=transaction_timestamp() where recipient_id=actor.profile_id and read_at is null and recipient_sequence<=s.last_sequence;get diagnostics changed=row_count;if changed>0 then update app.notification_state set change_revision=change_revision+1 where profile_id=actor.profile_id;end if;return changed;end $$;

do $$ declare f text;begin foreach f in array array[
 'require_complaint_staff(uuid,uuid,bytea,boolean)','list_staff_complaints(uuid,uuid,bytea,text,text,uuid,timestamp with time zone,text,integer)',
 'page_staff_complaints(uuid,uuid,bytea,text,text,uuid,integer,integer)',
 'read_staff_complaint(uuid,uuid,bytea,text)','read_staff_complaint_history(uuid,uuid,bytea,text,integer)','staff_complaint_counts(uuid,uuid,bytea)'] loop
 execute 'alter function app.'||f||' owner to app_writer';execute 'revoke all on function app.'||f||' from public,anon,authenticated,service_role,app_reader';if f not like 'require_%' then execute 'grant execute on function app.'||f||' to app_web';end if;end loop;end $$;
revoke create on schema app from app_writer;
commit;
