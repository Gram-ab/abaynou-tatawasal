-- Read-only hosted staging preflight.
-- Intended project: vdpflzhsohhvvwdrjzhd (West EU / Ireland).
-- Select that project in Supabase Dashboard before running this in SQL Editor.
-- This header identifies the intended target; SQL does not independently verify
-- the Supabase project ref. No rows from Citizen/Auth/business tables are read.
begin read only;
set local statement_timeout = '5s';

select current_database() as database_name,
       current_user as execution_role,
       current_setting('server_version') as postgres_version,
       current_setting('transaction_read_only') as transaction_read_only;

select rolname, rolsuper, rolcreaterole, rolcreatedb
from pg_catalog.pg_roles
where rolname = current_user;

select nspname as schema_name,
       pg_catalog.pg_get_userbyid(nspowner) as schema_owner,
       has_schema_privilege(current_user, oid, 'USAGE') as can_use_schema,
       has_schema_privilege(current_user, oid, 'CREATE') as can_create_in_schema
from pg_catalog.pg_namespace
where nspname in ('app', 'auth', 'extensions', 'public')
order by nspname;

select to_regclass('auth.users') is not null as provider_auth_present,
       to_regnamespace('app') is not null as application_schema_present,
       to_regclass('supabase_migrations.schema_migrations') is not null as migration_history_present;

select rolname, rolcanlogin, rolsuper, rolbypassrls,
       pg_has_role(current_user, oid, 'MEMBER') as executor_is_member
from pg_catalog.pg_roles
where rolname in ('app_web', 'app_reader', 'app_writer', 'app_mailer', 'app_mail_worker')
order by rolname;

select table_schema, table_name
from information_schema.tables
where table_schema in ('app', 'public')
order by table_schema, table_name;

-- Empty results do not alone prove grants are impossible: an executor can
-- inherit privileges. Review hosted role/ownership compatibility before apply.
select table_schema, table_name, column_name, privilege_type, is_grantable
from information_schema.column_privileges
where grantee = current_user and table_schema = 'auth' and table_name = 'users'
  and column_name in ('id', 'email', 'email_confirmed_at', 'last_sign_in_at', 'raw_user_meta_data')
order by column_name, privilege_type;

rollback;
