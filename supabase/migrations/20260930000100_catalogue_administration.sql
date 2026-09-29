begin;
grant create on schema app to app_writer;

alter table app.command_receipts drop constraint command_receipts_command_type_check;
alter table app.command_receipts add constraint command_receipts_command_type_check check(command_type in (
 'COMPLAINT_SUBMIT','COMPLAINT_EDIT','COMPLAINT_WITHDRAW','COMPLAINT_START_REVIEW','COMPLAINT_START_PROCESSING',
 'COMPLAINT_SEND_RESPONSE','COMPLAINT_NOT_ACCEPT','COMPLAINT_CORRECT_RESPONSE','COMPLAINT_CLOSE',
 'CATEGORY_CREATE','CATEGORY_UPDATE','CATEGORY_SET_ACTIVE','LOCATION_CREATE','LOCATION_UPDATE','LOCATION_SET_ACTIVE'));
alter table app.command_receipts drop constraint command_receipts_result_resource_type_check;
alter table app.command_receipts add constraint command_receipts_result_resource_type_check check(result_resource_type in ('COMPLAINT','CATEGORY','LOCATION'));

grant insert,update(is_active,revision,updated_at) on app.categories,app.locations to app_writer;
grant insert,update(label) on app.category_translations,app.location_translations to app_writer;

create policy category_admin_all on app.categories to app_writer
 using(current_setting('app.staff_admin_actor',true)<>'') with check(current_setting('app.staff_admin_actor',true)<>'');
create policy location_admin_all on app.locations to app_writer
 using(current_setting('app.staff_admin_actor',true)<>'') with check(current_setting('app.staff_admin_actor',true)<>'');
create policy category_translation_admin_all on app.category_translations to app_writer
 using(current_setting('app.staff_admin_actor',true)<>'') with check(current_setting('app.staff_admin_actor',true)<>'');
create policy location_translation_admin_all on app.location_translations to app_writer
 using(current_setting('app.staff_admin_actor',true)<>'') with check(current_setting('app.staff_admin_actor',true)<>'');

-- Citizens may see only the inactive value already attached to their own complaint.
create policy category_current_owner on app.categories for select to app_writer using(exists(
 select 1 from app.complaints c where c.category_id=categories.id and c.citizen_id=nullif(current_setting('app.complaint_actor',true),'')::uuid));
create policy location_current_owner on app.locations for select to app_writer using(exists(
 select 1 from app.complaints c where c.location_id=locations.id and c.citizen_id=nullif(current_setting('app.complaint_actor',true),'')::uuid));
create policy category_translation_current_owner on app.category_translations for select to app_writer using(exists(
 select 1 from app.complaints c where c.category_id=category_translations.category_id and c.citizen_id=nullif(current_setting('app.complaint_actor',true),'')::uuid));
create policy location_translation_current_owner on app.location_translations for select to app_writer using(exists(
 select 1 from app.complaints c where c.location_id=location_translations.location_id and c.citizen_id=nullif(current_setting('app.complaint_actor',true),'')::uuid));

-- Staff receive inactive values only when an authorized complaint references them.
create policy category_staff_history on app.categories for select to app_writer using(
 current_setting('app.complaint_staff',true)='true' and exists(select 1 from app.complaints c where c.category_id=categories.id));
create policy location_staff_history on app.locations for select to app_writer using(
 current_setting('app.complaint_staff',true)='true' and exists(select 1 from app.complaints c where c.location_id=locations.id));
create policy category_translation_staff_history on app.category_translations for select to app_writer using(
 current_setting('app.complaint_staff',true)='true' and exists(select 1 from app.complaints c where c.category_id=category_translations.category_id));
create policy location_translation_staff_history on app.location_translations for select to app_writer using(
 current_setting('app.complaint_staff',true)='true' and exists(select 1 from app.complaints c where c.location_id=location_translations.location_id));

