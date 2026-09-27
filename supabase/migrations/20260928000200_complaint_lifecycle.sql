begin;
grant create on schema app to app_writer;

-- Keep the DEV-04B completeness trigger for RECEIPT rows. Later lifecycle rows
-- are validated by the strict relationship guard below and must not be mistaken
-- for a second initial-submission bundle.
create or replace function app.verify_initial_complaint() returns trigger language plpgsql security definer set search_path='' as $$
declare c app.complaints;e app.complaint_events;a app.audit_events;r app.command_receipts;n app.notifications;o app.email_outbox;target uuid;
begin
 if tg_table_name='email_outbox' then
  if new.event_type<>'RECEIPT' then return null;end if;
 end if;
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

alter table app.notifications drop constraint notifications_type_check;
alter table app.notifications add constraint notifications_type_check check(type in (
 'COMPLAINT_RECEIVED','NEW_COMPLAINT','COMPLAINT_WITHDRAWN','COMPLAINT_UNDER_REVIEW','IN_PROCESSING',
 'RESPONSE_AVAILABLE','COMPLAINT_NOT_ACCEPTED','RESPONSE_CORRECTED','COMPLAINT_CLOSED'));
alter table app.command_receipts drop constraint command_receipts_command_type_check;
alter table app.command_receipts add constraint command_receipts_command_type_check check(command_type in (
 'COMPLAINT_SUBMIT','COMPLAINT_EDIT','COMPLAINT_WITHDRAW','COMPLAINT_START_REVIEW','COMPLAINT_START_PROCESSING',
 'COMPLAINT_SEND_RESPONSE','COMPLAINT_NOT_ACCEPT','COMPLAINT_CORRECT_RESPONSE','COMPLAINT_CLOSE'));
grant update(status,not_accepted_reason,closed_at,updated_at,status_changed_at,revision) on app.complaints to app_writer;

drop policy complaint_command_audit on app.audit_events;
create policy complaint_command_audit on app.audit_events for insert to app_writer with check(
 actor_type='USER' and actor_id=nullif(current_setting('app.complaint_actor',true),'')::uuid and resource_type='COMPLAINT'
 and ((actor_role='CITIZEN' and action in ('COMPLAINT_SUBMITTED','COMPLAINT_EDITED','COMPLAINT_WITHDRAWN'))
 or (actor_role in ('AGENT','ADMIN') and action in ('REVIEW_STARTED','PROCESSING_STARTED','RESPONSE_ISSUED','RESPONSE_CORRECTED','COMPLAINT_CLOSED','COMPLAINT_NOT_ACCEPTED'))));

create or replace function app.verify_receipt_notification_link() returns trigger language plpgsql security definer set search_path='' as $$
declare c app.complaints;a app.audit_events;p app.application_profiles;valid boolean:=false;
begin select * into c from app.complaints where id=NEW.complaint_id;select * into a from app.audit_events where id=NEW.source_event_id;select * into p from app.application_profiles where id=NEW.recipient_id;
 if c.id is null or a.id is null or p.id is null or a.resource_type<>'COMPLAINT' or a.resource_id<>c.id then raise exception using errcode='23514',message='Notification relationship invalid';end if;
 valid:=case NEW.type
  when 'COMPLAINT_RECEIVED' then c.citizen_id=NEW.recipient_id and a.action='COMPLAINT_SUBMITTED'
  when 'COMPLAINT_UNDER_REVIEW' then c.citizen_id=NEW.recipient_id and a.action='REVIEW_STARTED'
  when 'IN_PROCESSING' then c.citizen_id=NEW.recipient_id and a.action='PROCESSING_STARTED'
  when 'RESPONSE_AVAILABLE' then c.citizen_id=NEW.recipient_id and a.action='RESPONSE_ISSUED'
  when 'COMPLAINT_NOT_ACCEPTED' then c.citizen_id=NEW.recipient_id and a.action='COMPLAINT_NOT_ACCEPTED'
  when 'RESPONSE_CORRECTED' then c.citizen_id=NEW.recipient_id and a.action='RESPONSE_CORRECTED'
  when 'COMPLAINT_CLOSED' then c.citizen_id=NEW.recipient_id and a.action='COMPLAINT_CLOSED'
  when 'NEW_COMPLAINT' then p.role in ('AGENT','ADMIN') and p.access_status='ACTIVE' and a.action='COMPLAINT_SUBMITTED'
  when 'COMPLAINT_WITHDRAWN' then p.role in ('AGENT','ADMIN') and p.access_status='ACTIVE' and a.action='COMPLAINT_WITHDRAWN'
  else false end;
 if not valid then raise exception using errcode='23514',message='Notification relationship invalid';end if;return NEW;
