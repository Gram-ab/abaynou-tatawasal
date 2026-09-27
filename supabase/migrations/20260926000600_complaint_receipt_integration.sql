begin;
grant create on schema app to app_writer;

create function app.verify_receipt_notification_link() returns trigger language plpgsql security definer set search_path='' as $$
declare c app.complaints;a app.audit_events;
begin
 select * into c from app.complaints where id=NEW.complaint_id;
 select * into a from app.audit_events where id=NEW.source_event_id;
 if c.id is null or a.id is null or c.citizen_id<>NEW.recipient_id or a.resource_type<>'COMPLAINT'
 or a.resource_id<>c.id or a.action<>'COMPLAINT_SUBMITTED' or a.actor_id<>NEW.recipient_id or NEW.type<>'COMPLAINT_RECEIVED' then
  raise exception using errcode='23514',message='Notification relationship invalid';
 end if;
 return NEW;
end $$;
alter function app.verify_receipt_notification_link() owner to app_writer;
create trigger notification_link_guard before insert on app.notifications for each row execute function app.verify_receipt_notification_link();

create function app.verify_receipt_outbox_link() returns trigger language plpgsql security definer set search_path='' as $$
declare c app.complaints;a app.audit_events;
begin
 select * into c from app.complaints where id=NEW.complaint_id;
 select * into a from app.audit_events where id=NEW.source_event_id;
 if c.id is null or a.id is null or c.citizen_id<>NEW.recipient_id or a.resource_type<>'COMPLAINT'
 or a.resource_id<>c.id or a.action<>'COMPLAINT_SUBMITTED' or a.actor_id<>NEW.recipient_id or NEW.event_type<>'RECEIPT' then
  raise exception using errcode='23514',message='Email relationship invalid';
 end if;
 return NEW;
end $$;
alter function app.verify_receipt_outbox_link() owner to app_writer;
create trigger outbox_link_guard before insert on app.email_outbox for each row execute function app.verify_receipt_outbox_link();

create or replace function app.submit_complaint(p_auth uuid,p_provider uuid,p_digest bytea,p_key uuid,p_fingerprint bytea,
 p_category uuid,p_location uuid,p_subject text,p_description text,p_clarification text,p_confirmed boolean)
returns table(reference text,replayed boolean) language plpgsql security definer set search_path='' as $$
declare actor uuid;r app.command_receipts;c app.complaints;category_labels jsonb;location_labels jsonb;language text;
 audit_id uuid:=gen_random_uuid();complaint_id uuid:=gen_random_uuid();candidate text;attempt integer;created boolean:=false;sequence bigint;
begin
 actor:=app.require_complaint_citizen(p_auth,p_provider,p_digest,true);
 if p_key is null or p_fingerprint is null or octet_length(p_fingerprint)<>32 or p_confirmed is distinct from true then
  raise exception using errcode='23514',message='Invalid submission';end if;
 select * into r from app.command_receipts where actor_id=actor and idempotency_key=p_key;
 if found then
  if r.command_type<>'COMPLAINT_SUBMIT' or r.request_fingerprint<>p_fingerprint then raise exception using errcode='P0409',message='Command conflict';end if;
  return query select x.reference,true from app.complaints x where x.id=r.result_resource_id and x.citizen_id=actor;return;
 end if;
 if (select count(*) from app.command_receipts where actor_id=actor and completed_at>transaction_timestamp()-interval '1 minute')>=10 then
  raise exception using errcode='P0429',message='Submission rate limited';end if;
 select preferred_language into language from app.application_profiles where id=actor and role='CITIZEN' and access_status='ACTIVE' for update;
 if not found then raise exception using errcode='42501',message='Citizen required';end if;
 perform 1 from app.categories where id=p_category and is_active for share;
 if not found then raise exception using errcode='P0401',message='Category unavailable';end if;
 perform 1 from app.locations where id=p_location and is_active for share;
 if not found then raise exception using errcode='P0402',message='Location unavailable';end if;
 select jsonb_object_agg(t.language,t.label) into category_labels from app.category_translations t where t.category_id=p_category;
 select jsonb_object_agg(t.language,t.label) into location_labels from app.location_translations t where t.location_id=p_location;
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
 insert into app.notification_state(profile_id) values(actor) on conflict(profile_id) do nothing;
 update app.notification_state set last_sequence=last_sequence+1,change_revision=change_revision+1 where profile_id=actor returning last_sequence into sequence;
 insert into app.notifications(recipient_id,source_event_id,complaint_id,type,recipient_sequence)
 values(actor,audit_id,complaint_id,'COMPLAINT_RECEIVED',sequence);
 insert into app.email_outbox(recipient_id,complaint_id,source_event_id,event_type,language)
 values(actor,complaint_id,audit_id,'RECEIPT',language);
 insert into app.command_receipts(actor_id,idempotency_key,command_type,request_fingerprint,result_resource_type,result_resource_id,result_revision,source_event_id)
 values(actor,p_key,'COMPLAINT_SUBMIT',p_fingerprint,'COMPLAINT',complaint_id,1,audit_id);
 return query select c.reference,false;
