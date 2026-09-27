begin;
grant create on schema app to app_writer;

alter table app.command_receipts drop constraint command_receipts_command_type_check;
alter table app.command_receipts add constraint command_receipts_command_type_check check(command_type in ('COMPLAINT_SUBMIT','COMPLAINT_EDIT','COMPLAINT_WITHDRAW','COMPLAINT_START_REVIEW'));
drop trigger immutable_dev04a on app.complaints;
drop trigger event_complete on app.complaint_events;
drop trigger receipt_complete on app.command_receipts;
grant update(category_id,category_labels_snapshot,location_id,location_labels_snapshot,subject,description,location_clarification,status,updated_at,status_changed_at,revision) on app.complaints to app_writer;

drop policy complaint_submission_audit on app.audit_events;
create policy complaint_command_audit on app.audit_events for insert to app_writer with check(
 actor_type='USER' and actor_id=nullif(current_setting('app.complaint_actor',true),'')::uuid and resource_type='COMPLAINT'
 and ((actor_role='CITIZEN' and action in ('COMPLAINT_SUBMITTED','COMPLAINT_EDITED','COMPLAINT_WITHDRAWN'))
 or (actor_role in ('AGENT','ADMIN') and action='REVIEW_STARTED')));

create function app.enqueue_complaint_notification(p_recipient uuid,p_event uuid,p_complaint uuid,p_type text)
returns void language plpgsql security definer set search_path='' as $$
declare sequence bigint;original_actor text:=current_setting('app.complaint_actor',true);original_staff text:=current_setting('app.complaint_staff',true);recipient_role text;
begin select role into recipient_role from app.application_profiles where id=p_recipient;perform set_config('app.complaint_actor',p_recipient::text,true);perform set_config('app.complaint_staff',case when recipient_role in ('AGENT','ADMIN') then 'true' else '' end,true);insert into app.notification_state(profile_id) values(p_recipient) on conflict(profile_id) do nothing;
 update app.notification_state set last_sequence=last_sequence+1,change_revision=change_revision+1 where profile_id=p_recipient returning last_sequence into sequence;
 insert into app.notifications(recipient_id,source_event_id,complaint_id,type,recipient_sequence) values(p_recipient,p_event,p_complaint,p_type,sequence) on conflict(recipient_id,source_event_id,type) do nothing;perform set_config('app.complaint_actor',coalesce(original_actor,''),true);perform set_config('app.complaint_staff',coalesce(original_staff,''),true);
end $$;

create function app.fanout_new_complaint() returns trigger language plpgsql security definer set search_path='' as $$
declare recipient uuid;
begin if NEW.event_type='SUBMITTED' then for recipient in select id from app.application_profiles where role in ('AGENT','ADMIN') and access_status='ACTIVE' order by id for share loop perform app.enqueue_complaint_notification(recipient,NEW.audit_event_id,NEW.complaint_id,'NEW_COMPLAINT');end loop;end if;return NEW;end $$;
create trigger dev05_new_complaint_fanout after insert on app.complaint_events for each row execute function app.fanout_new_complaint();

create function app.edit_own_complaint(p_auth uuid,p_provider uuid,p_digest bytea,p_reference text,p_expected bigint,p_key uuid,p_fingerprint bytea,
 p_category uuid,p_location uuid,p_subject text,p_description text,p_clarification text)
