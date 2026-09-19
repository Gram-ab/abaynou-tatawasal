begin;
create table app.commune_settings (
 id uuid primary key default gen_random_uuid(),
 contact_phone text check(contact_phone ~ '^\+?[0-9][0-9 ()-]{6,23}$'),
 contact_email text check(length(contact_email)<=254 and contact_email ~ '^[A-Za-z0-9.!#$%&*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$'),
 chikaya_url text not null check(chikaya_url in ('https://chikaya.ma/','https://www.chikaya.ma/')),
 updated_at timestamptz not null default transaction_timestamp(),
 revision bigint not null default 1 check(revision>0)
);
create unique index settings_singleton on app.commune_settings ((true));
create table app.commune_settings_translations (
 settings_id uuid not null references app.commune_settings(id) on delete restrict,
 language text not null check(language in ('ar','fr','en')),
 commune_name text not null check(length(btrim(commune_name)) between 1 and 200),
 public_address text check(length(btrim(public_address)) between 1 and 1000),
 opening_hours text check(length(btrim(opening_hours)) between 1 and 1000),
 primary key(settings_id,language)
);
alter table app.commune_settings enable row level security;
alter table app.commune_settings force row level security;
alter table app.commune_settings_translations enable row level security;
alter table app.commune_settings_translations force row level security;
grant select on app.commune_settings,app.commune_settings_translations to app_reader,app_writer;
grant insert,update on app.commune_settings,app.commune_settings_translations to app_writer;
create policy settings_public on app.commune_settings for select to app_reader using(true);
create policy settings_translations_public on app.commune_settings_translations for select to app_reader using(true);
create policy settings_writer on app.commune_settings to app_writer using(true) with check(true);
create policy settings_translations_writer on app.commune_settings_translations to app_writer using(true) with check(true);
create trigger settings_no_delete before delete on app.commune_settings for each row execute function app.prevent_history_change();
create trigger settings_translations_no_delete before delete on app.commune_settings_translations for each row execute function app.prevent_history_change();
create trigger settings_no_truncate before truncate on app.commune_settings for each statement execute function app.prevent_history_change();
create trigger settings_translations_no_truncate before truncate on app.commune_settings_translations for each statement execute function app.prevent_history_change();
create function app.guard_settings_update() returns trigger language plpgsql set search_path='' as $$
begin
 if NEW.id <> OLD.id or NEW.revision <> OLD.revision+1 then
  raise exception using errcode='23514',message='Invalid settings revision';
 end if;
 NEW.updated_at:=transaction_timestamp(); return NEW;
end $$;
create trigger settings_revision before update on app.commune_settings for each row execute function app.guard_settings_update();

grant create on schema app to app_reader,app_writer;
create function app.verify_settings() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if (select count(*) from app.commune_settings_translations where settings_id=NEW.id) <> 3 then
  raise exception using errcode='23514',message='Settings require all three languages';
 end if;
 if not exists(select 1 from app.audit_events where resource_type='COMMUNE_SETTINGS' and resource_id=NEW.id
 and action='SETTINGS_UPDATED' and occurred_at=transaction_timestamp()) then
  raise exception using errcode='23514',message='Settings require atomic audit';
 end if;
 return null;
end $$;
alter function app.verify_settings() owner to app_writer;
create constraint trigger settings_complete after insert or update on app.commune_settings deferrable initially deferred for each row execute function app.verify_settings();

create function app.configure_development_settings(expected_revision bigint, phone text, email text, guidance_url text, bundle jsonb)
 returns void language plpgsql security definer set search_path='' as $$
declare settings_id uuid; actual_revision bigint; l text;
begin
 perform pg_advisory_xact_lock(71919001);
 select id,revision into settings_id,actual_revision from app.commune_settings for update;
 if coalesce(actual_revision,0) <> expected_revision then raise exception using errcode='40001',message='Stale settings revision'; end if;
 if jsonb_typeof(bundle) is distinct from 'object' or not(bundle ?& array['ar','fr','en']) or bundle-array['ar','fr','en'] <> '{}'::jsonb then
  raise exception using errcode='23514',message='Invalid settings translations';
 end if;
 foreach l in array array['ar','fr','en'] loop
  if jsonb_typeof(bundle->l) is distinct from 'object'
  or jsonb_typeof(bundle->l->'commune_name') is distinct from 'string'
  or jsonb_typeof(bundle->l->'public_address') is distinct from 'string'
  or jsonb_typeof(bundle->l->'opening_hours') is distinct from 'string'
  or (bundle->l)-array['commune_name','public_address','opening_hours'] <> '{}'::jsonb then
   raise exception using errcode='23514',message='Invalid settings fields';
  end if;
 end loop;
 if settings_id is null then
  settings_id:='10000000-0000-4000-8000-000000000001';
  insert into app.commune_settings(id,contact_phone,contact_email,chikaya_url) values(settings_id,phone,email,guidance_url);
 else
  update app.commune_settings set contact_phone=phone,contact_email=email,chikaya_url=guidance_url,revision=revision+1 where id=settings_id;
 end if;
 insert into app.commune_settings_translations(settings_id,language,commune_name,public_address,opening_hours)
 select settings_id,k,bundle->k->>'commune_name',bundle->k->>'public_address',bundle->k->>'opening_hours' from unnest(array['ar','fr','en']) k
 on conflict on constraint commune_settings_translations_pkey do update set commune_name=excluded.commune_name,public_address=excluded.public_address,opening_hours=excluded.opening_hours;
 insert into app.audit_events(actor_type,action,resource_type,resource_id,change_summary)
 values('SYSTEM','SETTINGS_UPDATED','COMMUNE_SETTINGS',settings_id,'{"source":"LOCAL_DEVELOPMENT_FIXTURE"}');
end $$;
alter function app.configure_development_settings(bigint,text,text,text,jsonb) owner to app_writer;
revoke all on function app.configure_development_settings(bigint,text,text,text,jsonb) from public,anon,authenticated,service_role,app_web,app_reader;
create function app.read_public_settings(p_language text) returns table(contact_phone text,contact_email text,chikaya_url text,commune_name text,public_address text,opening_hours text)
 language sql stable security definer set search_path='' as $$
 select s.contact_phone,s.contact_email,s.chikaya_url,t.commune_name,t.public_address,t.opening_hours
 from app.commune_settings s join app.commune_settings_translations t on t.settings_id=s.id
 where t.language=p_language and (select count(*) from app.commune_settings_translations c where c.settings_id=s.id)=3
$$;
alter function app.read_public_settings(text) owner to app_reader;
revoke all on function app.read_public_settings(text) from public,anon,authenticated,service_role;
grant execute on function app.read_public_settings(text) to app_web;
revoke create on schema app from app_reader,app_writer;
commit;
