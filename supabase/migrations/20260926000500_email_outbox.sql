begin;
do $$ begin
 if not exists(select 1 from pg_roles where rolname='app_mailer') then
  create role app_mailer login nosuperuser nocreatedb nocreaterole noinherit nobypassrls;
 end if;
 if not exists(select 1 from pg_roles where rolname='app_mail_worker') then
  create role app_mail_worker nologin nosuperuser nocreatedb nocreaterole noinherit nobypassrls;
 end if;
end $$;
grant usage on schema app to app_mailer;
grant usage on schema app to app_mail_worker;
grant app_mail_worker to postgres;
grant create on schema app to app_mail_worker;
grant create on schema app to app_writer;
grant select(email) on auth.users to app_writer;

create table app.email_outbox (
 id uuid primary key default gen_random_uuid(),
 recipient_id uuid not null references app.application_profiles(id) on delete restrict,
 complaint_id uuid not null references app.complaints(id) on delete restrict,
 source_event_id uuid not null references app.audit_events(id) on delete restrict,
 event_type text not null check(event_type in ('RECEIPT','RESPONSE','CLOSURE')),
 language text not null check(language in ('ar','fr','en')),
 delivery_status text not null default 'PENDING' check(delivery_status in ('PENDING','SENDING','RETRY','SENT','HELD')),
 attempt_count integer not null default 0 check(attempt_count between 0 and 5),
 next_attempt_at timestamptz default transaction_timestamp(),
 lease_token uuid,
 lease_expires_at timestamptz,
 target_email text check(target_email is null or (length(target_email)<=320 and position('@' in target_email)>1)),
 created_at timestamptz not null default transaction_timestamp(),
 last_attempt_at timestamptz,
 sent_at timestamptz,
 last_error_code text check(last_error_code is null or last_error_code in ('TEMPORARY','PERMANENT','RECIPIENT_CHANGED','RECIPIENT_UNAVAILABLE','ATTEMPTS_EXHAUSTED','DELIVERY_UNCERTAIN')),
 unique(recipient_id,source_event_id,event_type),
 check((delivery_status='SENDING')=(lease_token is not null and lease_expires_at is not null)),
 check((delivery_status='SENT')=(sent_at is not null)),
 check(delivery_status in ('SENDING','SENT','HELD') or next_attempt_at is not null)
);
create index email_outbox_due on app.email_outbox(delivery_status,next_attempt_at,created_at)
 where delivery_status in ('PENDING','RETRY');
create index email_outbox_expired_lease on app.email_outbox(lease_expires_at)
 where delivery_status='SENDING';

alter table app.email_outbox enable row level security;
alter table app.email_outbox force row level security;
revoke all on app.email_outbox from public,anon,authenticated,service_role,app_web,app_reader,app_mailer;
grant select,insert,update on app.email_outbox to app_writer;
create policy outbox_submission on app.email_outbox to app_writer
 using(recipient_id=nullif(current_setting('app.complaint_actor',true),'')::uuid)
 with check(recipient_id=nullif(current_setting('app.complaint_actor',true),'')::uuid);
grant select,update on app.email_outbox to app_mail_worker;
grant select(id,auth_user_id,role,access_status) on app.application_profiles to app_mail_worker;
grant select(id,citizen_id,reference) on app.complaints to app_mail_worker;
create policy outbox_worker on app.email_outbox to app_mail_worker using(true) with check(true);
create policy mail_worker_profile on app.application_profiles for select to app_mail_worker using(role='CITIZEN');
create policy mail_worker_complaint on app.complaints for select to app_mail_worker
 using(citizen_id=nullif(current_setting('app.mail_recipient',true),'')::uuid);
create trigger outbox_no_delete before delete on app.email_outbox for each row execute function app.prevent_history_change();
create trigger outbox_no_truncate before truncate on app.email_outbox for each statement execute function app.prevent_history_change();

create or replace function app.resolve_mail_recipient(p_auth uuid) returns text
language plpgsql security definer set search_path='' as $$
declare verified_email text;
begin
 perform set_config('app.complaint_auth_identity',p_auth::text,true);
 select lower(u.email) into verified_email from auth.users u where u.id=p_auth and u.email_confirmed_at is not null;
 return verified_email;
end $$;
alter function app.resolve_mail_recipient(uuid) owner to app_writer;
revoke all on function app.resolve_mail_recipient(uuid) from public,anon,authenticated,service_role,app_web,app_reader,app_mailer;
grant execute on function app.resolve_mail_recipient(uuid) to app_mail_worker;