end $$;

create or replace function app.verify_initial_complaint() returns trigger language plpgsql security definer set search_path='' as $$
declare c app.complaints;e app.complaint_events;a app.audit_events;r app.command_receipts;n app.notifications;o app.email_outbox;target uuid;
begin
 if tg_table_name='complaints' then target:=new.id;
 elsif tg_table_name='complaint_events' then target:=new.complaint_id;
 elsif tg_table_name='command_receipts' then target:=new.result_resource_id;
 elsif tg_table_name='notifications' then target:=new.complaint_id;
 else target:=new.complaint_id;end if;
 select * into c from app.complaints where id=target;
 if not found then raise exception using errcode='23514',message='Submission linkage invalid';end if;
 select * into e from app.complaint_events where complaint_id=c.id and complaint_revision=1;
 select * into a from app.audit_events where id=e.audit_event_id;
 select * into r from app.command_receipts where source_event_id=a.id;
 select * into n from app.notifications where recipient_id=c.citizen_id and source_event_id=a.id and type='COMPLAINT_RECEIVED';
 select * into o from app.email_outbox where recipient_id=c.citizen_id and source_event_id=a.id and event_type='RECEIPT';
 if c.status<>'SUBMITTED' or c.revision<>1 or c.updated_at<>c.submitted_at or c.status_changed_at<>c.submitted_at
 or e.id is null or e.event_type<>'SUBMITTED' or e.previous_status is not null or e.new_status<>'SUBMITTED' or e.edit_delta is not null
 or a.id is null or a.actor_type<>'USER' or a.actor_role<>'CITIZEN' or a.actor_id<>c.citizen_id
 or a.action<>'COMPLAINT_SUBMITTED' or a.resource_type<>'COMPLAINT' or a.resource_id<>c.id or a.occurred_at<>c.submitted_at
 or r.id is null or r.actor_id<>c.citizen_id or r.result_resource_id<>c.id or r.result_revision<>1
 or n.id is null or n.complaint_id<>c.id or n.created_at<>c.submitted_at
 or o.id is null or o.complaint_id<>c.id or o.delivery_status<>'PENDING' or o.created_at<>c.submitted_at
 or (select count(*) from app.complaint_events where complaint_id=c.id)<>1 then
  raise exception using errcode='23514',message='Submission evidence incomplete';end if;
 return null;
end $$;
alter function app.verify_initial_complaint() owner to app_writer;
create constraint trigger notification_complete after insert on app.notifications deferrable initially deferred for each row execute function app.verify_initial_complaint();
create constraint trigger outbox_complete after insert on app.email_outbox deferrable initially deferred for each row execute function app.verify_initial_complaint();
revoke all on function app.verify_initial_complaint() from public,anon,authenticated,service_role,app_web,app_reader,app_mailer;
revoke create on schema app from app_writer;
commit;