create policy catalogue_admin_audit_insert on app.audit_events for insert to app_writer with check(
 actor_id=nullif(current_setting('app.staff_admin_actor',true),'')::uuid and actor_type='USER' and actor_role='ADMIN'
 and ((resource_type='CATEGORY' and action in ('CATEGORY_CREATED','CATEGORY_UPDATED','CATEGORY_ACTIVATED','CATEGORY_DEACTIVATED'))
 or (resource_type='LOCATION' and action in ('LOCATION_CREATED','LOCATION_UPDATED','LOCATION_ACTIVATED','LOCATION_DEACTIVATED'))));

create function app.valid_catalogue_label(value text) returns boolean language sql immutable set search_path='' as $$
 select value is not null and length(value)<=200 and length(app.complaint_effective_text(value))>0
$$;
create function app.new_catalogue_code(prefix text) returns text language sql volatile set search_path='' as $$
 select prefix||upper(encode(extensions.gen_random_bytes(6),'hex'))
$$;

create function app.list_admin_catalogues(p_auth uuid,p_provider uuid,p_digest bytea,p_kind text,p_query text,p_status text)
returns table(id uuid,code text,is_active boolean,labels jsonb,revision bigint,created_at timestamptz,updated_at timestamptz)
language plpgsql security definer set search_path='' as $$
declare actor record;
begin
 select * into actor from app.require_staff_admin(p_auth,p_provider,p_digest);
 perform set_config('app.staff_admin_actor',actor.profile_id::text,true);
 if p_kind not in ('CATEGORY','LOCATION') or p_status not in ('ALL','ACTIVE','INACTIVE') then raise exception using errcode='22023',message='Invalid catalogue query';end if;
 if p_kind='CATEGORY' then
  return query select c.id,c.code,c.is_active,coalesce(jsonb_object_agg(t.language,t.label) filter(where t.language is not null),'{}'::jsonb),c.revision,c.created_at,c.updated_at
  from app.categories c left join app.category_translations t on t.category_id=c.id
  where (p_status='ALL' or c.is_active=(p_status='ACTIVE')) and (nullif(app.complaint_effective_text(coalesce(p_query,'')),'') is null
   or c.code ilike '%'||app.complaint_effective_text(p_query)||'%' or exists(select 1 from app.category_translations x where x.category_id=c.id and x.label ilike '%'||app.complaint_effective_text(p_query)||'%'))
  group by c.id order by c.created_at,c.id;
 else
  return query select l.id,l.code,l.is_active,coalesce(jsonb_object_agg(t.language,t.label) filter(where t.language is not null),'{}'::jsonb),l.revision,l.created_at,l.updated_at
  from app.locations l left join app.location_translations t on t.location_id=l.id
  where (p_status='ALL' or l.is_active=(p_status='ACTIVE')) and (nullif(app.complaint_effective_text(coalesce(p_query,'')),'') is null
   or l.code ilike '%'||app.complaint_effective_text(p_query)||'%' or exists(select 1 from app.location_translations x where x.location_id=l.id and x.label ilike '%'||app.complaint_effective_text(p_query)||'%'))
  group by l.id order by l.created_at,l.id;
 end if;
end $$;

create function app.read_admin_catalogue(p_auth uuid,p_provider uuid,p_digest bytea,p_kind text,p_id uuid)
returns table(id uuid,code text,is_active boolean,labels jsonb,revision bigint,created_at timestamptz,updated_at timestamptz)
language plpgsql security definer set search_path='' as $$
declare actor record;
begin
 select * into actor from app.require_staff_admin(p_auth,p_provider,p_digest);perform set_config('app.staff_admin_actor',actor.profile_id::text,true);
 if p_kind='CATEGORY' then return query select c.id,c.code,c.is_active,coalesce((select jsonb_object_agg(t.language,t.label) from app.category_translations t where t.category_id=c.id),'{}'::jsonb),c.revision,c.created_at,c.updated_at from app.categories c where c.id=p_id;
 elsif p_kind='LOCATION' then return query select l.id,l.code,l.is_active,coalesce((select jsonb_object_agg(t.language,t.label) from app.location_translations t where t.location_id=l.id),'{}'::jsonb),l.revision,l.created_at,l.updated_at from app.locations l where l.id=p_id;
 else raise exception using errcode='22023',message='Invalid catalogue kind';end if;
