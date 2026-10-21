begin;
-- Explicit hosted provenance for the first Admin. Existing fixture sources and
-- all RLS/role grants remain unchanged; runtime roles cannot append this event.
alter table app.audit_events drop constraint audit_system_source;
alter table app.audit_events add constraint audit_system_source check (
 actor_type='USER' or (actor_type='SYSTEM' and change_summary is not null and (
 (action in ('PUBLIC_CONTENT_PUBLISHED','SETTINGS_UPDATED') and change_summary=jsonb_build_object('source','LOCAL_DEVELOPMENT_FIXTURE'))
 or (action='STAFF_CREATED' and resource_type='APPLICATION_PROFILE' and change_summary=jsonb_build_object('source','LOCAL_STAFF_FIXTURE'))
 or (action='CATEGORY_CREATED' and resource_type='CATEGORY' and change_summary=jsonb_build_object('source','LOCAL_CANONICAL_FIXTURE'))
 or (action='LOCATION_CREATED' and resource_type='LOCATION' and change_summary=jsonb_build_object('source','LOCAL_CANONICAL_FIXTURE'))
 or (action='STAFF_CREATED' and resource_type='APPLICATION_PROFILE'
  and change_summary=jsonb_build_object('source','HOSTED_INITIAL_ADMIN_BOOTSTRAP','role','ADMIN')
  and reason is not null and length(btrim(reason))>=3))));
commit;
