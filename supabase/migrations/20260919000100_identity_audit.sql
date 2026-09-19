begin;
create schema app;
revoke all on schema app from public, anon, authenticated, service_role;
create role app_web login nosuperuser nocreatedb nocreaterole noinherit nobypassrls;
create role app_reader nologin nosuperuser nocreatedb nocreaterole noinherit nobypassrls;
create role app_writer nologin nosuperuser nocreatedb nocreaterole noinherit nobypassrls;
grant usage on schema app to app_web, app_reader, app_writer;
alter default privileges in schema app revoke execute on functions from public;

create table app.application_profiles (
 id uuid primary key default gen_random_uuid(),
 auth_user_id uuid not null unique references auth.users(id) on delete restrict,
 full_name text not null check (length(btrim(full_name)) between 1 and 200),
 contact_phone text check (contact_phone ~ '^\+?[0-9][0-9 ()-]{6,23}$'),
 preferred_language text not null default 'ar' check (preferred_language in ('ar','fr','en')),
 role text not null check (role in ('CITIZEN','AGENT','ADMIN')),
 access_status text not null check (access_status in ('ACTIVE','DISABLED')),
 security_epoch bigint not null default 1 check (security_epoch > 0),
 created_at timestamptz not null default transaction_timestamp(),
 updated_at timestamptz not null default transaction_timestamp(),
 revision bigint not null default 1 check (revision > 0)
);
create table app.audit_events (
 id uuid primary key default gen_random_uuid(),
 actor_id uuid references app.application_profiles(id) on delete restrict,
 actor_type text not null check (actor_type in ('USER','SYSTEM','UNAUTHENTICATED')),
 actor_role text check (actor_role in ('CITIZEN','AGENT','ADMIN')),
 action text not null check (action in (
 'COMPLAINT_SUBMITTED','COMPLAINT_EDITED','COMPLAINT_WITHDRAWN','REVIEW_STARTED','PROCESSING_STARTED',
 'RESPONSE_ISSUED','RESPONSE_CORRECTED','COMPLAINT_CLOSED','COMPLAINT_NOT_ACCEPTED','PROFILE_UPDATED',
 'STAFF_CREATED','STAFF_UPDATED','ROLE_CHANGED','ACCOUNT_DISABLED','ACCOUNT_ENABLED','CATEGORY_CREATED',
 'CATEGORY_UPDATED','CATEGORY_ACTIVATED','CATEGORY_DEACTIVATED','LOCATION_CREATED','LOCATION_UPDATED',
 'LOCATION_ACTIVATED','LOCATION_DEACTIVATED','SETTINGS_UPDATED','PUBLIC_CONTENT_PUBLISHED',
 'LEGAL_ACKNOWLEDGED','SESSION_REVOKED','ACCOUNT_SECURITY_CHANGED','AUDIT_ACCESSED')),
 resource_type text not null check (resource_type in ('APPLICATION_PROFILE','COMPLAINT','CATEGORY','LOCATION','COMMUNE_SETTINGS','PUBLIC_PAGE','APPLICATION_SESSION','LEGAL_ACKNOWLEDGEMENT','AUDIT')),
 resource_id uuid,
 occurred_at timestamptz not null default transaction_timestamp(),
 reason text check (length(btrim(reason)) between 1 and 1000),
 change_summary jsonb check (jsonb_typeof(change_summary) = 'object' and octet_length(change_summary::text) <= 4096),
 correlation_id uuid not null default gen_random_uuid(),
 check ((actor_type = 'USER' and actor_id is not null and actor_role is not null)
    or (actor_type <> 'USER' and actor_id is null and actor_role is null)),
 check (resource_id is not null or action = 'AUDIT_ACCESSED'),
 check (action not in ('ROLE_CHANGED','ACCOUNT_DISABLED','ACCOUNT_ENABLED') or reason is not null),
 -- Only the explicitly defined DEV-01 bootstrap events may omit a real actor.
 check (actor_type = 'USER' or (actor_type = 'SYSTEM' and action in ('PUBLIC_CONTENT_PUBLISHED','SETTINGS_UPDATED'))),
 check (actor_type <> 'SYSTEM' or (change_summary is not null
   and coalesce(change_summary->>'source', '') = 'LOCAL_DEVELOPMENT_FIXTURE'
   and change_summary - 'source' = '{}'::jsonb))
);
create index audit_resource_history on app.audit_events(resource_type, resource_id, occurred_at, id);

create function app.prevent_history_change() returns trigger language plpgsql set search_path = '' as $$
begin raise exception using errcode = '23514', message = 'Immutable history cannot be changed'; end $$;
create trigger audit_immutable before update or delete on app.audit_events for each row execute function app.prevent_history_change();
create trigger profile_no_delete before delete on app.application_profiles for each row execute function app.prevent_history_change();
create trigger audit_no_truncate before truncate on app.audit_events for each statement execute function app.prevent_history_change();
create trigger profile_no_truncate before truncate on app.application_profiles for each statement execute function app.prevent_history_change();
alter table app.application_profiles enable row level security;
alter table app.application_profiles force row level security;
alter table app.audit_events enable row level security;
alter table app.audit_events force row level security;
-- No runtime profile access or profile provisioning in DEV-01.
grant insert, select on app.audit_events to app_writer;
create policy audit_writer_insert on app.audit_events for insert to app_writer with check (
 actor_type = 'SYSTEM' and action in ('PUBLIC_CONTENT_PUBLISHED','SETTINGS_UPDATED'));
create policy audit_writer_read on app.audit_events for select to app_writer using (true);
revoke all on all tables in schema app from public, anon, authenticated, service_role, app_web;
revoke all on all functions in schema app from public, anon, authenticated, service_role, app_web;
commit;