end $$;

create function app.read_admin_catalogue_audit(p_auth uuid,p_provider uuid,p_digest bytea,p_kind text,p_id uuid,p_limit integer default 30)
returns table(action text,change_summary jsonb,occurred_at timestamptz) language plpgsql security definer set search_path='' as $$
declare actor record;resource text;
begin
 select * into actor from app.require_staff_admin(p_auth,p_provider,p_digest);resource:=case p_kind when 'CATEGORY' then 'CATEGORY' when 'LOCATION' then 'LOCATION' else null end;
 if resource is null then raise exception using errcode='22023',message='Invalid catalogue kind';end if;
 return query select a.action,a.change_summary,a.occurred_at from app.audit_events a where a.resource_type=resource and a.resource_id=p_id order by a.occurred_at desc,a.id desc limit least(greatest(coalesce(p_limit,30),1),100);
end $$;

create function app.create_catalogue(p_auth uuid,p_provider uuid,p_digest bytea,p_kind text,p_key uuid,p_fingerprint bytea,p_ar text,p_fr text,p_en text)
returns table(id uuid,code text,revision bigint,replayed boolean) language plpgsql security definer set search_path='' as $$
declare actor record;r app.command_receipts;target uuid;candidate text;attempt integer;created boolean:=false;a uuid:=gen_random_uuid();command text;resource text;event text;labels text[]:=array['ar'];
begin
 select * into actor from app.require_staff_admin(p_auth,p_provider,p_digest);perform set_config('app.staff_admin_actor',actor.profile_id::text,true);perform set_config('app.complaint_actor',actor.profile_id::text,true);
 if p_kind not in ('CATEGORY','LOCATION') or p_key is null or p_fingerprint is null or octet_length(p_fingerprint)<>32 or not app.valid_catalogue_label(p_ar)
  or (p_fr is not null and not app.valid_catalogue_label(p_fr)) or (p_en is not null and not app.valid_catalogue_label(p_en)) then raise exception using errcode='23514',message='Invalid catalogue';end if;
 command:=p_kind||'_CREATE';resource:=p_kind;event:=p_kind||'_CREATED';
 select * into r from app.command_receipts where actor_id=actor.profile_id and idempotency_key=p_key;
 if found then if r.command_type<>command or r.request_fingerprint<>p_fingerprint then raise exception using errcode='P0409',message='Command conflict';end if;
  if p_kind='CATEGORY' then return query select c.id,c.code,r.result_revision,true from app.categories c where c.id=r.result_resource_id;
  else return query select l.id,l.code,r.result_revision,true from app.locations l where l.id=r.result_resource_id;end if;return;end if;
 for attempt in 1..10 loop
  target:=gen_random_uuid();candidate:=app.new_catalogue_code(case p_kind when 'CATEGORY' then 'CAT_' else 'LOC_' end);
  if p_kind='CATEGORY' then insert into app.categories(id,code,is_active) values(target,candidate,false) on conflict do nothing;
  else insert into app.locations(id,code,is_active) values(target,candidate,false) on conflict do nothing;end if;
  if found then created:=true;exit;end if;
 end loop;
 if not created then raise exception using errcode='40001',message='Catalogue identity retry required';end if;
 if p_fr is not null then labels:=array_append(labels,'fr');end if;if p_en is not null then labels:=array_append(labels,'en');end if;
 if p_kind='CATEGORY' then
  insert into app.category_translations(category_id,language,label) values(target,'ar',p_ar);
  if p_fr is not null then insert into app.category_translations values(target,'fr',p_fr);end if;if p_en is not null then insert into app.category_translations values(target,'en',p_en);end if;
 else
  insert into app.location_translations(location_id,language,label) values(target,'ar',p_ar);
  if p_fr is not null then insert into app.location_translations values(target,'fr',p_fr);end if;if p_en is not null then insert into app.location_translations values(target,'en',p_en);end if;
 end if;
 insert into app.audit_events(id,actor_id,actor_type,actor_role,action,resource_type,resource_id,change_summary) values(a,actor.profile_id,'USER','ADMIN',event,resource,target,jsonb_build_object('code',candidate,'locales',to_jsonb(labels),'active',false));
 insert into app.command_receipts(actor_id,idempotency_key,command_type,request_fingerprint,result_resource_type,result_resource_id,result_revision,source_event_id) values(actor.profile_id,p_key,command,p_fingerprint,resource,target,1,a);
 return query select target,candidate,1::bigint,false;