returns table(reference text,revision bigint,replayed boolean) language plpgsql security definer set search_path='' as $$
declare actor uuid;c app.complaints;r app.command_receipts;category_labels jsonb;location_labels jsonb;audit_id uuid:=gen_random_uuid();next_revision bigint;
begin actor:=app.require_complaint_citizen(p_auth,p_provider,p_digest,true);
 select * into r from app.command_receipts where actor_id=actor and idempotency_key=p_key;if found then if r.command_type<>'COMPLAINT_EDIT' or r.request_fingerprint<>p_fingerprint then raise exception using errcode='P0409',message='Command conflict';end if;return query select x.reference,r.result_revision,true from app.complaints x where x.id=r.result_resource_id;return;end if;
 select * into c from app.complaints where complaints.reference=p_reference and citizen_id=actor for update;if not found then raise exception using errcode='P0404',message='Complaint unavailable';end if;if c.status<>'SUBMITTED' or c.revision<>p_expected then raise exception using errcode='P0412',message='Complaint changed';end if;
 perform 1 from app.categories where id=p_category and is_active for share;if not found then raise exception using errcode='P0401',message='Category unavailable';end if;perform 1 from app.locations where id=p_location and is_active for share;if not found then raise exception using errcode='P0402',message='Location unavailable';end if;
 select jsonb_object_agg(language,label) into category_labels from app.category_translations where category_id=p_category;select jsonb_object_agg(language,label) into location_labels from app.location_translations where location_id=p_location;
 if app.complaint_effective_text(p_clarification)='' then p_clarification:=null;end if;next_revision:=c.revision+1;
 update app.complaints set category_id=p_category,category_labels_snapshot=category_labels,location_id=p_location,location_labels_snapshot=location_labels,subject=p_subject,description=p_description,location_clarification=p_clarification,revision=next_revision,updated_at=transaction_timestamp() where id=c.id;
 insert into app.audit_events(id,actor_id,actor_type,actor_role,action,resource_type,resource_id,change_summary) values(audit_id,actor,'USER','CITIZEN','COMPLAINT_EDITED','COMPLAINT',c.id,jsonb_build_object('fields',jsonb_build_array('category','subject','description','location','clarification')));
 insert into app.complaint_events(audit_event_id,complaint_id,complaint_revision,event_type,previous_status,new_status,edit_delta) values(audit_id,c.id,next_revision,'EDITED','SUBMITTED','SUBMITTED',jsonb_build_object('category',jsonb_build_object('from',c.category_labels_snapshot,'to',category_labels),'subject',jsonb_build_object('from',c.subject,'to',p_subject),'description',jsonb_build_object('from',c.description,'to',p_description),'location',jsonb_build_object('from',c.location_labels_snapshot,'to',location_labels),'clarification',jsonb_build_object('from',c.location_clarification,'to',p_clarification)));
 insert into app.command_receipts(actor_id,idempotency_key,command_type,request_fingerprint,result_resource_type,result_resource_id,result_revision,source_event_id) values(actor,p_key,'COMPLAINT_EDIT',p_fingerprint,'COMPLAINT',c.id,next_revision,audit_id);
 return query select c.reference,next_revision,false;end $$;

create function app.withdraw_own_complaint(p_auth uuid,p_provider uuid,p_digest bytea,p_reference text,p_expected bigint,p_key uuid,p_fingerprint bytea)
returns table(reference text,revision bigint,replayed boolean) language plpgsql security definer set search_path='' as $$
declare actor uuid;c app.complaints;r app.command_receipts;audit_id uuid:=gen_random_uuid();next_revision bigint;recipient uuid;
begin actor:=app.require_complaint_citizen(p_auth,p_provider,p_digest,true);select * into r from app.command_receipts where actor_id=actor and idempotency_key=p_key;if found then if r.command_type<>'COMPLAINT_WITHDRAW' or r.request_fingerprint<>p_fingerprint then raise exception using errcode='P0409',message='Command conflict';end if;return query select x.reference,r.result_revision,true from app.complaints x where x.id=r.result_resource_id;return;end if;
 select * into c from app.complaints where complaints.reference=p_reference and citizen_id=actor for update;if not found then raise exception using errcode='P0404',message='Complaint unavailable';end if;if c.status<>'SUBMITTED' or c.revision<>p_expected then raise exception using errcode='P0412',message='Complaint changed';end if;next_revision:=c.revision+1;
 update app.complaints set status='WITHDRAWN',revision=next_revision,updated_at=transaction_timestamp(),status_changed_at=transaction_timestamp() where id=c.id;
 insert into app.audit_events(id,actor_id,actor_type,actor_role,action,resource_type,resource_id) values(audit_id,actor,'USER','CITIZEN','COMPLAINT_WITHDRAWN','COMPLAINT',c.id);
 insert into app.complaint_events(audit_event_id,complaint_id,complaint_revision,event_type,previous_status,new_status) values(audit_id,c.id,next_revision,'STATE_CHANGED','SUBMITTED','WITHDRAWN');
 for recipient in select id from app.application_profiles where role in ('AGENT','ADMIN') and access_status='ACTIVE' order by id for share loop perform app.enqueue_complaint_notification(recipient,audit_id,c.id,'COMPLAINT_WITHDRAWN');end loop;
 insert into app.command_receipts(actor_id,idempotency_key,command_type,request_fingerprint,result_resource_type,result_resource_id,result_revision,source_event_id) values(actor,p_key,'COMPLAINT_WITHDRAW',p_fingerprint,'COMPLAINT',c.id,next_revision,audit_id);return query select c.reference,next_revision,false;end $$;

