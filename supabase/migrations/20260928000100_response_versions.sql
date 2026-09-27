begin;
grant create on schema app to app_writer;

create table app.response_versions (
 id uuid primary key default gen_random_uuid(),
 complaint_event_id uuid not null unique references app.complaint_events(id) on delete restrict,
 complaint_id uuid not null references app.complaints(id) on delete restrict,
 version_number integer not null check(version_number>0),
 response_kind text not null check(response_kind in ('NORMAL','NOT_ACCEPTED')),
 body text not null check(length(body)<=2000 and length(app.complaint_effective_text(body))>0),
 correction_reason text check(length(correction_reason)<=500 and length(app.complaint_effective_text(correction_reason))>0),
 created_at timestamptz not null default transaction_timestamp(),
 unique(complaint_id,version_number),
 check((version_number=1 and correction_reason is null) or (version_number>1 and correction_reason is not null))
);
create index response_versions_complaint on app.response_versions(complaint_id,version_number desc);
alter table app.response_versions enable row level security;
alter table app.response_versions force row level security;
revoke all on app.response_versions from public,anon,authenticated,service_role,app_web,app_reader;
grant select,insert on app.response_versions to app_writer;
create policy response_authorized on app.response_versions to app_writer
 using(exists(select 1 from app.complaints c where c.id=complaint_id))
 with check(exists(select 1 from app.complaints c where c.id=complaint_id));
create trigger response_immutable before update or delete on app.response_versions for each row execute function app.prevent_history_change();
create trigger response_no_truncate before truncate on app.response_versions for each statement execute function app.prevent_history_change();

create function app.verify_response_version() returns trigger language plpgsql security definer set search_path='' as $$
declare e app.complaint_events;expected_count integer;first_kind text;
begin
 select * into e from app.complaint_events where id=NEW.complaint_event_id;
 select count(*),min(response_kind) into expected_count,first_kind from app.response_versions where complaint_id=NEW.complaint_id;
 if e.id is null or e.complaint_id<>NEW.complaint_id
 or (NEW.version_number=1 and e.event_type<>'RESPONSE_ISSUED')
 or (NEW.version_number>1 and e.event_type<>'RESPONSE_CORRECTED')
 or expected_count<>NEW.version_number
 or (NEW.version_number>1 and first_kind<>NEW.response_kind) then
  raise exception using errcode='23514',message='Response version relationship invalid';
 end if;
 return null;
end $$;
alter function app.verify_response_version() owner to app_writer;
create constraint trigger response_version_complete after insert on app.response_versions deferrable initially deferred for each row execute function app.verify_response_version();
revoke all on function app.verify_response_version() from public,anon,authenticated,service_role,app_web,app_reader;

create function app.read_own_response_versions(p_auth uuid,p_provider uuid,p_digest bytea,p_reference text)
returns table(version_number integer,response_kind text,body text,correction_reason text,created_at timestamptz)
language plpgsql security definer set search_path='' as $$
declare actor uuid;
begin actor:=app.require_complaint_citizen(p_auth,p_provider,p_digest,false);
 return query select r.version_number,r.response_kind,r.body,r.correction_reason,r.created_at
 from app.response_versions r join app.complaints c on c.id=r.complaint_id
 where c.reference=p_reference and c.citizen_id=actor order by r.version_number desc;
end $$;
create function app.read_staff_response_versions(p_auth uuid,p_provider uuid,p_digest bytea,p_reference text)
returns table(version_number integer,response_kind text,body text,correction_reason text,created_at timestamptz)
language plpgsql security definer set search_path='' as $$
declare actor uuid;
begin actor:=app.require_complaint_staff(p_auth,p_provider,p_digest,false);
 return query select r.version_number,r.response_kind,r.body,r.correction_reason,r.created_at
 from app.response_versions r join app.complaints c on c.id=r.complaint_id
 where c.reference=p_reference order by r.version_number desc;
end $$;
create function app.read_own_rejection_reason(p_auth uuid,p_provider uuid,p_digest bytea,p_reference text)
returns text language plpgsql security definer set search_path='' as $$
declare actor uuid;result text;
begin actor:=app.require_complaint_citizen(p_auth,p_provider,p_digest,false);select c.not_accepted_reason into result from app.complaints c where c.reference=p_reference and c.citizen_id=actor;return result;end $$;
do $$ declare f text;begin foreach f in array array[
 'read_own_response_versions(uuid,uuid,bytea,text)','read_staff_response_versions(uuid,uuid,bytea,text)','read_own_rejection_reason(uuid,uuid,bytea,text)'
] loop execute 'alter function app.'||f||' owner to app_writer';execute 'revoke all on function app.'||f||' from public,anon,authenticated,service_role,app_reader';execute 'grant execute on function app.'||f||' to app_web';end loop;end $$;
revoke create on schema app from app_writer;
commit;