end $$;

create function app.update_catalogue(p_auth uuid,p_provider uuid,p_digest bytea,p_kind text,p_id uuid,p_expected bigint,p_key uuid,p_fingerprint bytea,p_ar text,p_fr text,p_en text)
returns table(id uuid,revision bigint,replayed boolean) language plpgsql security definer set search_path='' as $$
declare actor record;r app.command_receipts;current_revision bigint;current_code text;next bigint;a uuid:=gen_random_uuid();command text;resource text;event text;changed text[]:=array[]::text[];existing text;
begin
 select * into actor from app.require_staff_admin(p_auth,p_provider,p_digest);perform set_config('app.staff_admin_actor',actor.profile_id::text,true);perform set_config('app.complaint_actor',actor.profile_id::text,true);
 if p_kind not in ('CATEGORY','LOCATION') or not app.valid_catalogue_label(p_ar) or (p_fr is not null and not app.valid_catalogue_label(p_fr)) or (p_en is not null and not app.valid_catalogue_label(p_en)) then raise exception using errcode='23514',message='Invalid catalogue';end if;
 command:=p_kind||'_UPDATE';resource:=p_kind;event:=p_kind||'_UPDATED';select * into r from app.command_receipts where actor_id=actor.profile_id and idempotency_key=p_key;
 if found then if r.command_type<>command or r.request_fingerprint<>p_fingerprint then raise exception using errcode='P0409',message='Command conflict';end if;return query select r.result_resource_id,r.result_revision,true;return;end if;
 if p_kind='CATEGORY' then select categories.revision,categories.code into current_revision,current_code from app.categories where categories.id=p_id for update;
 else select locations.revision,locations.code into current_revision,current_code from app.locations where locations.id=p_id for update;end if;
 if current_revision is null then raise exception using errcode='P0804',message='Catalogue unavailable';end if;if current_revision<>p_expected then raise exception using errcode='P0812',message='Catalogue changed';end if;
 foreach existing in array array['ar','fr','en'] loop
  if existing='ar' then
   if p_kind='CATEGORY' then if (select label from app.category_translations where category_id=p_id and language='ar') is distinct from p_ar then changed:=array_append(changed,'ar');end if;
   else if (select label from app.location_translations where location_id=p_id and language='ar') is distinct from p_ar then changed:=array_append(changed,'ar');end if;end if;
  elsif existing='fr' and p_fr is not null then
   if p_kind='CATEGORY' then if (select label from app.category_translations where category_id=p_id and language='fr') is distinct from p_fr then changed:=array_append(changed,'fr');end if;
   else if (select label from app.location_translations where location_id=p_id and language='fr') is distinct from p_fr then changed:=array_append(changed,'fr');end if;end if;
  elsif existing='en' and p_en is not null then
   if p_kind='CATEGORY' then if (select label from app.category_translations where category_id=p_id and language='en') is distinct from p_en then changed:=array_append(changed,'en');end if;
   else if (select label from app.location_translations where location_id=p_id and language='en') is distinct from p_en then changed:=array_append(changed,'en');end if;end if;
  end if;
 end loop;
 if cardinality(changed)=0 then raise exception using errcode='23514',message='No catalogue change';end if;
 if p_kind='CATEGORY' then
  insert into app.category_translations values(p_id,'ar',p_ar) on conflict(category_id,language) do update set label=excluded.label;
  if p_fr is not null then insert into app.category_translations values(p_id,'fr',p_fr) on conflict(category_id,language) do update set label=excluded.label;end if;
  if p_en is not null then insert into app.category_translations values(p_id,'en',p_en) on conflict(category_id,language) do update set label=excluded.label;end if;
  update app.categories set revision=categories.revision+1 where categories.id=p_id returning categories.revision into next;
 else
  insert into app.location_translations values(p_id,'ar',p_ar) on conflict(location_id,language) do update set label=excluded.label;
  if p_fr is not null then insert into app.location_translations values(p_id,'fr',p_fr) on conflict(location_id,language) do update set label=excluded.label;end if;
  if p_en is not null then insert into app.location_translations values(p_id,'en',p_en) on conflict(location_id,language) do update set label=excluded.label;end if;
  update app.locations set revision=locations.revision+1 where locations.id=p_id returning locations.revision into next;
 end if;
 insert into app.audit_events(id,actor_id,actor_type,actor_role,action,resource_type,resource_id,change_summary) values(a,actor.profile_id,'USER','ADMIN',event,resource,p_id,jsonb_build_object('code',current_code,'locales',to_jsonb(changed)));
 insert into app.command_receipts(actor_id,idempotency_key,command_type,request_fingerprint,result_resource_type,result_resource_id,result_revision,source_event_id) values(actor.profile_id,p_key,command,p_fingerprint,resource,p_id,next,a);
 return query select p_id,next,false;
