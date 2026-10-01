begin;

grant create on schema app to app_writer;

alter table app.command_receipts drop constraint command_receipts_command_type_check;
alter table app.command_receipts add constraint command_receipts_command_type_check check(command_type in (
 'COMPLAINT_SUBMIT','COMPLAINT_EDIT','COMPLAINT_WITHDRAW','COMPLAINT_START_REVIEW','COMPLAINT_START_PROCESSING',
 'COMPLAINT_SEND_RESPONSE','COMPLAINT_NOT_ACCEPT','COMPLAINT_CORRECT_RESPONSE','COMPLAINT_CLOSE',
 'CATEGORY_CREATE','CATEGORY_UPDATE','CATEGORY_SET_ACTIVE','LOCATION_CREATE','LOCATION_UPDATE','LOCATION_SET_ACTIVE',
 'PUBLIC_CONTENT_PUBLISH','COMMUNE_SETTINGS_UPDATE'));
alter table app.command_receipts drop constraint command_receipts_result_resource_type_check;
alter table app.command_receipts add constraint command_receipts_result_resource_type_check check(
 result_resource_type in ('COMPLAINT','CATEGORY','LOCATION','PUBLIC_PAGE','COMMUNE_SETTINGS'));

create policy content_admin_audit_insert on app.audit_events for insert to app_writer with check(
 actor_id=nullif(current_setting('app.staff_admin_actor',true),'')::uuid
 and actor_type='USER' and actor_role='ADMIN'
 and ((action='PUBLIC_CONTENT_PUBLISHED' and resource_type='PUBLIC_PAGE')
   or (action='SETTINGS_UPDATED' and resource_type='COMMUNE_SETTINGS')));

create function app.valid_public_title(value text) returns boolean
language sql immutable set search_path='' as $$
 select coalesce(value is not null and length(btrim(value))>0 and length(value)<=200
  and value !~ '[<>[:cntrl:]]',false)
$$;

create function app.valid_public_body(value text) returns boolean
language sql immutable set search_path='' as $$
 select coalesce(value is not null and length(btrim(value))>0 and length(value)<=30000
  and value !~ '[<>]'
  and regexp_replace(value,E'[\\t\\n\\r]','','g') !~ '[[:cntrl:]]',false)
$$;

create function app.valid_public_bundle(bundle jsonb) returns boolean
language plpgsql immutable set search_path='' as $$
declare language_code text;
begin
 if jsonb_typeof(bundle) is distinct from 'object'
  or not(bundle ?& array['ar','fr','en']) or bundle-array['ar','fr','en']<>'{}'::jsonb then return false;end if;
 foreach language_code in array array['ar','fr','en'] loop
  if jsonb_typeof(bundle->language_code) is distinct from 'object'
   or not((bundle->language_code) ?& array['title','body'])
   or (bundle->language_code)-array['title','body']<>'{}'::jsonb
   or jsonb_typeof(bundle->language_code->'title') is distinct from 'string'
   or jsonb_typeof(bundle->language_code->'body') is distinct from 'string'
   or not app.valid_public_title(bundle->language_code->>'title')
   or not app.valid_public_body(bundle->language_code->>'body') then return false;end if;
 end loop;
 return true;
end $$;

create function app.valid_public_setting(value text,maximum integer) returns boolean
language sql immutable set search_path='' as $$
 select coalesce(value is not null and length(btrim(value))>0 and length(value)<=maximum
  and value !~ '[<>[:cntrl:]]',false)
$$;

create function app.valid_settings_bundle(bundle jsonb) returns boolean
language plpgsql immutable set search_path='' as $$
declare language_code text;
begin
 if jsonb_typeof(bundle) is distinct from 'object'
  or not(bundle ?& array['ar','fr','en']) or bundle-array['ar','fr','en']<>'{}'::jsonb then return false;end if;
 foreach language_code in array array['ar','fr','en'] loop
  if jsonb_typeof(bundle->language_code) is distinct from 'object'
   or not((bundle->language_code) ?& array['commune_name','public_address','opening_hours'])
   or (bundle->language_code)-array['commune_name','public_address','opening_hours']<>'{}'::jsonb
   or jsonb_typeof(bundle->language_code->'commune_name') is distinct from 'string'
   or jsonb_typeof(bundle->language_code->'public_address') is distinct from 'string'
   or jsonb_typeof(bundle->language_code->'opening_hours') is distinct from 'string'
   or not app.valid_public_setting(bundle->language_code->>'commune_name',200)
   or not app.valid_public_setting(bundle->language_code->>'public_address',1000)
   or not app.valid_public_setting(bundle->language_code->>'opening_hours',1000) then return false;end if;
 end loop;
 return true;
