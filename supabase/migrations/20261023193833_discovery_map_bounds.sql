-- Map viewport is the search area; eligibility and non-location filters still apply.
do $migration$
declare definition text;needle text;
begin
 definition:=pg_get_functiondef('private.discover_sessions_by_city(text,text,date,date,integer,text,text,integer,integer,text,text,text,text[],text[],text,double precision,double precision,integer,integer)'::regprocedure);
 definition:=replace(definition,'FUNCTION private.discover_sessions_by_city(', 'FUNCTION private.discover_sessions_in_bounds(');
 needle:='p_city_id integer DEFAULT NULL::integer)';
 if position(needle in definition)=0 then raise exception 'Unexpected city signature'; end if;
 definition:=replace(definition,needle,'p_city_id integer DEFAULT NULL::integer, p_bounds jsonb DEFAULT NULL)');
 needle:='begin';
 definition:=replace(definition,needle,$validate$begin
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
$validate$);
 definition:=replace(definition,'if p_city_id is not null and not exists','if p_bounds is null and p_city_id is not null and not exists');
 definition:=replace(definition,'(p_city_id is not null or p_radius_km is not null or coalesce(trim(p_location)', '(p_bounds is not null or p_city_id is not null or p_radius_km is not null or coalesce(trim(p_location)');
 definition:=replace(definition,'(p_radius_km is null or s.distance_m <=','(p_bounds is not null or p_radius_km is null or s.distance_m <=');
 definition:=replace(definition,'(p_city_id is null or p_radius_km is not null or exists', '(p_bounds is not null or p_city_id is null or p_radius_km is not null or exists');
 needle:='    where s.status=''published''';
 if position(needle in definition)=0 then raise exception 'Unexpected discovery candidates'; end if;
 definition:=replace(definition,needle,$bounds$
    where (p_bounds is null or (
      v.latitude is not null and v.longitude is not null
      and v.latitude between (p_bounds->>'south')::double precision and (p_bounds->>'north')::double precision
      and (case when (p_bounds->>'west')::double precision < (p_bounds->>'east')::double precision
        then v.longitude between (p_bounds->>'west')::double precision and (p_bounds->>'east')::double precision
        else v.longitude >= (p_bounds->>'west')::double precision or v.longitude <= (p_bounds->>'east')::double precision end)
    )) and s.status='published'$bounds$);
 execute definition;
end $migration$;
revoke all on function private.discover_sessions_in_bounds(text,text,date,date,integer,text,text,integer,integer,text,text,text,text[],text[],text,double precision,double precision,integer,integer,jsonb) from public,anon,authenticated;
create index if not exists venues_discovery_map_idx on public.venues(latitude,longitude)
 where is_active and latitude is not null and longitude is not null;
create function public.discover_sessions_in_bounds(
 p_location text default '',p_search text default '',p_from date default null,p_to date default null,
 p_category integer default null,p_time text default 'any',p_availability text default 'joinable',
 p_min_price integer default null,p_max_price integer default null,p_currency text default 'ARS',
 p_coverage text default 'any',p_gender text default 'any',p_session_attributes text[] default '{}',p_venue_attributes text[] default '{}',
 p_sort text default 'soonest',p_latitude double precision default null,p_longitude double precision default null,p_radius_km integer default null,p_city_id integer default null,p_bounds jsonb default null
) returns jsonb language sql stable security definer set search_path='' as $$
 select private.discover_sessions_in_bounds(p_location,p_search,p_from,p_to,p_category,p_time,p_availability,
 p_min_price,p_max_price,p_currency,p_coverage,p_gender,p_session_attributes,p_venue_attributes,p_sort,p_latitude,p_longitude,p_radius_km,p_city_id,p_bounds);
$$;
revoke all on function public.discover_sessions_in_bounds(text,text,date,date,integer,text,text,integer,integer,text,text,text,text[],text[],text,double precision,double precision,integer,integer,jsonb) from public;
grant execute on function public.discover_sessions_in_bounds(text,text,date,date,integer,text,text,integer,integer,text,text,text,text[],text[],text,double precision,double precision,integer,integer,jsonb) to anon,authenticated;
notify pgrst,'reload schema';