end $$;

create function app.set_catalogue_active(p_auth uuid,p_provider uuid,p_digest bytea,p_kind text,p_id uuid,p_expected bigint,p_key uuid,p_fingerprint bytea,p_active boolean)
returns table(id uuid,revision bigint,replayed boolean) language plpgsql security definer set search_path='' as $$
declare actor record;r app.command_receipts;current_revision bigint;current_active boolean;current_code text;next bigint;a uuid:=gen_random_uuid();command text;resource text;event text;
begin
 select * into actor from app.require_staff_admin(p_auth,p_provider,p_digest);perform set_config('app.staff_admin_actor',actor.profile_id::text,true);perform set_config('app.complaint_actor',actor.profile_id::text,true);
 if p_kind not in ('CATEGORY','LOCATION') then raise exception using errcode='23514',message='Invalid catalogue';end if;command:=p_kind||'_SET_ACTIVE';resource:=p_kind;
 select * into r from app.command_receipts where actor_id=actor.profile_id and idempotency_key=p_key;if found then if r.command_type<>command or r.request_fingerprint<>p_fingerprint then raise exception using errcode='P0409',message='Command conflict';end if;return query select r.result_resource_id,r.result_revision,true;return;end if;
 if p_kind='CATEGORY' then select categories.revision,categories.is_active,categories.code into current_revision,current_active,current_code from app.categories where categories.id=p_id for update;
 else select locations.revision,locations.is_active,locations.code into current_revision,current_active,current_code from app.locations where locations.id=p_id for update;end if;
 if current_revision is null then raise exception using errcode='P0804',message='Catalogue unavailable';end if;if current_revision<>p_expected then raise exception using errcode='P0812',message='Catalogue changed';end if;if current_active=p_active then raise exception using errcode='23514',message='Catalogue state unchanged';end if;
 if p_active and p_kind='CATEGORY' and (select count(*)=3 and bool_and(app.valid_catalogue_label(label)) from app.category_translations where category_id=p_id and language in ('ar','fr','en')) is not true then raise exception using errcode='P0801',message='Category translations incomplete';end if;
 if p_active and p_kind='LOCATION' and not exists(select 1 from app.location_translations where location_id=p_id and language='ar' and app.valid_catalogue_label(label)) then raise exception using errcode='P0802',message='Arabic location label required';end if;
 if p_kind='CATEGORY' then update app.categories set is_active=p_active,revision=categories.revision+1 where categories.id=p_id returning categories.revision into next;
 else update app.locations set is_active=p_active,revision=locations.revision+1 where locations.id=p_id returning locations.revision into next;end if;
 event:=p_kind||case when p_active then '_ACTIVATED' else '_DEACTIVATED' end;
 insert into app.audit_events(id,actor_id,actor_type,actor_role,action,resource_type,resource_id,change_summary) values(a,actor.profile_id,'USER','ADMIN',event,resource,p_id,jsonb_build_object('code',current_code,'active',p_active));
 insert into app.command_receipts(actor_id,idempotency_key,command_type,request_fingerprint,result_resource_type,result_resource_id,result_revision,source_event_id) values(actor.profile_id,p_key,command,p_fingerprint,resource,p_id,next,a);
 return query select p_id,next,false;
