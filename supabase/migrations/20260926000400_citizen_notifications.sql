begin;
grant create on schema app to app_writer;

create table app.notification_state (
 profile_id uuid primary key references app.application_profiles(id) on delete restrict,
 change_revision bigint not null default 0 check(change_revision>=0),
 last_sequence bigint not null default 0 check(last_sequence>=0)
);
create table app.notifications (
 id uuid primary key default gen_random_uuid(),
 recipient_id uuid not null references app.application_profiles(id) on delete restrict,
 source_event_id uuid not null references app.audit_events(id) on delete restrict,
 complaint_id uuid not null references app.complaints(id) on delete restrict,
 type text not null check(type='COMPLAINT_RECEIVED'),
 recipient_sequence bigint not null check(recipient_sequence>0),
 created_at timestamptz not null default transaction_timestamp(),
 read_at timestamptz,
 unique(recipient_id,recipient_sequence),
 unique(recipient_id,source_event_id,type),
 check(read_at is null or read_at>=created_at)
);
create index notification_recipient_newest on app.notifications(recipient_id,recipient_sequence desc);
create index notification_recipient_unread on app.notifications(recipient_id,recipient_sequence) where read_at is null;

alter table app.notification_state enable row level security;
alter table app.notification_state force row level security;
alter table app.notifications enable row level security;
alter table app.notifications force row level security;
revoke all on app.notification_state,app.notifications from public,anon,authenticated,service_role,app_web,app_reader;
grant select,insert,update on app.notification_state to app_writer;
grant select,insert on app.notifications to app_writer;
grant update(read_at) on app.notifications to app_writer;
create policy notification_state_owner on app.notification_state to app_writer
 using(profile_id=nullif(current_setting('app.complaint_actor',true),'')::uuid)
 with check(profile_id=nullif(current_setting('app.complaint_actor',true),'')::uuid);
create policy notification_owner on app.notifications to app_writer
 using(recipient_id=nullif(current_setting('app.complaint_actor',true),'')::uuid)
 with check(recipient_id=nullif(current_setting('app.complaint_actor',true),'')::uuid);

create function app.guard_notification_change() returns trigger language plpgsql set search_path='' as $$
begin
 if OLD.id<>NEW.id or OLD.recipient_id<>NEW.recipient_id or OLD.source_event_id<>NEW.source_event_id
 or OLD.complaint_id<>NEW.complaint_id or OLD.type<>NEW.type or OLD.recipient_sequence<>NEW.recipient_sequence
 or OLD.created_at<>NEW.created_at or OLD.read_at is not null or NEW.read_at is null then
  raise exception 'Notification is immutable' using errcode='55000';
 end if;
 return NEW;
end $$;
create trigger notification_read_only before update on app.notifications for each row execute function app.guard_notification_change();
create trigger notification_no_delete before delete on app.notifications for each row execute function app.prevent_history_change();
create trigger notification_state_no_delete before delete on app.notification_state for each row execute function app.prevent_history_change();
create trigger notification_no_truncate before truncate on app.notifications for each statement execute function app.prevent_history_change();
create trigger notification_state_no_truncate before truncate on app.notification_state for each statement execute function app.prevent_history_change();

create function app.notification_summary(p_auth uuid,p_provider uuid,p_digest bytea)
returns table(change_revision bigint,last_sequence bigint,unread_count bigint)
language plpgsql security definer set search_path='' as $$
declare actor uuid;
begin
 actor:=app.require_complaint_citizen(p_auth,p_provider,p_digest,false);
 return query select coalesce(s.change_revision,0),coalesce(s.last_sequence,0),count(n.id)
 from (select actor profile_id) x
 left join app.notification_state s on s.profile_id=x.profile_id
 left join app.notifications n on n.recipient_id=x.profile_id and n.read_at is null
 group by s.change_revision,s.last_sequence;
end $$;

create function app.list_own_notifications(p_auth uuid,p_provider uuid,p_digest bytea,p_before bigint default null,p_limit integer default 20)
returns table(id uuid,type text,reference text,recipient_sequence bigint,created_at timestamptz,read_at timestamptz)
language plpgsql security definer set search_path='' as $$
declare actor uuid;bounded integer;
begin
 actor:=app.require_complaint_citizen(p_auth,p_provider,p_digest,false);
 bounded:=least(greatest(coalesce(p_limit,20),1),50);
 return query select n.id,n.type,c.reference,n.recipient_sequence,n.created_at,n.read_at
 from app.notifications n join app.complaints c on c.id=n.complaint_id and c.citizen_id=actor
 where n.recipient_id=actor and (p_before is null or n.recipient_sequence<p_before)
 order by n.recipient_sequence desc limit bounded;
end $$;

create function app.open_own_notification(p_auth uuid,p_provider uuid,p_digest bytea,p_notification uuid)
returns table(reference text,changed boolean) language plpgsql security definer set search_path='' as $$
declare actor uuid;s app.notification_state;n app.notifications;did_change boolean:=false;
begin
 actor:=app.require_complaint_citizen(p_auth,p_provider,p_digest,true);
 select * into s from app.notification_state where profile_id=actor for update;
 select target.* into n from app.notifications target join app.complaints c on c.id=target.complaint_id
 where target.id=p_notification and target.recipient_id=actor and c.citizen_id=actor for update of target;
 if not found then return;end if;
 if n.read_at is null then
  update app.notifications set read_at=transaction_timestamp() where id=n.id;
  update app.notification_state set change_revision=change_revision+1 where profile_id=actor;
  did_change:=true;
 end if;
 return query select c.reference,did_change from app.complaints c where c.id=n.complaint_id and c.citizen_id=actor;
end $$;

create function app.mark_all_own_notifications_read(p_auth uuid,p_provider uuid,p_digest bytea)
returns integer language plpgsql security definer set search_path='' as $$
declare actor uuid;s app.notification_state;changed integer:=0;
begin
 actor:=app.require_complaint_citizen(p_auth,p_provider,p_digest,true);
 select * into s from app.notification_state where profile_id=actor for update;
 if not found then return 0;end if;
 update app.notifications set read_at=transaction_timestamp()
 where recipient_id=actor and read_at is null and recipient_sequence<=s.last_sequence;
 get diagnostics changed=row_count;
 if changed>0 then update app.notification_state set change_revision=change_revision+1 where profile_id=actor;end if;
 return changed;
end $$;

do $$ declare f text;begin
 foreach f in array array[
  'notification_summary(uuid,uuid,bytea)',
  'list_own_notifications(uuid,uuid,bytea,bigint,integer)',
  'open_own_notification(uuid,uuid,bytea,uuid)',
  'mark_all_own_notifications_read(uuid,uuid,bytea)'
 ] loop
  execute 'alter function app.'||f||' owner to app_writer';
  execute 'revoke all on function app.'||f||' from public,anon,authenticated,service_role,app_reader';
  execute 'grant execute on function app.'||f||' to app_web';
 end loop;
end $$;
revoke create on schema app from app_writer;
commit;
