begin;
create function app.valid_complaint_labels(value jsonb) returns boolean language sql immutable set search_path='' as $$
 select coalesce(jsonb_typeof(value)='object' and value ? 'ar' and value-array['ar','fr','en']='{}'::jsonb
 and not exists(select 1 from jsonb_each(value) e where jsonb_typeof(e.value)<>'string'
 or length(e.value#>>'{}')>200 or length(app.complaint_effective_text(e.value#>>'{}'))=0),false)
$$;
create table app.complaints (
 id uuid primary key default gen_random_uuid(),
 reference text not null unique check(reference ~ '^AB-([23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}-){2}[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$'),
 citizen_id uuid not null references app.application_profiles on delete restrict,
 category_id uuid not null references app.categories on delete restrict,
 category_labels_snapshot jsonb not null check(app.valid_complaint_labels(category_labels_snapshot)),
 location_id uuid not null references app.locations on delete restrict,
 location_labels_snapshot jsonb not null check(app.valid_complaint_labels(location_labels_snapshot)),
 subject text not null check(length(subject)<=150 and length(app.complaint_effective_text(subject))>0),
 description text not null check(length(description)<=2000 and length(app.complaint_effective_text(description))>=20),
 location_clarification text check(length(location_clarification)<=300 and length(app.complaint_effective_text(location_clarification))>0),
 status text not null check(status in ('SUBMITTED','UNDER_REVIEW','IN_PROCESSING','RESPONSE_SENT','CLOSED','WITHDRAWN','NOT_ACCEPTED')),
 not_accepted_reason text check(not_accepted_reason in ('OUT_OF_SCOPE','INSUFFICIENT_INFORMATION')),
 submitted_at timestamptz not null default transaction_timestamp(),updated_at timestamptz not null default transaction_timestamp(),
 status_changed_at timestamptz not null default transaction_timestamp(),closed_at timestamptz,
 revision bigint not null default 1 check(revision>0),
 check((status='NOT_ACCEPTED')=(not_accepted_reason is not null)),check((status='CLOSED')=(closed_at is not null)),
 check(updated_at>=submitted_at and status_changed_at>=submitted_at and (closed_at is null or closed_at>=submitted_at))
);
create index complaint_owner on app.complaints(citizen_id,id);
create index complaint_category on app.complaints(category_id);
create index complaint_location on app.complaints(location_id);
create table app.complaint_events (
 id uuid primary key default gen_random_uuid(),audit_event_id uuid not null unique references app.audit_events on delete restrict,
 complaint_id uuid not null references app.complaints on delete restrict,complaint_revision bigint not null check(complaint_revision>0),
 event_type text not null check(event_type in ('SUBMITTED','EDITED','STATE_CHANGED','RESPONSE_ISSUED','RESPONSE_CORRECTED')),
 previous_status text check(previous_status in ('SUBMITTED','UNDER_REVIEW','IN_PROCESSING','RESPONSE_SENT','CLOSED','WITHDRAWN','NOT_ACCEPTED')),
 new_status text not null check(new_status in ('SUBMITTED','UNDER_REVIEW','IN_PROCESSING','RESPONSE_SENT','CLOSED','WITHDRAWN','NOT_ACCEPTED')),
 edit_delta jsonb check(jsonb_typeof(edit_delta)='object'),unique(complaint_id,complaint_revision),
 check((event_type='SUBMITTED')=(previous_status is null)),check((event_type='EDITED')=(edit_delta is not null))
);
create table app.command_receipts (
 id uuid primary key default gen_random_uuid(),actor_id uuid not null references app.application_profiles on delete restrict,
 idempotency_key uuid not null,command_type text not null check(command_type='COMPLAINT_SUBMIT'),
 request_fingerprint bytea not null check(octet_length(request_fingerprint)=32),
 result_resource_type text not null check(result_resource_type='COMPLAINT'),result_resource_id uuid not null,
 result_revision bigint not null check(result_revision>0),source_event_id uuid not null unique references app.audit_events on delete restrict,
 completed_at timestamptz not null default transaction_timestamp(),unique(actor_id,idempotency_key)
);
create index receipt_resource on app.command_receipts(result_resource_id);
do $$ declare t text; begin
 foreach t in array array['complaints','complaint_events','command_receipts'] loop
 execute format('alter table app.%I enable row level security',t);
 execute format('alter table app.%I force row level security',t);
 execute format('create trigger immutable_dev04a before update or delete on app.%I for each row execute function app.prevent_history_change()',t);
 execute format('create trigger no_truncate before truncate on app.%I for each statement execute function app.prevent_history_change()',t);
 execute format('revoke all on app.%I from public,anon,authenticated,service_role,app_web,app_reader',t);
 execute format('grant select,insert on app.%I to app_writer',t);
 end loop;
end $$;
-- Context is set only after session validation by the granted commands. app_web has no table or role access.
create policy complaint_owner on app.complaints to app_writer using(citizen_id=nullif(current_setting('app.complaint_actor',true),'')::uuid)
 with check(citizen_id=nullif(current_setting('app.complaint_actor',true),'')::uuid);
create policy event_owner on app.complaint_events to app_writer using(exists(select 1 from app.complaints c where c.id=complaint_id))
 with check(exists(select 1 from app.complaints c where c.id=complaint_id));
create policy receipt_owner on app.command_receipts to app_writer using(actor_id=nullif(current_setting('app.complaint_actor',true),'')::uuid)
 with check(actor_id=nullif(current_setting('app.complaint_actor',true),'')::uuid);
grant execute on function app.valid_complaint_labels(jsonb) to app_writer;
grant create on schema app to app_writer;
create function app.verify_initial_complaint() returns trigger language plpgsql security definer set search_path='' as $$
declare c app.complaints;e app.complaint_events;a app.audit_events;r app.command_receipts;target uuid;
begin
 if tg_table_name='complaints' then target:=new.id;
 elsif tg_table_name='complaint_events' then target:=new.complaint_id;
 else target:=new.result_resource_id;end if;
 select * into c from app.complaints where id=target;
 if not found then raise exception using errcode='23514',message='Submission linkage invalid';end if;
 select * into e from app.complaint_events where complaint_id=c.id and complaint_revision=1;
 select * into a from app.audit_events where id=e.audit_event_id;
 select * into r from app.command_receipts where source_event_id=a.id;
 if c.status<>'SUBMITTED' or c.revision<>1 or c.updated_at<>c.submitted_at or c.status_changed_at<>c.submitted_at
 or e.id is null or e.event_type<>'SUBMITTED' or e.previous_status is not null or e.new_status<>'SUBMITTED' or e.edit_delta is not null
 or a.id is null or a.actor_type<>'USER' or a.actor_role<>'CITIZEN' or a.actor_id<>c.citizen_id
 or a.action<>'COMPLAINT_SUBMITTED' or a.resource_type<>'COMPLAINT' or a.resource_id<>c.id or a.occurred_at<>c.submitted_at
 or r.id is null or r.actor_id<>c.citizen_id or r.result_resource_id<>c.id or r.result_revision<>1
 or (select count(*) from app.complaint_events where complaint_id=c.id)<>1 then
 raise exception using errcode='23514',message='Submission evidence incomplete';end if;
 return null;
end $$;
alter function app.verify_initial_complaint() owner to app_writer;
create constraint trigger complaint_complete after insert on app.complaints deferrable initially deferred for each row execute function app.verify_initial_complaint();
create constraint trigger event_complete after insert on app.complaint_events deferrable initially deferred for each row execute function app.verify_initial_complaint();
create constraint trigger receipt_complete after insert on app.command_receipts deferrable initially deferred for each row execute function app.verify_initial_complaint();
revoke all on function app.verify_initial_complaint() from public,anon,authenticated,service_role,app_web;
revoke create on schema app from app_writer;
commit;