end $$;

create function app.read_own_edit_catalogues(p_auth uuid,p_provider uuid,p_digest bytea,p_reference text)
returns table(kind text,id uuid,code text,labels jsonb,is_active boolean,is_current boolean)
language plpgsql security definer set search_path='' as $$
declare actor uuid;c app.complaints;
begin
 actor:=app.require_complaint_citizen(p_auth,p_provider,p_digest,false);select * into c from app.complaints where reference=p_reference and citizen_id=actor;
 if not found then return;end if;
 return query select 'category',x.id,x.code,case when x.id=c.category_id then c.category_labels_snapshot else (select jsonb_object_agg(t.language,t.label) from app.category_translations t where t.category_id=x.id) end,x.is_active,x.id=c.category_id
 from app.categories x where (x.is_active and (select count(*) from app.category_translations t where t.category_id=x.id)=3) or x.id=c.category_id
 union all
 select 'location',x.id,x.code,case when x.id=c.location_id then c.location_labels_snapshot else (select jsonb_object_agg(t.language,t.label) from app.location_translations t where t.location_id=x.id) end,x.is_active,x.id=c.location_id
 from app.locations x where (x.is_active and exists(select 1 from app.location_translations t where t.location_id=x.id and t.language='ar')) or x.id=c.location_id;
end $$;

create function app.read_staff_location_filters(p_auth uuid,p_provider uuid,p_digest bytea)
returns table(id uuid,labels jsonb,is_active boolean) language plpgsql security definer set search_path='' as $$
declare actor uuid;
begin
 actor:=app.require_complaint_staff(p_auth,p_provider,p_digest,false);
 return query select l.id,case when l.is_active then (select jsonb_object_agg(t.language,t.label) from app.location_translations t where t.location_id=l.id)
 else (select c.location_labels_snapshot from app.complaints c where c.location_id=l.id order by c.submitted_at desc,c.id desc limit 1) end,l.is_active
 from app.locations l where (l.is_active and exists(select 1 from app.location_translations t where t.location_id=l.id and t.language='ar')) or exists(select 1 from app.complaints c where c.location_id=l.id);
end $$;

create or replace function app.edit_own_complaint(p_auth uuid,p_provider uuid,p_digest bytea,p_reference text,p_expected bigint,p_key uuid,p_fingerprint bytea,
 p_category uuid,p_location uuid,p_subject text,p_description text,p_clarification text)
