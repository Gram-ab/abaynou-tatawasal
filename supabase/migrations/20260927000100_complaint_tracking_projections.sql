begin;
grant create on schema app to app_writer;

create index complaint_owner_newest on app.complaints(citizen_id,submitted_at desc,id desc);
create index complaint_shared_newest on app.complaints(submitted_at desc,id desc);
create index complaint_status_newest on app.complaints(status,submitted_at desc,id desc);
create index complaint_location_newest on app.complaints(location_id,submitted_at desc,id desc);

drop function app.read_own_complaint(uuid,uuid,bytea,text);
create function app.read_own_complaint(p_auth uuid,p_provider uuid,p_digest bytea,p_reference text)
returns table(reference text,category_id uuid,category_labels jsonb,location_id uuid,location_labels jsonb,subject text,description text,
 location_clarification text,status text,submitted_at timestamptz,updated_at timestamptz,status_changed_at timestamptz,revision bigint)
language plpgsql security definer set search_path='' as $$
declare actor uuid;
begin
 actor:=app.require_complaint_citizen(p_auth,p_provider,p_digest,false);
 return query select c.reference,c.category_id,c.category_labels_snapshot,c.location_id,c.location_labels_snapshot,c.subject,c.description,
 c.location_clarification,c.status,c.submitted_at,c.updated_at,c.status_changed_at,c.revision
 from app.complaints c where c.reference=p_reference and c.citizen_id=actor;
end $$;

create function app.list_own_complaints(p_auth uuid,p_provider uuid,p_digest bytea,p_search text default null,p_status text default null,
 p_before_time timestamptz default null,p_before_reference text default null,p_limit integer default 20)
returns table(reference text,category_labels jsonb,location_labels jsonb,subject text,status text,submitted_at timestamptz,updated_at timestamptz,revision bigint)
language plpgsql security definer set search_path='' as $$
declare actor uuid;bounded integer;query_text text;
begin
 actor:=app.require_complaint_citizen(p_auth,p_provider,p_digest,false);bounded:=least(greatest(coalesce(p_limit,20),1),50);query_text:=nullif(btrim(p_search),'');
 if p_status is not null and p_status not in ('SUBMITTED','UNDER_REVIEW','IN_PROCESSING','RESPONSE_SENT','CLOSED','WITHDRAWN','NOT_ACCEPTED') then
  raise exception using errcode='23514',message='Invalid status';end if;
 return query select c.reference,c.category_labels_snapshot,c.location_labels_snapshot,c.subject,c.status,c.submitted_at,c.updated_at,c.revision
 from app.complaints c where c.citizen_id=actor and (p_status is null or c.status=p_status)
 and (query_text is null or c.reference ilike '%'||query_text||'%' or c.subject ilike '%'||query_text||'%')
 and (p_before_time is null or (c.submitted_at,c.reference)<(p_before_time,p_before_reference))
 order by c.submitted_at desc,c.reference desc limit bounded;
end $$;

create function app.read_own_complaint_history(p_auth uuid,p_provider uuid,p_digest bytea,p_reference text,p_limit integer default 50)
returns table(revision bigint,event_type text,previous_status text,new_status text,occurred_at timestamptz)
language plpgsql security definer set search_path='' as $$
declare actor uuid;bounded integer;
begin
 actor:=app.require_complaint_citizen(p_auth,p_provider,p_digest,false);bounded:=least(greatest(coalesce(p_limit,50),1),100);
 return query select e.complaint_revision,e.event_type,e.previous_status,e.new_status,a.occurred_at
 from app.complaint_events e join app.complaints c on c.id=e.complaint_id join app.audit_events a on a.id=e.audit_event_id
 where c.reference=p_reference and c.citizen_id=actor order by e.complaint_revision asc limit bounded;
end $$;

do $$ declare f text;begin foreach f in array array[
 'read_own_complaint(uuid,uuid,bytea,text)',
 'list_own_complaints(uuid,uuid,bytea,text,text,timestamp with time zone,text,integer)',
 'read_own_complaint_history(uuid,uuid,bytea,text,integer)'] loop
 execute 'alter function app.'||f||' owner to app_writer';execute 'revoke all on function app.'||f||' from public,anon,authenticated,service_role,app_reader';execute 'grant execute on function app.'||f||' to app_web';end loop;end $$;
revoke create on schema app from app_writer;
commit;