end $$;

create function app.list_admin_public_pages(p_auth uuid,p_provider uuid,p_digest bytea,p_language text)
returns table(page_id uuid,page_key text,current_version integer,revision bigint,title text,published_at timestamptz)
language plpgsql security definer set search_path='' as $$
begin
 perform * from app.require_staff_admin(p_auth,p_provider,p_digest);
 if p_language not in ('ar','fr','en') then raise exception using errcode='22023',message='Invalid language';end if;
 return query select p.id,p.page_key,p.current_version,p.revision,t.title,v.published_at
 from app.public_pages p
 left join app.public_page_versions v on v.page_id=p.id and v.version_number=p.current_version
 left join app.public_page_translations t on t.version_id=v.id and t.language=p_language
 order by array_position(array['HOME','HOW_IT_WORKS','SERVICE_SCOPE','FAQ','CONTACT','USER_GUIDE','PRIVACY','ACCESSIBILITY','TERMS'],p.page_key);
end $$;

create function app.read_admin_public_page(p_auth uuid,p_provider uuid,p_digest bytea,p_key text)
returns table(page_id uuid,page_key text,current_version integer,revision bigint,translations jsonb,published_at timestamptz,publisher_name text,actor_type text)
language plpgsql security definer set search_path='' as $$
begin
 perform * from app.require_staff_admin(p_auth,p_provider,p_digest);
 return query select p.id,p.page_key,p.current_version,p.revision,
  coalesce((select jsonb_object_agg(t.language,jsonb_build_object('title',t.title,'body',t.body)) from app.public_page_translations t where t.version_id=v.id),'{}'::jsonb),
  v.published_at,actor.full_name,a.actor_type
 from app.public_pages p
 left join app.public_page_versions v on v.page_id=p.id and v.version_number=p.current_version
 left join app.audit_events a on a.id=v.audit_event_id
 left join app.application_profiles actor on actor.id=a.actor_id
 where p.page_key=p_key;
end $$;

create function app.read_admin_public_page_history(p_auth uuid,p_provider uuid,p_digest bytea,p_key text,p_limit integer default 30)
returns table(version_id uuid,version_number integer,is_current boolean,translations jsonb,published_at timestamptz,publisher_name text,actor_type text)
language plpgsql security definer set search_path='' as $$
begin
 perform * from app.require_staff_admin(p_auth,p_provider,p_digest);
 if coalesce(p_limit,30) not between 1 and 100 then raise exception using errcode='22023',message='Invalid history limit';end if;
 return query select v.id,v.version_number,v.version_number=p.current_version,
  coalesce((select jsonb_object_agg(t.language,jsonb_build_object('title',t.title,'body',t.body)) from app.public_page_translations t where t.version_id=v.id),'{}'::jsonb),
  v.published_at,actor.full_name,a.actor_type
 from app.public_pages p join app.public_page_versions v on v.page_id=p.id
 join app.audit_events a on a.id=v.audit_event_id left join app.application_profiles actor on actor.id=a.actor_id
 where p.page_key=p_key order by v.version_number desc limit p_limit;
end $$;

create function app.publish_public_page(
 p_auth uuid,p_provider uuid,p_digest bytea,p_key text,p_expected_revision bigint,
 p_command_key uuid,p_fingerprint bytea,p_bundle jsonb)
returns table(page_id uuid,version_number integer,revision bigint,replayed boolean)
language plpgsql security definer set search_path='' as $$
declare actor record;receipt app.command_receipts;page app.public_pages;next_version integer;next_revision bigint;
 version_id uuid:=gen_random_uuid();audit_id uuid:=gen_random_uuid();language_code text;prior_version integer;
