-- Cursor-based discovery; prior capped RPCs remain compatible.
CREATE OR REPLACE FUNCTION private.discover_sessions_page(p_location text DEFAULT ''::text, p_search text DEFAULT ''::text, p_from date DEFAULT NULL::date, p_to date DEFAULT NULL::date, p_category integer DEFAULT NULL::integer, p_time text DEFAULT 'any'::text, p_availability text DEFAULT 'joinable'::text, p_min_price integer DEFAULT NULL::integer, p_max_price integer DEFAULT NULL::integer, p_currency text DEFAULT 'ARS'::text, p_coverage text DEFAULT 'any'::text, p_gender text DEFAULT 'any'::text, p_session_attributes text[] DEFAULT '{}'::text[], p_venue_attributes text[] DEFAULT '{}'::text[], p_sort text DEFAULT 'soonest'::text, p_latitude double precision DEFAULT NULL::double precision, p_longitude double precision DEFAULT NULL::double precision, p_radius_km integer DEFAULT NULL::integer, p_city_id integer DEFAULT NULL::integer, p_bounds jsonb DEFAULT NULL::jsonb, p_after jsonb DEFAULT NULL, p_limit integer DEFAULT 50)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare result jsonb; scope text; after_id uuid; after_start timestamptz; after_price integer; after_distance double precision;
begin

  if p_limit is null or p_limit not between 1 and 100 then raise exception 'Invalid discovery page size' using errcode='22023'; end if;
  scope:=md5(jsonb_build_array(p_location,p_search,p_from,p_to,p_category,p_time,p_availability,p_min_price,p_max_price,p_currency,p_coverage,p_gender,p_session_attributes,p_venue_attributes,p_sort,p_latitude,p_longitude,p_radius_km,p_city_id,p_bounds,auth.uid())::text);
  if p_after is not null then
    if jsonb_typeof(p_after)<>'object' or length(p_after::text)>2000
      or not (p_after ?& array['scope','id','starts_at','price_minor','distance_m'])
      or p_after->>'scope' is distinct from scope
      or jsonb_typeof(p_after->'id')<>'string' or jsonb_typeof(p_after->'starts_at')<>'string'
      or jsonb_typeof(p_after->'price_minor')<>'number'
      or jsonb_typeof(p_after->'distance_m') not in ('number','null')
    then raise exception 'Invalid discovery cursor' using errcode='22023'; end if;
    begin
      after_id:=(p_after->>'id')::uuid;after_start:=(p_after->>'starts_at')::timestamptz;
      after_price:=(p_after->>'price_minor')::integer;after_distance:=(p_after->>'distance_m')::double precision;
      if after_id is null or after_start is null or not isfinite(after_start) or after_price<0
        or after_distance<0 or after_distance='Infinity'::double precision or after_distance='NaN'::double precision
      then raise exception 'Invalid discovery cursor'; end if;
    exception when others then raise exception 'Invalid discovery cursor' using errcode='22023'; end;
  end if;
  if p_bounds is not null then
    if jsonb_typeof(p_bounds)<>'object'
      or not(p_bounds ?& array['west','south','east','north'])
      or jsonb_typeof(p_bounds->'west')<>'number' or jsonb_typeof(p_bounds->'east')<>'number'
      or jsonb_typeof(p_bounds->'south')<>'number' or jsonb_typeof(p_bounds->'north')<>'number'
    then raise exception 'Invalid map bounds' using errcode='22023'; end if;
    if (p_bounds->>'west')::double precision not between -180 and 180
      or (p_bounds->>'east')::double precision not between -180 and 180
      or (p_bounds->>'south')::double precision not between -90 and 90
      or (p_bounds->>'north')::double precision not between -90 and 90
      or (p_bounds->>'south')::double precision >= (p_bounds->>'north')::double precision
      or (p_bounds->>'west')::double precision = (p_bounds->>'east')::double precision
    then raise exception 'Invalid map bounds' using errcode='22023'; end if;
  end if;

  if length(coalesce(p_location,'')) > 120 or length(coalesce(p_search,'')) > 120
    or (p_category is not null and p_category not between 1 and 8)
    or p_time not in ('any','morning','afternoon','evening')
    or p_availability not in ('joinable','spots','waitlist','all')
    or (p_from is not null and p_to is not null and p_from > p_to)
  then raise exception 'Invalid discovery filters' using errcode='22023'; end if;

  if p_min_price < 0 or p_max_price < 0 or p_min_price > p_max_price
    or p_currency is null or p_currency !~ '^[A-Z]{3}$'
    or p_coverage is null or p_coverage not in ('any','covered','uncovered')
    or p_gender is null or p_gender not in ('any','all','women_only','men_only')
    or p_session_attributes is null or p_venue_attributes is null
    or cardinality(p_session_attributes)>6 or cardinality(p_venue_attributes)>10
    or array_position(p_session_attributes,null) is not null or array_position(p_venue_attributes,null) is not null
    or not(p_session_attributes <@ array['balls_provided','new_balls','spare_rackets','coaching','snacks','drinks']::text[])
    or not(p_venue_attributes <@ array['free_parking','paid_parking','showers','changing_rooms','lockers','water_dispenser','accessible','racket_rental','shop','cafe']::text[])
  then raise exception 'Invalid advanced discovery filters' using errcode='22023'; end if;

  if p_sort is null or p_sort not in ('soonest','price','nearest')
    or (p_latitude is null)<>(p_longitude is null)
    or p_latitude not between -90 and 90 or p_longitude not between -180 and 180
    or (p_sort='nearest' and p_latitude is null)
  then raise exception 'Invalid discovery sorting or location' using errcode='22023'; end if;

  if p_radius_km is not null and (p_radius_km not in (5,10,25) or p_latitude is null or p_longitude is null)
  then raise exception 'Invalid discovery radius or location' using errcode='22023'; end if;

  if p_bounds is null and p_city_id is not null and not exists(select 1 from private.discovery_cities where id=p_city_id)
  then raise exception 'Unknown city' using errcode='22023'; end if;
  with candidates as (
    select s.*, coalesce(ss.timezone,'America/Argentina/Buenos_Aires') tz,
      v.name venue_name,v.address venue_address,v.court_coverage venue_court_coverage,v.latitude venue_latitude,v.longitude venue_longitude,
      counts.confirmed_count,counts.waitlisted_count,
      case when (p_sort='nearest' or p_radius_km is not null) and v.latitude is not null and v.longitude is not null then
        6371000.0 * acos(least(1.0,greatest(-1.0,
          sin(radians(p_latitude))*sin(radians(v.latitude)) +
          cos(radians(p_latitude))*cos(radians(v.latitude))*cos(radians(v.longitude-p_longitude)))))
        else null end distance_m,
      (select r.status from public.registrations r where r.session_id=s.id
        and r.player_id=(select auth.uid()) and r.status in ('confirmed','waitlisted')) viewer_registration,
      coalesce(s.organizer_id=(select auth.uid()),false) viewer_is_host
    from public.sessions s
    join public.venues v on v.id=s.venue_id and v.is_active
    join public.organizers o on o.profile_id=s.organizer_id and o.status='active'
    left join public.session_series ss on ss.id=s.series_id
    cross join lateral (select count(*) filter(where r.status='confirmed') confirmed_count,
      count(*) filter(where r.status='waitlisted') waitlisted_count
      from public.registrations r where r.session_id=s.id) counts

    where (p_bounds is null or (
      v.latitude is not null and v.longitude is not null
      and v.latitude between (p_bounds->>'south')::double precision and (p_bounds->>'north')::double precision
      and (case when (p_bounds->>'west')::double precision < (p_bounds->>'east')::double precision
        then v.longitude between (p_bounds->>'west')::double precision and (p_bounds->>'east')::double precision
        else v.longitude >= (p_bounds->>'west')::double precision or v.longitude <= (p_bounds->>'east')::double precision end)
    )) and s.status='published' and s.visibility='public' and s.starts_at>now()
      and (s.registration_opens_at is null or s.registration_opens_at<=now())
      and (s.registration_closes_at is null or s.registration_closes_at>now())
      and (p_category is null or s.allowed_categories is null or p_category=any(s.allowed_categories))
      and (p_bounds is not null or p_city_id is not null or p_radius_km is not null or coalesce(trim(p_location),'')='' or position(lower(trim(p_location)) in lower(concat_ws(' ',v.name,v.address)))>0)
      and (coalesce(trim(p_search),'')='' or position(lower(trim(p_search)) in lower(concat_ws(' ',s.title,v.name)))>0)
  ), matching as (
    select * from candidates s
    where (p_from is null or (s.starts_at at time zone s.tz)::date>=p_from)
      and (p_to is null or (s.starts_at at time zone s.tz)::date<=p_to)
      and (p_time='any' or (p_time='morning' and extract(hour from s.starts_at at time zone s.tz)<12)
        or (p_time='afternoon' and extract(hour from s.starts_at at time zone s.tz)>=12 and extract(hour from s.starts_at at time zone s.tz)<18)
        or (p_time='evening' and extract(hour from s.starts_at at time zone s.tz)>=18))
      and (p_availability='all'
        or (p_availability='spots' and confirmed_count<capacity)
        or (p_availability='waitlist' and confirmed_count>=capacity and waitlist_enabled and (waitlist_capacity is null or waitlisted_count<waitlist_capacity))
        or (p_availability='joinable' and (viewer_registration is not null or viewer_is_host or confirmed_count<capacity
          or (waitlist_enabled and (waitlist_capacity is null or waitlisted_count<waitlist_capacity)))))

      and (p_min_price is null or (s.currency=p_currency and s.price_minor>=p_min_price))
      and (p_max_price is null or (s.currency=p_currency and s.price_minor<=p_max_price))
      and (p_coverage='any' or s.court_coverage=p_coverage)
      and (p_gender='any' or s.participant_gender_policy=p_gender)
      and not exists(select 1 from unnest(p_session_attributes) selected(code)
        where not exists(select 1 from public.session_attributes a where a.session_id=s.id
          and (a.attribute_code=selected.code or (selected.code='balls_provided' and a.attribute_code='new_balls'))))
      and not exists(select 1 from unnest(p_venue_attributes) selected(code)
        where not exists(select 1 from public.organizer_venue_attributes a
          where a.venue_id=s.venue_id and a.organizer_id=s.organizer_id and a.attribute_code=selected.code))
      and (p_bounds is not null or p_radius_km is null or s.distance_m <= p_radius_km * 1000.0)

      and (p_bounds is not null or p_city_id is null or p_radius_km is not null or exists (
       select 1 from private.discovery_cities city where city.id=p_city_id
       and s.venue_latitude is not null and s.venue_longitude is not null
       and s.venue_latitude between city.latitude-0.225 and city.latitude+0.225
       and 6371000.0*acos(least(1.0,greatest(-1.0,sin(radians(city.latitude))*sin(radians(s.venue_latitude))+
       cos(radians(city.latitude))*cos(radians(s.venue_latitude))*cos(radians(s.venue_longitude-city.longitude)))))<=25000
      ))

      and (p_after is null
        or (p_sort='soonest' and (s.starts_at,s.id)>(after_start,after_id))
        or (p_sort='price' and (s.price_minor,s.starts_at,s.id)>(after_price,after_start,after_id))
        or (p_sort='nearest' and (
          (after_distance is null and s.distance_m is null and (s.starts_at,s.id)>(after_start,after_id))
          or (after_distance is not null and (s.distance_m is null or (s.distance_m,s.starts_at,s.id)>(after_distance,after_start,after_id)))
        )))
    order by case when p_sort='price' then price_minor end, case when p_sort='nearest' then distance_m end nulls last, starts_at,id limit (p_limit+1)
  ), page as (select * from matching order by case when p_sort='price' then price_minor end, case when p_sort='nearest' then distance_m end nulls last, starts_at,id limit p_limit)
  select jsonb_build_object('has_more',(select count(*)>p_limit from matching),
    'next_cursor',case when (select count(*)>p_limit from matching) then (
      select jsonb_build_object('scope',scope,'id',id,'starts_at',starts_at,'price_minor',price_minor,'distance_m',distance_m)
      from page order by case when p_sort='price' then price_minor end desc,
        case when p_sort='nearest' then distance_m end desc nulls first, starts_at desc,id desc limit 1
    ) else null end,
    'sessions',coalesce(jsonb_agg(jsonb_build_object(
      'id',id,'title',title,'distance_m',distance_m,'court_coverage',court_coverage,'starts_at',starts_at,'ends_at',ends_at,'timezone',tz,
      'capacity',capacity,'confirmed_count',confirmed_count,'waitlist_enabled',waitlist_enabled,
      'waitlist_capacity',waitlist_capacity,'waitlisted_count',waitlisted_count,
      'allowed_categories',allowed_categories,'price_minor',price_minor,'currency',currency,
      'registration_opens_at',registration_opens_at,'registration_closes_at',registration_closes_at,
      'viewer_registration',viewer_registration,'viewer_is_host',viewer_is_host,
      'venue',jsonb_build_object('id',venue_id,'name',venue_name,'address',venue_address,'court_coverage',venue_court_coverage,'latitude',venue_latitude,'longitude',venue_longitude)
    ) order by case when p_sort='price' then price_minor end, case when p_sort='nearest' then distance_m end nulls last, starts_at,id),'[]'::jsonb)) into result from page;
  return result;