end $$;

create or replace function app.verify_receipt_outbox_link() returns trigger language plpgsql security definer set search_path='' as $$
declare c app.complaints;a app.audit_events;valid boolean:=false;
begin select * into c from app.complaints where id=NEW.complaint_id;select * into a from app.audit_events where id=NEW.source_event_id;
 if c.id is null or a.id is null or c.citizen_id<>NEW.recipient_id or a.resource_type<>'COMPLAINT' or a.resource_id<>c.id then raise exception using errcode='23514',message='Email relationship invalid';end if;
 valid:=case NEW.event_type when 'RECEIPT' then a.action='COMPLAINT_SUBMITTED' when 'RESPONSE' then a.action in ('RESPONSE_ISSUED','RESPONSE_CORRECTED','COMPLAINT_NOT_ACCEPTED') when 'CLOSURE' then a.action='COMPLAINT_CLOSED' else false end;
 if not valid then raise exception using errcode='23514',message='Email relationship invalid';end if;return NEW;
end $$;

create function app.enqueue_complaint_email(p_recipient uuid,p_event uuid,p_complaint uuid,p_type text,p_language text)
returns void language plpgsql security definer set search_path='' as $$
declare original_actor text:=current_setting('app.complaint_actor',true);original_staff text:=current_setting('app.complaint_staff',true);
begin perform set_config('app.complaint_actor',p_recipient::text,true);perform set_config('app.complaint_staff','',true);
 insert into app.email_outbox(recipient_id,complaint_id,source_event_id,event_type,language) values(p_recipient,p_complaint,p_event,p_type,p_language);
 perform set_config('app.complaint_actor',coalesce(original_actor,''),true);perform set_config('app.complaint_staff',coalesce(original_staff,''),true);
end $$;

create function app.start_complaint_processing(p_auth uuid,p_provider uuid,p_digest bytea,p_reference text,p_expected bigint,p_key uuid,p_fingerprint bytea)
returns table(reference text,revision bigint,replayed boolean) language plpgsql security definer set search_path='' as $$
declare actor uuid;role text;c app.complaints;r app.command_receipts;a uuid:=gen_random_uuid();next bigint;
begin actor:=app.require_complaint_staff(p_auth,p_provider,p_digest,true);select application_profiles.role into role from app.application_profiles where id=actor;
 select * into r from app.command_receipts where actor_id=actor and idempotency_key=p_key;if found then if r.command_type<>'COMPLAINT_START_PROCESSING' or r.request_fingerprint<>p_fingerprint then raise exception using errcode='P0409',message='Command conflict';end if;return query select x.reference,r.result_revision,true from app.complaints x where x.id=r.result_resource_id;return;end if;
 select * into c from app.complaints where complaints.reference=p_reference for update;if not found then raise exception using errcode='P0404',message='Complaint unavailable';end if;if c.status<>'UNDER_REVIEW' or c.revision<>p_expected then raise exception using errcode='P0412',message='Complaint changed';end if;next:=c.revision+1;
 update app.complaints set status='IN_PROCESSING',revision=next,updated_at=transaction_timestamp(),status_changed_at=transaction_timestamp() where id=c.id;
 insert into app.audit_events(id,actor_id,actor_type,actor_role,action,resource_type,resource_id) values(a,actor,'USER',role,'PROCESSING_STARTED','COMPLAINT',c.id);
 insert into app.complaint_events(audit_event_id,complaint_id,complaint_revision,event_type,previous_status,new_status) values(a,c.id,next,'STATE_CHANGED','UNDER_REVIEW','IN_PROCESSING');perform app.enqueue_complaint_notification(c.citizen_id,a,c.id,'IN_PROCESSING');
 insert into app.command_receipts(actor_id,idempotency_key,command_type,request_fingerprint,result_resource_type,result_resource_id,result_revision,source_event_id) values(actor,p_key,'COMPLAINT_START_PROCESSING',p_fingerprint,'COMPLAINT',c.id,next,a);return query select c.reference,next,false;