begin
 select * into actor from app.require_staff_admin(p_auth,p_provider,p_digest);
 perform set_config('app.staff_admin_actor',actor.profile_id::text,true);
 perform set_config('app.complaint_actor',actor.profile_id::text,true);
 if p_command_key is null or p_fingerprint is null or octet_length(p_fingerprint)<>32 or not app.valid_public_bundle(p_bundle) then
  raise exception using errcode='23514',message='Invalid publication';end if;
 select * into receipt from app.command_receipts where actor_id=actor.profile_id and idempotency_key=p_command_key;
 if found then
  if receipt.command_type<>'PUBLIC_CONTENT_PUBLISH' or receipt.request_fingerprint<>p_fingerprint then
   raise exception using errcode='P0409',message='Command conflict';end if;
  select v.version_number into prior_version from app.public_page_versions v where v.audit_event_id=receipt.source_event_id;
  return query select receipt.result_resource_id,prior_version,receipt.result_revision,true;return;
 end if;
 select * into page from app.public_pages where public_pages.page_key=p_key for update;
 if not found then raise exception using errcode='P0804',message='Fixed public page unavailable';end if;
 if page.revision<>p_expected_revision then raise exception using errcode='P0812',message='Public page changed';end if;
 next_version:=coalesce(page.current_version,0)+1;next_revision:=page.revision+1;
 insert into app.audit_events(id,actor_id,actor_type,actor_role,action,resource_type,resource_id,change_summary)
 values(audit_id,actor.profile_id,'USER','ADMIN','PUBLIC_CONTENT_PUBLISHED','PUBLIC_PAGE',page.id,
  jsonb_build_object('version',next_version,'locales',jsonb_build_array('ar','fr','en')));
 insert into app.public_page_versions(id,page_id,version_number,audit_event_id) values(version_id,page.id,next_version,audit_id);
 foreach language_code in array array['ar','fr','en'] loop
  insert into app.public_page_translations(version_id,language,title,body)
  values(version_id,language_code,btrim(p_bundle->language_code->>'title'),btrim(p_bundle->language_code->>'body'));
 end loop;
 update app.public_pages set current_version=next_version,revision=next_revision where id=page.id;
 insert into app.command_receipts(actor_id,idempotency_key,command_type,request_fingerprint,result_resource_type,result_resource_id,result_revision,source_event_id)
 values(actor.profile_id,p_command_key,'PUBLIC_CONTENT_PUBLISH',p_fingerprint,'PUBLIC_PAGE',page.id,next_revision,audit_id);
 return query select page.id,next_version,next_revision,false;
end $$;

create function app.read_admin_commune_settings(p_auth uuid,p_provider uuid,p_digest bytea)
returns table(settings_id uuid,contact_phone text,contact_email text,chikaya_url text,revision bigint,updated_at timestamptz,translations jsonb)
language plpgsql security definer set search_path='' as $$
begin
 perform * from app.require_staff_admin(p_auth,p_provider,p_digest);
 return query select s.id,s.contact_phone,s.contact_email,s.chikaya_url,s.revision,s.updated_at,
  coalesce((select jsonb_object_agg(t.language,jsonb_build_object('commune_name',t.commune_name,'public_address',t.public_address,'opening_hours',t.opening_hours)) from app.commune_settings_translations t where t.settings_id=s.id),'{}'::jsonb)
 from app.commune_settings s;
end $$;

create function app.read_admin_commune_settings_history(p_auth uuid,p_provider uuid,p_digest bytea,p_limit integer default 30)
returns table(revision bigint,changed_fields jsonb,occurred_at timestamptz,publisher_name text)
language plpgsql security definer set search_path='' as $$
begin
 perform * from app.require_staff_admin(p_auth,p_provider,p_digest);
 if coalesce(p_limit,30) not between 1 and 100 then raise exception using errcode='22023',message='Invalid history limit';end if;
 return query select coalesce((a.change_summary->>'revision')::bigint,1),a.change_summary->'fields',a.occurred_at,actor.full_name
 from app.audit_events a left join app.application_profiles actor on actor.id=a.actor_id
 where a.action='SETTINGS_UPDATED' and a.resource_type='COMMUNE_SETTINGS'
 order by a.occurred_at desc,a.id desc limit p_limit;
end $$;

create function app.update_commune_settings(
 p_auth uuid,p_provider uuid,p_digest bytea,p_expected_revision bigint,p_command_key uuid,p_fingerprint bytea,
 p_phone text,p_email text,p_chikaya_url text,p_bundle jsonb)
returns table(settings_id uuid,revision bigint,replayed boolean)
language plpgsql security definer set search_path='' as $$
declare actor record;receipt app.command_receipts;settings app.commune_settings;next_revision bigint;
 audit_id uuid:=gen_random_uuid();language_code text;changed text[]:=array[]::text[];existing record;