returns table(reference text,revision bigint,replayed boolean) language plpgsql security definer set search_path='' as $$
declare actor uuid;c app.complaints;r app.command_receipts;category_labels jsonb;location_labels jsonb;audit_id uuid:=gen_random_uuid();next_revision bigint;
begin actor:=app.require_complaint_citizen(p_auth,p_provider,p_digest,true);
 select * into r from app.command_receipts where actor_id=actor and idempotency_key=p_key;if found then if r.command_type<>'COMPLAINT_EDIT' or r.request_fingerprint<>p_fingerprint then raise exception using errcode='P0409',message='Command conflict';end if;return query select x.reference,r.result_revision,true from app.complaints x where x.id=r.result_resource_id;return;end if;
 select * into c from app.complaints where complaints.reference=p_reference and citizen_id=actor for update;if not found then raise exception using errcode='P0404',message='Complaint unavailable';end if;if c.status<>'SUBMITTED' or c.revision<>p_expected then raise exception using errcode='P0412',message='Complaint changed';end if;
 if p_category=c.category_id then category_labels:=c.category_labels_snapshot;else perform 1 from app.categories where id=p_category and is_active for share;if not found then raise exception using errcode='P0401',message='Category unavailable';end if;select jsonb_object_agg(language,label) into category_labels from app.category_translations where category_id=p_category;if category_labels is null or not(category_labels ?& array['ar','fr','en']) then raise exception using errcode='P0401',message='Category unavailable';end if;end if;
 if p_location=c.location_id then location_labels:=c.location_labels_snapshot;else perform 1 from app.locations where id=p_location and is_active for share;if not found then raise exception using errcode='P0402',message='Location unavailable';end if;select jsonb_object_agg(language,label) into location_labels from app.location_translations where location_id=p_location;if location_labels is null or not(location_labels ? 'ar') then raise exception using errcode='P0402',message='Location unavailable';end if;end if;
 if app.complaint_effective_text(p_clarification)='' then p_clarification:=null;end if;next_revision:=c.revision+1;
 update app.complaints set category_id=p_category,category_labels_snapshot=category_labels,location_id=p_location,location_labels_snapshot=location_labels,subject=p_subject,description=p_description,location_clarification=p_clarification,revision=next_revision,updated_at=transaction_timestamp() where id=c.id;
 insert into app.audit_events(id,actor_id,actor_type,actor_role,action,resource_type,resource_id,change_summary) values(audit_id,actor,'USER','CITIZEN','COMPLAINT_EDITED','COMPLAINT',c.id,jsonb_build_object('fields',jsonb_build_array('category','subject','description','location','clarification')));
 insert into app.complaint_events(audit_event_id,complaint_id,complaint_revision,event_type,previous_status,new_status,edit_delta) values(audit_id,c.id,next_revision,'EDITED','SUBMITTED','SUBMITTED',jsonb_build_object('category',jsonb_build_object('from',c.category_labels_snapshot,'to',category_labels),'subject',jsonb_build_object('from',c.subject,'to',p_subject),'description',jsonb_build_object('from',c.description,'to',p_description),'location',jsonb_build_object('from',c.location_labels_snapshot,'to',location_labels),'clarification',jsonb_build_object('from',c.location_clarification,'to',p_clarification)));
 insert into app.command_receipts(actor_id,idempotency_key,command_type,request_fingerprint,result_resource_type,result_resource_id,result_revision,source_event_id) values(actor,p_key,'COMPLAINT_EDIT',p_fingerprint,'COMPLAINT',c.id,next_revision,audit_id);
 return query select c.reference,next_revision,false;end $$;

do $$ declare f text;begin foreach f in array array[
 'list_admin_catalogues(uuid,uuid,bytea,text,text,text)','read_admin_catalogue(uuid,uuid,bytea,text,uuid)','read_admin_catalogue_audit(uuid,uuid,bytea,text,uuid,integer)',
 'create_catalogue(uuid,uuid,bytea,text,uuid,bytea,text,text,text)','update_catalogue(uuid,uuid,bytea,text,uuid,bigint,uuid,bytea,text,text,text)',
 'set_catalogue_active(uuid,uuid,bytea,text,uuid,bigint,uuid,bytea,boolean)','read_own_edit_catalogues(uuid,uuid,bytea,text)','read_staff_location_filters(uuid,uuid,bytea)'
 ] loop execute 'alter function app.'||f||' owner to app_writer';execute 'revoke all on function app.'||f||' from public,anon,authenticated,service_role,app_reader';execute 'grant execute on function app.'||f||' to app_web';end loop;end $$;
alter function app.valid_catalogue_label(text) owner to app_writer;alter function app.new_catalogue_code(text) owner to app_writer;
revoke all on function app.valid_catalogue_label(text),app.new_catalogue_code(text) from public,anon,authenticated,service_role,app_web,app_reader;
revoke create on schema app from app_writer;
commit;