create function app.start_complaint_review(p_auth uuid,p_provider uuid,p_digest bytea,p_reference text,p_expected bigint,p_key uuid,p_fingerprint bytea)
returns table(reference text,revision bigint,replayed boolean) language plpgsql security definer set search_path='' as $$
declare actor uuid;actor_role text;c app.complaints;r app.command_receipts;audit_id uuid:=gen_random_uuid();next_revision bigint;
begin actor:=app.require_complaint_staff(p_auth,p_provider,p_digest,true);select role into actor_role from app.application_profiles where id=actor;
 select * into r from app.command_receipts where actor_id=actor and idempotency_key=p_key;if found then if r.command_type<>'COMPLAINT_START_REVIEW' or r.request_fingerprint<>p_fingerprint then raise exception using errcode='P0409',message='Command conflict';end if;return query select x.reference,r.result_revision,true from app.complaints x where x.id=r.result_resource_id;return;end if;
 select * into c from app.complaints where complaints.reference=p_reference for update;if not found then raise exception using errcode='P0404',message='Complaint unavailable';end if;if c.status<>'SUBMITTED' or c.revision<>p_expected then raise exception using errcode='P0412',message='Complaint changed';end if;next_revision:=c.revision+1;
 update app.complaints set status='UNDER_REVIEW',revision=next_revision,updated_at=transaction_timestamp(),status_changed_at=transaction_timestamp() where id=c.id;
 insert into app.audit_events(id,actor_id,actor_type,actor_role,action,resource_type,resource_id) values(audit_id,actor,'USER',actor_role,'REVIEW_STARTED','COMPLAINT',c.id);
 insert into app.complaint_events(audit_event_id,complaint_id,complaint_revision,event_type,previous_status,new_status) values(audit_id,c.id,next_revision,'STATE_CHANGED','SUBMITTED','UNDER_REVIEW');perform app.enqueue_complaint_notification(c.citizen_id,audit_id,c.id,'COMPLAINT_UNDER_REVIEW');
 insert into app.command_receipts(actor_id,idempotency_key,command_type,request_fingerprint,result_resource_type,result_resource_id,result_revision,source_event_id) values(actor,p_key,'COMPLAINT_START_REVIEW',p_fingerprint,'COMPLAINT',c.id,next_revision,audit_id);return query select c.reference,next_revision,false;end $$;

do $$ declare f text;begin foreach f in array array[
 'edit_own_complaint(uuid,uuid,bytea,text,bigint,uuid,bytea,uuid,uuid,text,text,text)',
 'withdraw_own_complaint(uuid,uuid,bytea,text,bigint,uuid,bytea)',
 'start_complaint_review(uuid,uuid,bytea,text,bigint,uuid,bytea)'] loop execute 'alter function app.'||f||' owner to app_writer';execute 'revoke all on function app.'||f||' from public,anon,authenticated,service_role,app_reader';execute 'grant execute on function app.'||f||' to app_web';end loop;end $$;
alter function app.enqueue_complaint_notification(uuid,uuid,uuid,text) owner to app_writer;alter function app.fanout_new_complaint() owner to app_writer;
revoke all on function app.enqueue_complaint_notification(uuid,uuid,uuid,text),app.fanout_new_complaint() from public,anon,authenticated,service_role,app_web,app_reader;
revoke create on schema app from app_writer;
commit;
