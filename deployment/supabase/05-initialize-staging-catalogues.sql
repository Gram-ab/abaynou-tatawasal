-- HOSTED STAGING ONLY: vdpflzhsohhvvwdrjzhd (Ireland).
-- This WRITES the 7 canonical categories / 6 locations from the approved
-- DEV-04A development fixture. Production wording still needs Commune approval.
-- Audit source LOCAL_CANONICAL_FIXTURE deliberately identifies that existing
-- fixture provenance; this is not a new official production bootstrap source.
-- No accounts, complaints, credentials, settings or legal publications are added.
-- Run only after all 26 reviewed migrations. Existing entries are not overwritten.
begin;
set local statement_timeout='15s';
do $catalogue_seed$
declare
 items jsonb := '[{"kind":"category","code":"CLEANLINESS_WASTE","labels":{"en":"Cleanliness and waste","fr":"Propreté et déchets","ar":"النظافة والنفايات"},"id":"30000000-0000-4000-8000-000000000001","isActive":true},{"kind":"category","code":"PUBLIC_LIGHTING","labels":{"en":"Public lighting","fr":"Éclairage public","ar":"الإنارة العمومية"},"id":"30000000-0000-4000-8000-000000000002","isActive":true},{"kind":"category","code":"ROADS_SIDEWALKS","labels":{"en":"Roads and sidewalks","fr":"Voirie et trottoirs","ar":"الطرق والأرصفة"},"id":"30000000-0000-4000-8000-000000000003","isActive":true},{"kind":"category","code":"DRAINAGE_WATER","labels":{"en":"Drainage and water","fr":"Assainissement et eau","ar":"الصرف والمياه"},"id":"30000000-0000-4000-8000-000000000004","isActive":true},{"kind":"category","code":"COMMUNE_FACILITIES","labels":{"en":"Commune facilities","fr":"Équipements communaux","ar":"مرافق الجماعة"},"id":"30000000-0000-4000-8000-000000000005","isActive":true},{"kind":"category","code":"LOCAL_NUISANCE","labels":{"en":"Local nuisance / disturbance","fr":"Nuisances et troubles locaux","ar":"الإزعاجات والاضطرابات المحلية"},"id":"30000000-0000-4000-8000-000000000006","isActive":true},{"kind":"category","code":"OTHER_LOCAL_ISSUE","labels":{"en":"Other local issue","fr":"Autre problème local","ar":"مشكلة محلية أخرى"},"id":"30000000-0000-4000-8000-000000000007","isActive":true},{"kind":"location","id":"40000000-0000-4000-8000-000000000001","code":"LOC_001","isActive":true,"labels":{"ar":"دوار أباينو"}},{"kind":"location","id":"40000000-0000-4000-8000-000000000002","code":"LOC_002","isActive":true,"labels":{"ar":"دوار ايكيسل"}},{"kind":"location","id":"40000000-0000-4000-8000-000000000003","code":"LOC_003","isActive":true,"labels":{"ar":"دوار توتلين"}},{"kind":"location","id":"40000000-0000-4000-8000-000000000004","code":"LOC_004","isActive":true,"labels":{"ar":"دوار أبوقال"}},{"kind":"location","id":"40000000-0000-4000-8000-000000000005","code":"LOC_005","isActive":true,"labels":{"ar":"دوار إد العربا"}},{"kind":"location","id":"40000000-0000-4000-8000-000000000006","code":"LOC_006","isActive":true,"labels":{"ar":"دوار تبولوت"}}]'::jsonb;
 item jsonb; kind text; parent_name text; child_name text; foreign_key text;
 target_id uuid; target_code text; match_count bigint; identity_matches boolean;
begin
 if current_user <> 'postgres' then raise exception 'STAGING_INITIALIZER_REQUIRES_OWNER'; end if;
 if not exists(select 1 from pg_catalog.pg_roles where rolname=current_user and (rolsuper or rolbypassrls)) then
  raise exception 'STAGING_INITIALIZER_REQUIRES_OWNER_RLS_BYPASS';
 end if;
 if not exists(select 1 from supabase_migrations.schema_migrations where version='20261015000200') then
  raise exception 'COMPLETE_REVIEWED_MIGRATIONS_FIRST';
 end if;
 perform pg_advisory_xact_lock(71919004);
 for item in select value from jsonb_array_elements(items) loop
  kind:=item->>'kind';target_id:=(item->>'id')::uuid;target_code:=item->>'code';
  parent_name:=case kind when 'category' then 'categories' else 'locations' end;
  child_name:=case kind when 'category' then 'category_translations' else 'location_translations' end;
  foreign_key:=case kind when 'category' then 'category_id' else 'location_id' end;
  execute format('select count(*),bool_and(id=$1 and code=$2) from app.%I where id=$1 or code=$2',parent_name)
   into match_count,identity_matches using target_id,target_code;
  if match_count>0 then
   if match_count<>1 or identity_matches is distinct from true then raise exception 'CANONICAL_IDENTITY_CONFLICT'; end if;
   continue;
  end if;
  execute format('insert into app.%I(id,code,is_active) values($1,$2,$3)',parent_name)
   using target_id,target_code,(item->>'isActive')::boolean;
  execute format('insert into app.%I(%I,language,label) select $1,key,value from jsonb_each_text($2)',child_name,foreign_key)
   using target_id,item->'labels';
  insert into app.audit_events(actor_type,action,resource_type,resource_id,change_summary)
   values('SYSTEM',case kind when 'category' then 'CATEGORY_CREATED' else 'LOCATION_CREATED' end,
    case kind when 'category' then 'CATEGORY' else 'LOCATION' end,target_id,'{"source":"LOCAL_CANONICAL_FIXTURE"}'::jsonb);
 end loop;
end $catalogue_seed$;
commit;

-- The last result is the active public submission catalogue, not private data.
select count(*) filter(where kind='category') as active_categories,
       count(*) filter(where kind='location') as active_locations
from app.read_submission_catalogues();