create or replace function app.claim_email_outbox(p_limit integer default 20,p_lease_seconds integer default 120)
returns table(id uuid,event_type text,language text,target_email text,reference text,lease_token uuid)
language plpgsql security definer set search_path='' as $$
declare item record;verified_email text;token uuid;bounded integer;auth_identity uuid;profile_role text;profile_access text;complaint_reference text;
begin
 if p_lease_seconds<30 or p_lease_seconds>600 then raise exception using errcode='22023',message='Invalid lease';end if;
 bounded:=least(greatest(coalesce(p_limit,20),1),20);
 for item in
  select o.*
  from app.email_outbox o
  where ((o.delivery_status in ('PENDING','RETRY') and o.next_attempt_at<=transaction_timestamp())
   or (o.delivery_status='SENDING' and o.lease_expires_at<=transaction_timestamp()))
  order by o.created_at,o.id for update of o skip locked limit bounded
 loop
  perform set_config('app.mail_recipient',item.recipient_id::text,true);
  select p.auth_user_id,p.role,p.access_status,c.reference into auth_identity,profile_role,profile_access,complaint_reference
  from app.application_profiles p join app.complaints c on c.id=item.complaint_id and c.citizen_id=p.id where p.id=item.recipient_id;
  if not found then
   update app.email_outbox set delivery_status='HELD',next_attempt_at=null,lease_token=null,lease_expires_at=null,last_error_code='RECIPIENT_UNAVAILABLE' where email_outbox.id=item.id;
   continue;
  end if;
  if item.attempt_count>=5 then
   update app.email_outbox set delivery_status='HELD',next_attempt_at=null,lease_token=null,lease_expires_at=null,last_error_code='ATTEMPTS_EXHAUSTED' where email_outbox.id=item.id;
   continue;
  end if;
  if profile_role<>'CITIZEN' or profile_access<>'ACTIVE' then
   update app.email_outbox set delivery_status='HELD',next_attempt_at=null,lease_token=null,lease_expires_at=null,last_error_code='RECIPIENT_UNAVAILABLE' where email_outbox.id=item.id;
   continue;
  end if;
  verified_email:=app.resolve_mail_recipient(auth_identity);
  if verified_email is null then
   update app.email_outbox set delivery_status='HELD',next_attempt_at=null,lease_token=null,lease_expires_at=null,last_error_code='RECIPIENT_UNAVAILABLE' where email_outbox.id=item.id;
   continue;
  end if;
  if item.target_email is not null and lower(item.target_email)<>verified_email then
   update app.email_outbox set delivery_status='HELD',next_attempt_at=null,lease_token=null,lease_expires_at=null,last_error_code='RECIPIENT_CHANGED' where email_outbox.id=item.id;
   continue;
  end if;
  token:=gen_random_uuid();
  update app.email_outbox set delivery_status='SENDING',attempt_count=attempt_count+1,next_attempt_at=null,
   lease_token=token,lease_expires_at=transaction_timestamp()+make_interval(secs=>p_lease_seconds),
   target_email=verified_email,last_attempt_at=transaction_timestamp(),last_error_code=null
  where email_outbox.id=item.id;
  return query select item.id,item.event_type,item.language,verified_email,complaint_reference,token;
 end loop;
end $$;

create or replace function app.complete_email_outbox(p_id uuid,p_lease uuid)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 update app.email_outbox set delivery_status='SENT',sent_at=transaction_timestamp(),next_attempt_at=null,
  lease_token=null,lease_expires_at=null,last_error_code=null
 where id=p_id and delivery_status='SENDING' and lease_token=p_lease and lease_expires_at>transaction_timestamp();
 return found;
end $$;

create or replace function app.fail_email_outbox(p_id uuid,p_lease uuid,p_retryable boolean,p_uncertain boolean default false)
returns text language plpgsql security definer set search_path='' as $$
declare attempts integer;next_status text;next_time timestamptz;code text;
begin
 select attempt_count into attempts from app.email_outbox
 where id=p_id and delivery_status='SENDING' and lease_token=p_lease and lease_expires_at>transaction_timestamp() for update;
 if not found then return null;end if;
 if p_retryable and attempts<5 then
  next_status:='RETRY';
  next_time:=transaction_timestamp()+case attempts when 1 then interval '1 minute' when 2 then interval '5 minutes' when 3 then interval '30 minutes' else interval '2 hours' end;
  code:=case when p_uncertain then 'DELIVERY_UNCERTAIN' else 'TEMPORARY' end;
 else
  next_status:='HELD';next_time:=null;
  code:=case when attempts>=5 then 'ATTEMPTS_EXHAUSTED' when p_uncertain then 'DELIVERY_UNCERTAIN' else 'PERMANENT' end;
 end if;
 update app.email_outbox set delivery_status=next_status,next_attempt_at=next_time,lease_token=null,lease_expires_at=null,last_error_code=code where id=p_id;
 return next_status;
end $$;

do $$ declare f text;begin
 foreach f in array array['claim_email_outbox(integer,integer)','complete_email_outbox(uuid,uuid)','fail_email_outbox(uuid,uuid,boolean,boolean)'] loop
  execute 'alter function app.'||f||' owner to app_mail_worker';
  execute 'revoke all on function app.'||f||' from public,anon,authenticated,service_role,app_web,app_reader';
  execute 'grant execute on function app.'||f||' to app_mailer';
 end loop;
end $$;
revoke create on schema app from app_mail_worker;
revoke app_mail_worker from postgres;
revoke create on schema app from app_writer;
commit;
