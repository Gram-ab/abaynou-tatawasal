begin;
grant app_reader, app_writer to postgres;
grant create on schema app to app_reader, app_writer;
create table app.public_pages (
 id uuid primary key default gen_random_uuid(),
 page_key text not null unique check (page_key in ('HOME','HOW_IT_WORKS','SERVICE_SCOPE','FAQ','CONTACT','USER_GUIDE','PRIVACY','ACCESSIBILITY','TERMS')),
 current_version integer check (current_version > 0),
 revision bigint not null default 1 check (revision > 0)
);
create table app.public_page_versions (
 id uuid primary key default gen_random_uuid(),
 page_id uuid not null references app.public_pages(id) on delete restrict,
 version_number integer not null check (version_number > 0),
 published_at timestamptz not null default transaction_timestamp(),
 audit_event_id uuid not null unique references app.audit_events(id) on delete restrict,
 unique(page_id,version_number)
);
alter table app.public_pages add constraint current_publication_same_page foreign key(id,current_version)
 references app.public_page_versions(page_id,version_number) on delete restrict deferrable initially deferred;
create table app.public_page_translations (
 version_id uuid not null references app.public_page_versions(id) on delete restrict,
 language text not null check(language in ('ar','fr','en')),
 title text not null check(length(btrim(title)) between 1 and 200),
 body text not null check(length(btrim(body)) between 1 and 30000 and body !~ '[<>]'),
 primary key(version_id,language)
);
create trigger versions_immutable before update or delete on app.public_page_versions for each row execute function app.prevent_history_change();
create trigger translations_immutable before update or delete on app.public_page_translations for each row execute function app.prevent_history_change();
create trigger pages_no_delete before delete on app.public_pages for each row execute function app.prevent_history_change();
create trigger pages_no_truncate before truncate on app.public_pages for each statement execute function app.prevent_history_change();
create trigger versions_no_truncate before truncate on app.public_page_versions for each statement execute function app.prevent_history_change();
create trigger translations_no_truncate before truncate on app.public_page_translations for each statement execute function app.prevent_history_change();

alter table app.public_pages enable row level security;
alter table app.public_pages force row level security;
alter table app.public_page_versions enable row level security;
alter table app.public_page_versions force row level security;
alter table app.public_page_translations enable row level security;
alter table app.public_page_translations force row level security;
grant select on app.public_pages, app.public_page_versions, app.public_page_translations to app_reader, app_writer;
grant update(current_version,revision) on app.public_pages to app_writer;
grant insert on app.public_page_versions, app.public_page_translations to app_writer;
create policy pages_public on app.public_pages for select to app_reader using(current_version is not null);
create policy versions_current on app.public_page_versions for select to app_reader using(exists(select 1 from app.public_pages p where p.id=page_id and p.current_version=version_number));
create policy translations_current on app.public_page_translations for select to app_reader using(exists(select 1 from app.public_page_versions v where v.id=version_id));
create policy pages_writer on app.public_pages to app_writer using(true) with check(true);
create policy versions_writer on app.public_page_versions to app_writer using(true) with check(true);
create policy translations_writer on app.public_page_translations to app_writer using(true) with check(true);

create function app.verify_publication() returns trigger language plpgsql security definer set search_path='' as $$
declare v app.public_page_versions; p app.public_pages;
begin
 select * into v from app.public_page_versions where id=NEW.id;
 select * into p from app.public_pages where id=v.page_id;
 if (select count(*) from app.public_page_translations where version_id=v.id) <> 3 then
  raise exception using errcode='23514',message='Publication requires all three languages';
 end if;
 if not exists(select 1 from app.audit_events a where a.id=v.audit_event_id and a.action='PUBLIC_CONTENT_PUBLISHED'
   and a.resource_type='PUBLIC_PAGE' and a.resource_id=v.page_id) then
  raise exception using errcode='23514',message='Publication audit target mismatch';
 end if;
 if p.current_version <> v.version_number or p.current_version is null then
  raise exception using errcode='23514',message='New publication must become current';
 end if;
 return null;
end $$;
alter function app.verify_publication() owner to app_writer;
create constraint trigger publication_complete after insert on app.public_page_versions deferrable initially deferred for each row execute function app.verify_publication();

create function app.guard_page_update() returns trigger language plpgsql set search_path='' as $$
begin
 if NEW.id <> OLD.id or NEW.page_key <> OLD.page_key or NEW.current_version is null
 or NEW.current_version <> coalesce(OLD.current_version,0)+1 or NEW.revision <> OLD.revision+1 then
  raise exception using errcode='23514',message='Invalid publication transition';
 end if;
 return NEW;
end $$;
create trigger page_transition before update on app.public_pages for each row execute function app.guard_page_update();

-- Offline maintenance only: no public execution, no Admin UI, no browser command.
create function app.publish_development_page(p_key text, expected_revision bigint, bundle jsonb) returns void
 language plpgsql security definer set search_path='' as $$
declare p app.public_pages; version_id uuid:=gen_random_uuid(); audit_id uuid:=gen_random_uuid(); language_code text;
begin
 select * into strict p from app.public_pages where page_key=p_key for update;
 if p.revision <> expected_revision then raise exception using errcode='40001',message='Stale publication revision'; end if;
 if jsonb_typeof(bundle) is distinct from 'object' or not(bundle ?& array['ar','fr','en'])
  or bundle-array['ar','fr','en'] <> '{}'::jsonb then
  raise exception using errcode='23514',message='Invalid translation bundle';
 end if;
 foreach language_code in array array['ar','fr','en'] loop
  if jsonb_typeof(bundle->language_code) is distinct from 'object'
   or jsonb_typeof(bundle->language_code->'title') is distinct from 'string'
   or jsonb_typeof(bundle->language_code->'body') is distinct from 'string'
   or (bundle->language_code)-array['title','body'] <> '{}'::jsonb then
   raise exception using errcode='23514',message='Invalid translation fields';
  end if;
 end loop;
 insert into app.audit_events(id,actor_type,action,resource_type,resource_id,change_summary)
 values(audit_id,'SYSTEM','PUBLIC_CONTENT_PUBLISHED','PUBLIC_PAGE',p.id,'{"source":"LOCAL_DEVELOPMENT_FIXTURE"}');
 insert into app.public_page_versions(id,page_id,version_number,audit_event_id)
 values(version_id,p.id,coalesce(p.current_version,0)+1,audit_id);
 insert into app.public_page_translations(version_id,language,title,body)
 select version_id,l,bundle->l->>'title',bundle->l->>'body' from unnest(array['ar','fr','en']) l;
 update app.public_pages set current_version=coalesce(p.current_version,0)+1,revision=p.revision+1 where id=p.id;
end $$;
alter function app.publish_development_page(text,bigint,jsonb) owner to app_writer;
revoke all on function app.publish_development_page(text,bigint,jsonb) from public,anon,authenticated,service_role,app_web,app_reader;

create function app.read_public_page(p_key text, p_language text) returns table(title text,body text)
 language sql stable security definer set search_path='' as $$
 select t.title,t.body from app.public_pages p
 join app.public_page_versions v on v.page_id=p.id and v.version_number=p.current_version
 join app.public_page_translations t on t.version_id=v.id
 where p.page_key=p_key and t.language=p_language
 and (select count(*) from app.public_page_translations complete where complete.version_id=v.id)=3
$$;
alter function app.read_public_page(text,text) owner to app_reader;
revoke all on function app.read_public_page(text,text) from public,anon,authenticated,service_role;
grant execute on function app.read_public_page(text,text) to app_web;
revoke create on schema app from app_reader, app_writer;
commit;
