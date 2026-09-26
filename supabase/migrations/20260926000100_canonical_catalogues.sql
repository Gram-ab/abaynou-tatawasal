begin;
create function app.complaint_effective_text(value text) returns text
language sql immutable strict set search_path='' as $$
 select btrim(value, E'\u0009\u000A\u000B\u000C\u000D\u0020\u00A0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u2028\u2029\u202F\u205F\u3000\uFEFF')
$$;
create table app.categories (
 id uuid primary key, code text not null unique check(code ~ '^[A-Z][A-Z0-9_]{0,63}$'),
 is_active boolean not null, created_at timestamptz not null default transaction_timestamp(),
 updated_at timestamptz not null default transaction_timestamp(), revision bigint not null default 1 check(revision>0)
);
create table app.locations (like app.categories including defaults including constraints including indexes);
create table app.category_translations (
 category_id uuid not null references app.categories on delete restrict,
 language text not null check(language in ('ar','fr','en')),
 label text not null check(length(label)<=200 and length(app.complaint_effective_text(label))>0),
 primary key(category_id,language)
);
create table app.location_translations (
 location_id uuid not null references app.locations on delete restrict,
 language text not null check(language in ('ar','fr','en')),
 label text not null check(length(label)<=200 and length(app.complaint_effective_text(label))>0),
 primary key(location_id,language)
);
create function app.guard_catalogue_identity() returns trigger language plpgsql set search_path='' as $$
begin
 if new.id<>old.id or new.code<>old.code or new.created_at<>old.created_at or new.revision<>old.revision+1 then
 raise exception using errcode='23514',message='Invalid catalogue revision'; end if;
 new.updated_at:=transaction_timestamp(); return new;
end $$;
create trigger category_identity before update on app.categories for each row execute function app.guard_catalogue_identity();
create trigger location_identity before update on app.locations for each row execute function app.guard_catalogue_identity();
do $$ declare t text; begin
 foreach t in array array['categories','category_translations','locations','location_translations'] loop
 execute format('alter table app.%I enable row level security',t);
 execute format('alter table app.%I force row level security',t);
 execute format('create trigger no_delete before delete on app.%I for each row execute function app.prevent_history_change()',t);
 execute format('create trigger no_truncate before truncate on app.%I for each statement execute function app.prevent_history_change()',t);
 execute format('revoke all on app.%I from public,anon,authenticated,service_role,app_web',t);
 execute format('grant select on app.%I to app_reader,app_writer',t);
 end loop;
end $$;
create policy categories_active on app.categories for select to app_reader,app_writer using(is_active);
create policy locations_active on app.locations for select to app_reader,app_writer using(is_active);
create policy category_labels_active on app.category_translations for select to app_reader,app_writer using(exists(select 1 from app.categories c where c.id=category_id));
create policy location_labels_active on app.location_translations for select to app_reader,app_writer using(exists(select 1 from app.locations l where l.id=location_id));

-- Only offline local initialization may append these explicitly identified SYSTEM events.
alter table app.audit_events drop constraint audit_system_source;
alter table app.audit_events add constraint audit_system_source check (
 actor_type='USER' or (actor_type='SYSTEM' and change_summary is not null and (
 (action in ('PUBLIC_CONTENT_PUBLISHED','SETTINGS_UPDATED') and change_summary=jsonb_build_object('source','LOCAL_DEVELOPMENT_FIXTURE'))
 or (action='STAFF_CREATED' and resource_type='APPLICATION_PROFILE' and change_summary=jsonb_build_object('source','LOCAL_STAFF_FIXTURE'))
 or (action='CATEGORY_CREATED' and resource_type='CATEGORY' and change_summary=jsonb_build_object('source','LOCAL_CANONICAL_FIXTURE'))
 or (action='LOCATION_CREATED' and resource_type='LOCATION' and change_summary=jsonb_build_object('source','LOCAL_CANONICAL_FIXTURE')))));

grant create on schema app to app_reader;
grant execute on function app.complaint_effective_text(text) to app_reader,app_writer;
create function app.read_submission_catalogues() returns table(kind text,id uuid,code text,labels jsonb)
language sql stable security definer set search_path='' as $$
 select 'category',c.id,c.code,jsonb_object_agg(t.language,t.label)
 from app.categories c join app.category_translations t on t.category_id=c.id
 where c.is_active group by c.id,c.code having count(*)=3
 union all
 select 'location',l.id,l.code,jsonb_object_agg(t.language,t.label)
 from app.locations l join app.location_translations t on t.location_id=l.id
 where l.is_active group by l.id,l.code having bool_or(t.language='ar')
$$;
alter function app.read_submission_catalogues() owner to app_reader;
revoke all on function app.read_submission_catalogues() from public,anon,authenticated,service_role;
grant execute on function app.read_submission_catalogues() to app_web;
revoke create on schema app from app_reader;
commit;
