-- Run in project vdpflzhsohhvvwdrjzhd (Ireland), using Supabase SQL Editor.
-- One SELECT, one result row. Reads catalog metadata only; makes no changes.
-- The comment identifies the intended project; it is not an identity check.
select
  current_user as execution_role,
  current_setting('server_version') as postgres_version,
  (select rolcreaterole from pg_catalog.pg_roles where rolname=current_user) as can_create_roles,
  has_database_privilege(current_user,current_database(),'CREATE') as can_create_schema,
  to_regclass('auth.users') is not null as provider_auth_present,
  to_regnamespace('app') is not null as application_schema_present,
  to_regclass('supabase_migrations.schema_migrations') is not null as migration_history_present,
  array(select rolname::text from pg_catalog.pg_roles
        where rolname in ('app_web','app_reader','app_writer','app_mailer','app_mail_worker')
        order by rolname) as existing_application_roles,
  array(select n.nspname::text || '.' || c.relname::text
        from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
        where n.nspname in ('app','public') and c.relkind in ('r','p','v','m','f')
        order by n.nspname,c.relname) as existing_application_public_objects;