end $$;

create function app.issue_complaint_response(p_auth uuid,p_provider uuid,p_digest bytea,p_reference text,p_expected bigint,p_key uuid,p_fingerprint bytea,p_body text)
returns table(reference text,revision bigint,replayed boolean) language plpgsql security definer set search_path='' as $$
declare actor uuid;role text;language text;c app.complaints;r app.command_receipts;a uuid:=gen_random_uuid();e uuid:=gen_random_uuid();next bigint;
begin actor:=app.require_complaint_staff(p_auth,p_provider,p_digest,true);select application_profiles.role into role from app.application_profiles where id=actor;
 select * into r from app.command_receipts where actor_id=actor and idempotency_key=p_key;if found then if r.command_type<>'COMPLAINT_SEND_RESPONSE' or r.request_fingerprint<>p_fingerprint then raise exception using errcode='P0409',message='Command conflict';end if;return query select x.reference,r.result_revision,true from app.complaints x where x.id=r.result_resource_id;return;end if;
 select * into c from app.complaints where complaints.reference=p_reference for update;if not found then raise exception using errcode='P0404',message='Complaint unavailable';end if;if c.status<>'IN_PROCESSING' or c.revision<>p_expected then raise exception using errcode='P0412',message='Complaint changed';end if;select preferred_language into language from app.application_profiles where id=c.citizen_id;next:=c.revision+1;
 update app.complaints set status='RESPONSE_SENT',revision=next,updated_at=transaction_timestamp(),status_changed_at=transaction_timestamp() where id=c.id;
 insert into app.audit_events(id,actor_id,actor_type,actor_role,action,resource_type,resource_id) values(a,actor,'USER',role,'RESPONSE_ISSUED','COMPLAINT',c.id);
 insert into app.complaint_events(id,audit_event_id,complaint_id,complaint_revision,event_type,previous_status,new_status) values(e,a,c.id,next,'RESPONSE_ISSUED','IN_PROCESSING','RESPONSE_SENT');
 insert into app.response_versions(complaint_event_id,complaint_id,version_number,response_kind,body) values(e,c.id,1,'NORMAL',p_body);
 perform app.enqueue_complaint_notification(c.citizen_id,a,c.id,'RESPONSE_AVAILABLE');perform app.enqueue_complaint_email(c.citizen_id,a,c.id,'RESPONSE',language);
 insert into app.command_receipts(actor_id,idempotency_key,command_type,request_fingerprint,result_resource_type,result_resource_id,result_revision,source_event_id) values(actor,p_key,'COMPLAINT_SEND_RESPONSE',p_fingerprint,'COMPLAINT',c.id,next,a);return query select c.reference,next,false;
end $$;

