begin;

create table app.application_sessions (
 id uuid primary key default gen_random_uuid(),
 profile_id uuid not null references app.application_profiles(id) on delete restrict,
 provider_session_id uuid not null unique,
 secret_digest bytea not null unique check (octet_length(secret_digest)=32),
 security_epoch bigint not null check (security_epoch>0),
 started_at timestamptz not null default transaction_timestamp(),
 last_user_activity_at timestamptz not null default transaction_timestamp(),
 idle_timeout_seconds integer not null check (idle_timeout_seconds in (3600,604800)),
 absolute_expires_at timestamptz not null,
 reauthenticated_at timestamptz,
 revoked_at timestamptz,
 revocation_reason text check (revocation_reason in ('LOGOUT','PASSWORD_RESET','PASSWORD_CHANGE','EMAIL_CHANGE','ACCOUNT_DISABLED','AUTHORITY_CHANGED','SECURITY_ACTION','EXPIRED')),
 check (last_user_activity_at>=started_at),
 check (absolute_expires_at>started_at),
 check ((idle_timeout_seconds=604800 and absolute_expires_at=started_at+interval '30 days')
    or (idle_timeout_seconds=3600 and absolute_expires_at=started_at+interval '8 hours')),
 check (reauthenticated_at is null or reauthenticated_at>=started_at),
 check ((revoked_at is null and revocation_reason is null) or (revoked_at is not null and revocation_reason is not null))
);

create index application_sessions_active_profile on app.application_sessions(profile_id) where revoked_at is null;

create function app.guard_application_session_change() returns trigger language plpgsql set search_path='' as $$
begin
 if NEW.id<>OLD.id or NEW.profile_id<>OLD.profile_id or NEW.provider_session_id<>OLD.provider_session_id
    or NEW.started_at<>OLD.started_at or NEW.idle_timeout_seconds<>OLD.idle_timeout_seconds
    or NEW.absolute_expires_at<>OLD.absolute_expires_at
    or NEW.last_user_activity_at<OLD.last_user_activity_at
    or (OLD.revoked_at is not null and (NEW.revoked_at is distinct from OLD.revoked_at or NEW.revocation_reason is distinct from OLD.revocation_reason)) then
  raise exception using errcode='23514',message='Invalid application session transition';
 end if;
 return NEW;
end $$;

create trigger application_session_transition before update on app.application_sessions
 for each row execute function app.guard_application_session_change();
create trigger application_sessions_no_delete before delete on app.application_sessions
 for each row execute function app.prevent_history_change();
create trigger application_sessions_no_truncate before truncate on app.application_sessions
 for each statement execute function app.prevent_history_change();

alter table app.application_sessions enable row level security;
alter table app.application_sessions force row level security;
grant select,insert,update on app.application_sessions to app_writer;
create policy application_sessions_writer on app.application_sessions to app_writer using(true) with check(true);

revoke all on app.application_sessions from public,anon,authenticated,service_role,app_web,app_reader;
revoke all on function app.guard_application_session_change() from public,anon,authenticated,service_role,app_web,app_reader,app_writer;

commit;