begin
 select * into actor from app.require_staff_admin(p_auth,p_provider,p_digest);
 perform set_config('app.staff_admin_actor',actor.profile_id::text,true);
 perform set_config('app.complaint_actor',actor.profile_id::text,true);
 if p_command_key is null or p_fingerprint is null or octet_length(p_fingerprint)<>32
  or p_phone is null or p_email is null or p_chikaya_url not in ('https://chikaya.ma/','https://www.chikaya.ma/')
  or not app.valid_settings_bundle(p_bundle) then raise exception using errcode='23514',message='Invalid settings';end if;
 select * into receipt from app.command_receipts where actor_id=actor.profile_id and idempotency_key=p_command_key;
 if found then
  if receipt.command_type<>'COMMUNE_SETTINGS_UPDATE' or receipt.request_fingerprint<>p_fingerprint then
   raise exception using errcode='P0409',message='Command conflict';end if;
  return query select receipt.result_resource_id,receipt.result_revision,true;return;
 end if;
 select * into strict settings from app.commune_settings for update;
 if settings.revision<>p_expected_revision then raise exception using errcode='P0812',message='Commune settings changed';end if;
 if settings.contact_phone is distinct from btrim(p_phone) then changed:=array_append(changed,'contact_phone');end if;
 if settings.contact_email is distinct from lower(btrim(p_email)) then changed:=array_append(changed,'contact_email');end if;
 if settings.chikaya_url is distinct from p_chikaya_url then changed:=array_append(changed,'chikaya_url');end if;
 foreach language_code in array array['ar','fr','en'] loop
  select * into existing from app.commune_settings_translations where commune_settings_translations.settings_id=settings.id and language=language_code;
  if existing.commune_name is distinct from btrim(p_bundle->language_code->>'commune_name') then changed:=array_append(changed,language_code||'.commune_name');end if;
  if existing.public_address is distinct from btrim(p_bundle->language_code->>'public_address') then changed:=array_append(changed,language_code||'.public_address');end if;
  if existing.opening_hours is distinct from btrim(p_bundle->language_code->>'opening_hours') then changed:=array_append(changed,language_code||'.opening_hours');end if;
 end loop;
 if cardinality(changed)=0 then raise exception using errcode='23514',message='No settings change';end if;
 next_revision:=settings.revision+1;
 update app.commune_settings set contact_phone=btrim(p_phone),contact_email=lower(btrim(p_email)),chikaya_url=p_chikaya_url,revision=next_revision where id=settings.id;
 foreach language_code in array array['ar','fr','en'] loop
  update app.commune_settings_translations set
   commune_name=btrim(p_bundle->language_code->>'commune_name'),
   public_address=btrim(p_bundle->language_code->>'public_address'),
   opening_hours=btrim(p_bundle->language_code->>'opening_hours')
  where commune_settings_translations.settings_id=settings.id and language=language_code;
 end loop;
 insert into app.audit_events(id,actor_id,actor_type,actor_role,action,resource_type,resource_id,change_summary)
 values(audit_id,actor.profile_id,'USER','ADMIN','SETTINGS_UPDATED','COMMUNE_SETTINGS',settings.id,
  jsonb_build_object('revision',next_revision,'fields',to_jsonb(changed)));
 insert into app.command_receipts(actor_id,idempotency_key,command_type,request_fingerprint,result_resource_type,result_resource_id,result_revision,source_event_id)
 values(actor.profile_id,p_command_key,'COMMUNE_SETTINGS_UPDATE',p_fingerprint,'COMMUNE_SETTINGS',settings.id,next_revision,audit_id);
 return query select settings.id,next_revision,false;
end $$;

revoke all on function app.valid_public_title(text),app.valid_public_body(text),app.valid_public_bundle(jsonb),app.valid_public_setting(text,integer),app.valid_settings_bundle(jsonb) from public,anon,authenticated,service_role,app_web,app_reader;
revoke all on function app.list_admin_public_pages(uuid,uuid,bytea,text),app.read_admin_public_page(uuid,uuid,bytea,text),app.read_admin_public_page_history(uuid,uuid,bytea,text,integer),app.publish_public_page(uuid,uuid,bytea,text,bigint,uuid,bytea,jsonb),app.read_admin_commune_settings(uuid,uuid,bytea),app.read_admin_commune_settings_history(uuid,uuid,bytea,integer),app.update_commune_settings(uuid,uuid,bytea,bigint,uuid,bytea,text,text,text,jsonb) from public,anon,authenticated,service_role,app_reader;
grant execute on function app.list_admin_public_pages(uuid,uuid,bytea,text),app.read_admin_public_page(uuid,uuid,bytea,text),app.read_admin_public_page_history(uuid,uuid,bytea,text,integer),app.publish_public_page(uuid,uuid,bytea,text,bigint,uuid,bytea,jsonb),app.read_admin_commune_settings(uuid,uuid,bytea),app.read_admin_commune_settings_history(uuid,uuid,bytea,integer),app.update_commune_settings(uuid,uuid,bytea,bigint,uuid,bytea,text,text,text,jsonb) to app_web;

revoke create on schema app from app_writer;
commit;
