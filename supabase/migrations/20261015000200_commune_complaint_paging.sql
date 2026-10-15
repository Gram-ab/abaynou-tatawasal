begin;

-- Match the displayed stable sort; retain existing indexes used by other projections.
create index complaint_staff_page_order on app.complaints(submitted_at desc,reference desc);

grant create on schema app to app_writer;
create or replace function app.page_staff_complaints(p_auth uuid,p_provider uuid,p_digest bytea,p_search text default null,p_status text default null,p_location uuid default null,
 p_page integer default 1,p_limit integer default 20)
returns table(reference text,category_labels jsonb,location_labels jsonb,subject text,status text,submitted_at timestamptz,updated_at timestamptz,revision bigint,citizen_name text,total_count bigint)
language plpgsql security definer set search_path='' as $$
declare bounded integer;page_number integer;query_text text;predicates text;statement text;
begin
 perform app.require_complaint_staff(p_auth,p_provider,p_digest,false);
 bounded:=least(greatest(coalesce(p_limit,20),1),50);
 page_number:=least(greatest(coalesce(p_page,1),1),10000);
 query_text:=nullif(btrim(p_search),'');
 if p_status is not null and p_status not in ('SUBMITTED','UNDER_REVIEW','IN_PROCESSING','RESPONSE_SENT','CLOSED','WITHDRAWN','NOT_ACCEPTED') then
  raise exception using errcode='23514',message='Invalid status';
 end if;
 -- Only fixed SQL fragments are assembled. All supplied values stay bound parameters.
 -- Per-call planning avoids a generic OR/NULL plan for selective filters.
 predicates:='where true';
 if p_status is not null then predicates:=predicates||' and c.status=$1';end if;
 if p_location is not null then predicates:=predicates||' and c.location_id=$2';end if;
 if query_text is null then
  -- Count narrow complaint rows without joining/sorting all Citizen and snapshot data.
  -- Page IDs use the stable order index; only the requested page is hydrated.
  statement:=format('with totals as materialized (select count(*) total from app.complaints c %1$s),
   selected as materialized (select c.id from app.complaints c %1$s order by c.submitted_at desc,c.reference desc limit $4 offset $5)
   select c.reference,c.category_labels_snapshot,c.location_labels_snapshot,c.subject,c.status,c.submitted_at,c.updated_at,c.revision,p.full_name,t.total
   from selected s join app.complaints c on c.id=s.id join app.application_profiles p on p.id=c.citizen_id cross join totals t
   order by c.submitted_at desc,c.reference desc',predicates);
 else
  -- Preserve ILIKE substring/wildcard behavior, including Arabic and Citizen names.
  -- Evaluate matching Citizen IDs once; keep only narrow IDs/order keys for count/page.
  statement:=format('with matching_citizens as materialized (select p.id from app.application_profiles p where p.full_name ilike $3),
   matched as materialized (select c.id,c.submitted_at,c.reference from app.complaints c %1$s
    and (c.reference ilike $3 or c.subject ilike $3 or c.citizen_id in (select m.id from matching_citizens m))),
   totals as materialized (select count(*) total from matched),
   selected as materialized (select m.id from matched m order by m.submitted_at desc,m.reference desc limit $4 offset $5)
   select c.reference,c.category_labels_snapshot,c.location_labels_snapshot,c.subject,c.status,c.submitted_at,c.updated_at,c.revision,p.full_name,t.total
   from selected s join app.complaints c on c.id=s.id join app.application_profiles p on p.id=c.citizen_id cross join totals t
   order by c.submitted_at desc,c.reference desc',predicates);
 end if;
 -- Both count and page are evaluated in one statement/snapshot. Existing RLS applies.
 return query execute statement using p_status,p_location,'%'||query_text||'%',bounded,(page_number-1)*bounded;
end $$;
alter function app.page_staff_complaints(uuid,uuid,bytea,text,text,uuid,integer,integer) owner to app_writer;
revoke all on function app.page_staff_complaints(uuid,uuid,bytea,text,text,uuid,integer,integer) from public,anon,authenticated,service_role,app_reader;
grant execute on function app.page_staff_complaints(uuid,uuid,bytea,text,text,uuid,integer,integer) to app_web;
revoke create on schema app from app_writer;
commit;