create function app.not_accept_complaint(p_auth uuid,p_provider uuid,p_digest bytea,p_reference text,p_expected bigint,p_key uuid,p_fingerprint bytea,p_reason text,p_body text)
returns table(reference text,revision bigint,replayed boolean) language plpgsql security definer set search_path='' as $$
declare actor uuid;role text;language text;c app.complaints;r app.command_receipts;a uuid:=gen_random_uuid();e uuid:=gen_random_uuid();next bigint;
begin actor:=app.require_complaint_staff(p_auth,p_provider,p_digest,true);select application_profiles.role into role from app.application_profiles where id=actor;
 select * into r from app.command_receipts where actor_id=actor and idempotency_key=p_key;if found then if r.command_type<>'COMPLAINT_NOT_ACCEPT' or r.request_fingerprint<>p_fingerprint then raise exception using errcode='P0409',message='Command conflict';end if;return query select x.reference,r.result_revision,true from app.complaints x where x.id=r.result_resource_id;return;end if;
 select * into c from app.complaints where complaints.reference=p_reference for update;if not found then raise exception using errcode='P0404',message='Complaint unavailable';end if;if c.status not in ('UNDER_REVIEW','IN_PROCESSING') or c.revision<>p_expected then raise exception using errcode='P0412',message='Complaint changed';end if;if p_reason not in ('OUT_OF_SCOPE','INSUFFICIENT_INFORMATION') then raise exception using errcode='23514',message='Invalid reason';end if;select preferred_language into language from app.application_profiles where id=c.citizen_id;next:=c.revision+1;
 update app.complaints set status='NOT_ACCEPTED',not_accepted_reason=p_reason,revision=next,updated_at=transaction_timestamp(),status_changed_at=transaction_timestamp() where id=c.id;
 insert into app.audit_events(id,actor_id,actor_type,actor_role,action,resource_type,resource_id,change_summary) values(a,actor,'USER',role,'COMPLAINT_NOT_ACCEPTED','COMPLAINT',c.id,jsonb_build_object('reason',p_reason));
 insert into app.complaint_events(id,audit_event_id,complaint_id,complaint_revision,event_type,previous_status,new_status) values(e,a,c.id,next,'RESPONSE_ISSUED',c.status,'NOT_ACCEPTED');
 insert into app.response_versions(complaint_event_id,complaint_id,version_number,response_kind,body) values(e,c.id,1,'NOT_ACCEPTED',p_body);
 perform app.enqueue_complaint_notification(c.citizen_id,a,c.id,'COMPLAINT_NOT_ACCEPTED');perform app.enqueue_complaint_email(c.citizen_id,a,c.id,'RESPONSE',language);
 insert into app.command_receipts(actor_id,idempotency_key,command_type,request_fingerprint,result_resource_type,result_resource_id,result_revision,source_event_id) values(actor,p_key,'COMPLAINT_NOT_ACCEPT',p_fingerprint,'COMPLAINT',c.id,next,a);return query select c.reference,next,false;
end $$;

create function app.correct_complaint_response(p_auth uuid,p_provider uuid,p_digest bytea,p_reference text,p_expected bigint,p_key uuid,p_fingerprint bytea,p_body text,p_reason text,p_reauthenticated boolean)
returns table(reference text,revision bigint,replayed boolean) language plpgsql security definer set search_path='' as $$
declare actor uuid;role text;language text;c app.complaints;r app.command_receipts;latest app.response_versions;a uuid:=gen_random_uuid();e uuid:=gen_random_uuid();next bigint;version integer;
begin actor:=app.require_complaint_staff(p_auth,p_provider,p_digest,true);if p_reauthenticated is distinct from true then raise exception using errcode='42501',message='Fresh password verification required';end if;select application_profiles.role into role from app.application_profiles where id=actor;
 select * into r from app.command_receipts where actor_id=actor and idempotency_key=p_key;if found then if r.command_type<>'COMPLAINT_CORRECT_RESPONSE' or r.request_fingerprint<>p_fingerprint then raise exception using errcode='P0409',message='Command conflict';end if;return query select x.reference,r.result_revision,true from app.complaints x where x.id=r.result_resource_id;return;end if;
 select * into c from app.complaints where complaints.reference=p_reference for update;if not found then raise exception using errcode='P0404',message='Complaint unavailable';end if;if c.status not in ('RESPONSE_SENT','CLOSED','NOT_ACCEPTED') or c.revision<>p_expected then raise exception using errcode='P0412',message='Complaint changed';end if;
 select * into latest from app.response_versions where complaint_id=c.id order by version_number desc limit 1;if not found then raise exception using errcode='23514',message='Response required';end if;select preferred_language into language from app.application_profiles where id=c.citizen_id;next:=c.revision+1;version:=latest.version_number+1;
 update app.complaints set revision=next,updated_at=transaction_timestamp() where id=c.id;
 insert into app.audit_events(id,actor_id,actor_type,actor_role,action,resource_type,resource_id,reason) values(a,actor,'USER',role,'RESPONSE_CORRECTED','COMPLAINT',c.id,p_reason);
 insert into app.complaint_events(id,audit_event_id,complaint_id,complaint_revision,event_type,previous_status,new_status) values(e,a,c.id,next,'RESPONSE_CORRECTED',c.status,c.status);
 insert into app.response_versions(complaint_event_id,complaint_id,version_number,response_kind,body,correction_reason) values(e,c.id,version,latest.response_kind,p_body,p_reason);
 perform app.enqueue_complaint_notification(c.citizen_id,a,c.id,'RESPONSE_CORRECTED');perform app.enqueue_complaint_email(c.citizen_id,a,c.id,'RESPONSE',language);
 insert into app.command_receipts(actor_id,idempotency_key,command_type,request_fingerprint,result_resource_type,result_resource_id,result_revision,source_event_id) values(actor,p_key,'COMPLAINT_CORRECT_RESPONSE',p_fingerprint,'COMPLAINT',c.id,next,a);return query select c.reference,next,false;
