begin;

grant create on schema app to app_writer;

create table app.legal_acknowledgements (
 id uuid primary key default gen_random_uuid(),
 citizen_id uuid not null references app.application_profiles(id) on delete restrict,
 page_version_id uuid not null references app.public_page_versions(id) on delete restrict,
 language text not null check(language in ('ar','fr','en')),
 acknowledged_at timestamptz not null default transaction_timestamp(),
 audit_event_id uuid not null references app.audit_events(id) on delete restrict,
 unique(citizen_id,page_version_id)
);

create index legal_acknowledgements_page_version on app.legal_acknowledgements(page_version_id);
create index legal_acknowledgements_audit on app.legal_acknowledgements(audit_event_id);

create function app.verify_legal_acknowledgement() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from app.application_profiles p where p.id=NEW.citizen_id and p.role='CITIZEN') then
  raise exception using errcode='23514',message='Legal acknowledgement requires a Citizen profile';
 end if;
 if not exists(
  select 1 from app.public_page_versions v
  join app.public_pages p on p.id=v.page_id
  join app.public_page_translations t on t.version_id=v.id and t.language=NEW.language
  where v.id=NEW.page_version_id and p.page_key in ('TERMS','PRIVACY')
 ) then
  raise exception using errcode='23514',message='Legal acknowledgement requires a Terms or Privacy translation';
 end if;
 if not exists(
  select 1 from app.audit_events a where a.id=NEW.audit_event_id
   and a.actor_id=NEW.citizen_id and a.actor_type='USER' and a.actor_role='CITIZEN'
   and a.action='LEGAL_ACKNOWLEDGED' and a.resource_type='APPLICATION_PROFILE' and a.resource_id=NEW.citizen_id
 ) then
  raise exception using errcode='23514',message='Legal acknowledgement audit mismatch';
 end if;
 return NEW;
end $$;
alter function app.verify_legal_acknowledgement() owner to app_writer;

create trigger legal_acknowledgement_valid before insert on app.legal_acknowledgements
 for each row execute function app.verify_legal_acknowledgement();
create trigger legal_acknowledgements_immutable before update or delete on app.legal_acknowledgements
 for each row execute function app.prevent_history_change();
create trigger legal_acknowledgements_no_truncate before truncate on app.legal_acknowledgements
 for each statement execute function app.prevent_history_change();

alter table app.legal_acknowledgements enable row level security;
alter table app.legal_acknowledgements force row level security;
grant select,insert on app.legal_acknowledgements to app_writer;
create policy legal_acknowledgements_writer on app.legal_acknowledgements to app_writer using(true) with check(true);

revoke all on app.legal_acknowledgements from public,anon,authenticated,service_role,app_web,app_reader;
revoke all on function app.verify_legal_acknowledgement() from public,anon,authenticated,service_role,app_web,app_reader;
revoke create on schema app from app_writer;

commit;