end $function$
;
revoke all on function private.discover_sessions_page(text,text,date,date,integer,text,text,integer,integer,text,text,text,text[],text[],text,double precision,double precision,integer,integer,jsonb,jsonb,integer) from public,anon,authenticated;
create function public.discover_sessions_page(
 p_location text default '',p_search text default '',p_from date default null,p_to date default null,
 p_category integer default null,p_time text default 'any',p_availability text default 'joinable',
 p_min_price integer default null,p_max_price integer default null,p_currency text default 'ARS',
 p_coverage text default 'any',p_gender text default 'any',p_session_attributes text[] default '{}',p_venue_attributes text[] default '{}',
 p_sort text default 'soonest',p_latitude double precision default null,p_longitude double precision default null,p_radius_km integer default null,p_city_id integer default null,p_bounds jsonb default null,
 p_after jsonb default null,p_limit integer default 50
) returns jsonb language sql stable security definer set search_path='' as $$
 select private.discover_sessions_page(p_location,p_search,p_from,p_to,p_category,p_time,p_availability,
 p_min_price,p_max_price,p_currency,p_coverage,p_gender,p_session_attributes,p_venue_attributes,p_sort,p_latitude,p_longitude,p_radius_km,p_city_id,p_bounds,p_after,p_limit);
$$;
revoke all on function public.discover_sessions_page(text,text,date,date,integer,text,text,integer,integer,text,text,text,text[],text[],text,double precision,double precision,integer,integer,jsonb,jsonb,integer) from public;
grant execute on function public.discover_sessions_page(text,text,date,date,integer,text,text,integer,integer,text,text,text,text[],text[],text,double precision,double precision,integer,integer,jsonb,jsonb,integer) to anon,authenticated;
create index if not exists sessions_public_discovery_price_idx on public.sessions(price_minor,starts_at,id) where status='published' and visibility='public';
notify pgrst,'reload schema';