end $$;

create function app.close_complaint(p_auth uuid,p_provider uuid,p_digest bytea,p_reference text,p_expected bigint,p_key uuid,p_fingerprint bytea)
returns table(reference text,revision bigint,replayed boolean) language plpgsql security definer set search_path='' as $$
declare actor uuid;role text;language text;c app.complaints;r app.command_receipts;a uuid:=gen_random_uuid();next bigint;
begin actor:=app.require_complaint_staff(p_auth,p_provider,p_digest,true);select application_profiles.role into role from app.application_profiles where id=actor;
 select * into r from app.command_receipts where actor_id=actor and idempotency_key=p_key;if found then if r.command_type<>'COMPLAINT_CLOSE' or r.request_fingerprint<>p_fingerprint then raise exception using errcode='P0409',message='Command conflict';end if;return query select x.reference,r.result_revision,true from app.complaints x where x.id=r.result_resource_id;return;end if;
 select * into c from app.complaints where complaints.reference=p_reference for update;if not found then raise exception using errcode='P0404',message='Complaint unavailable';end if;if c.status<>'RESPONSE_SENT' or c.revision<>p_expected or not exists(select 1 from app.response_versions where complaint_id=c.id) then raise exception using errcode='P0412',message='Complaint changed';end if;select preferred_language into language from app.application_profiles where id=c.citizen_id;next:=c.revision+1;
 update app.complaints set status='CLOSED',closed_at=transaction_timestamp(),revision=next,updated_at=transaction_timestamp(),status_changed_at=transaction_timestamp() where id=c.id;
 insert into app.audit_events(id,actor_id,actor_type,actor_role,action,resource_type,resource_id) values(a,actor,'USER',role,'COMPLAINT_CLOSED','COMPLAINT',c.id);
 insert into app.complaint_events(audit_event_id,complaint_id,complaint_revision,event_type,previous_status,new_status) values(a,c.id,next,'STATE_CHANGED','RESPONSE_SENT','CLOSED');perform app.enqueue_complaint_notification(c.citizen_id,a,c.id,'COMPLAINT_CLOSED');perform app.enqueue_complaint_email(c.citizen_id,a,c.id,'CLOSURE',language);
 insert into app.command_receipts(actor_id,idempotency_key,command_type,request_fingerprint,result_resource_type,result_resource_id,result_revision,source_event_id) values(actor,p_key,'COMPLAINT_CLOSE',p_fingerprint,'COMPLAINT',c.id,next,a);return query select c.reference,next,false;
end $$;

do $$ declare f text;begin foreach f in array array[
 'start_complaint_processing(uuid,uuid,bytea,text,bigint,uuid,bytea)',
 'issue_complaint_response(uuid,uuid,bytea,text,bigint,uuid,bytea,text)',
 'not_accept_complaint(uuid,uuid,bytea,text,bigint,uuid,bytea,text,text)',
 'correct_complaint_response(uuid,uuid,bytea,text,bigint,uuid,bytea,text,text,boolean)',
 'close_complaint(uuid,uuid,bytea,text,bigint,uuid,bytea)'
] loop execute 'alter function app.'||f||' owner to app_writer';execute 'revoke all on function app.'||f||' from public,anon,authenticated,service_role,app_reader';execute 'grant execute on function app.'||f||' to app_web';end loop;end $$;
alter function app.enqueue_complaint_email(uuid,uuid,uuid,text,text) owner to app_writer;
revoke all on function app.enqueue_complaint_email(uuid,uuid,uuid,text,text) from public,anon,authenticated,service_role,app_web,app_reader;
revoke create on schema app from app_writer;
commit;
