-- REVIEW ARTIFACT ONLY. Not a registered/applied migration.
-- Integrate with the backend's migration history after independent review.
begin;

-- Receipts survive draft deletion: a lost response must never recreate a copy.
-- No FK to journey/source deliberately: either can subsequently be deleted.
create table private.selected_copy_requests (
  draft_id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  source_id uuid not null,
  selected_stop_ids uuid[] not null,
  created_at timestamptz not null default now(),
  check (cardinality(selected_stop_ids) between 1 and 50)
);
alter table private.selected_copy_requests enable row level security;
revoke all on private.selected_copy_requests from public, anon, authenticated;
grant select, insert on private.selected_copy_requests to authenticated;
create policy selected_copy_requests_read_own on private.selected_copy_requests
  for select to authenticated using (user_id = (select auth.uid()));
create policy selected_copy_requests_insert_own on private.selected_copy_requests
  for insert to authenticated with check (user_id = (select auth.uid()));

create function public.copy_journey_selected(source_id uuid, selected_stop_ids uuid[], draft_id uuid)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  request_ids uuid[];
  receipt private.selected_copy_requests%rowtype;
  source jsonb;
begin
  if uid is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if source_id is null or draft_id is null or draft_id = source_id
    or selected_stop_ids is null or cardinality(selected_stop_ids) not between 1 and 50
    or array_position(selected_stop_ids, null) is not null
    or array_ndims(selected_stop_ids) <> 1
    or (select count(distinct id) from unnest(selected_stop_ids) id) <> cardinality(selected_stop_ids)
  then raise exception 'Invalid selected stops' using errcode = '22023'; end if;
  -- Canonical set for replay; caller order never determines the journey order.
  select array_agg(id order by id) into request_ids from unnest(selected_stop_ids) id;
  -- Serialize this idempotency key, including simultaneous network retries.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(draft_id::text, 0));
  select r.* into receipt from private.selected_copy_requests r where r.draft_id = copy_journey_selected.draft_id;
  if found then
    if receipt.user_id <> uid or receipt.source_id <> source_id or receipt.selected_stop_ids <> request_ids then
      raise exception 'Copy request does not match its original selection' using errcode = '22023';
    end if;
    -- Return edited/published copies too; replay must not overwrite them.
    if not exists(select 1 from public.journeys j where j.id = draft_id and j.user_id = uid
      and j.copied_from_journey_id = source_id) then
      raise exception 'Previous copy is no longer available; check your journeys' using errcode = 'P0002';
    end if;
    return draft_id;
  end if;

  -- One statement snapshot of published metadata and exactly the requested stops.
  -- Mobile public normalization excludes demo journeys; retain that boundary.
  select to_jsonb(j) || jsonb_build_object('stops', coalesce((
    select jsonb_agg(to_jsonb(s) order by s.sequence, s.id)
    from public.journey_stops s where s.journey_id = j.id and s.id = any(request_ids)
  ), '[]'::jsonb)) into source
  from public.journeys j where j.id = source_id and j.status = 'published' and j.is_demo = false;
  if not found then raise exception 'Published journey not found' using errcode = 'P0002'; end if;
  if jsonb_array_length(source->'stops') <> cardinality(request_ids) then
    raise exception 'Selection contains unavailable stops' using errcode = '22023';
  end if;
  if exists(select 1 from jsonb_to_recordset(source->'stops') as s(latitude double precision, longitude double precision)
    where latitude is null or longitude is null or latitude not between -90 and 90 or longitude not between -180 and 180) then
    raise exception 'Selected stops require valid coordinates' using errcode = '22023';
  end if;

  -- Any key collision (including another user's invisible receipt/journey) fails
  -- atomically under PK/RLS; never attach to an arbitrary existing journey.
  insert into private.selected_copy_requests(draft_id, user_id, source_id, selected_stop_ids)
    values(draft_id, uid, source_id, request_ids);
  insert into public.journeys(id,user_id,title,description,destination_slug,destination_name,
    destination_latitude,destination_longitude,traveler_type,duration_days,cover_image_path,is_demo,copied_from_journey_id)
  values(draft_id,uid,source->>'title',source->>'description',source->>'destination_slug',source->>'destination_name',
    (source->>'destination_latitude')::double precision,(source->>'destination_longitude')::double precision,
    source->>'traveler_type',(source->>'duration_days')::integer,private.copy_media_path(source->>'cover_image_path'),false,source_id);
  insert into public.journey_stops(journey_id,sequence,name,description,latitude,longitude,mapbox_place_id,photo_path,rating,day_number)
  select draft_id,number::integer,value->>'name',value->>'description',(value->>'latitude')::double precision,
    (value->>'longitude')::double precision,value->>'mapbox_place_id',private.copy_media_path(value->>'photo_path'),
    (value->>'rating')::numeric,(value->>'day_number')::integer
  from jsonb_array_elements(source->'stops') with ordinality as selected(value,number)
  order by number;
  return draft_id;
end;
$$;
revoke all on function public.copy_journey_selected(uuid,uuid[],uuid) from public,anon;
grant execute on function public.copy_journey_selected(uuid,uuid[],uuid) to authenticated;
commit;
