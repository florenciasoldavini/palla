-- Public geographic reference data, imported separately from GeoNames (CC BY 4.0).
create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;
create table private.discovery_cities (
 id integer primary key, name text not null, region text not null,
 country_code text not null check (country_code ~ '^[A-Z]{2}$'), country text not null,
 latitude double precision not null check(latitude between -90 and 90),
 longitude double precision not null check(longitude between -180 and 180),
 population bigint not null default 0, search_names text not null
);
alter table private.discovery_cities enable row level security;
revoke all on private.discovery_cities from public,anon,authenticated;
create index discovery_cities_search_idx on private.discovery_cities using gin(search_names extensions.gin_trgm_ops);
create index discovery_cities_latitude_idx on private.discovery_cities(latitude);

create function public.search_discovery_cities(p_query text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare q text;
begin
 q:=lower(extensions.unaccent(trim(p_query)));
 if q is null or length(q)<2 or length(q)>100 then return '[]'::jsonb; end if;
 -- Treat wildcard characters as text, never as a way to scan the whole catalog.
 q:=replace(replace(replace(q,'\','\\'),'%','\%'),'_','\_');
 return (select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from (
  select c.id,c.name,c.region,c.country_code,c.country,c.latitude,c.longitude
  from private.discovery_cities c
  where c.search_names like q||'%' or c.search_names like '%|'||q||'%'
  order by (lower(extensions.unaccent(c.name))=q) desc,
    (lower(extensions.unaccent(c.name)) like q||'%') desc,c.population desc,c.id
  limit 8
 ) r);
end $$;
revoke all on function public.search_discovery_cities(text) from public;
grant execute on function public.search_discovery_cities(text) to anon,authenticated;

-- A nearby catalog city is a suggestion, not an administrative boundary claim.
create function public.locate_discovery_city(p_latitude double precision,p_longitude double precision)
returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if p_latitude is null or p_longitude is null or p_latitude not between -90 and 90 or p_longitude not between -180 and 180
 then raise exception 'Invalid location' using errcode='22023'; end if;
 return (select to_jsonb(r)-'distance_m' from (
  select c.id,c.name,c.region,c.country_code,c.country,c.latitude,c.longitude,
   6371000.0*acos(least(1.0,greatest(-1.0,sin(radians(p_latitude))*sin(radians(c.latitude))+
   cos(radians(p_latitude))*cos(radians(c.latitude))*cos(radians(c.longitude-p_longitude))))) as distance_m
  from private.discovery_cities c where c.latitude between p_latitude-0.5 and p_latitude+0.5
  order by distance_m,c.population desc limit 1
 ) r where r.distance_m<=50000);
end $$;
revoke all on function public.locate_discovery_city(double precision,double precision) from public;
grant execute on function public.locate_discovery_city(double precision,double precision) to anon,authenticated;

-- Select a city by ID, using its trusted catalog center. Filter BEFORE pagination.
-- Without venue administrative boundaries, city discovery is explicitly within 25 km.
do $migration$
declare definition text;needle text;
begin
 definition:=pg_get_functiondef('private.discover_sessions_in_radius(text,text,date,date,integer,text,text,integer,integer,text,text,text,text[],text[],text,double precision,double precision,integer)'::regprocedure);
 definition:=replace(definition,'FUNCTION private.discover_sessions_in_radius(', 'FUNCTION private.discover_sessions_by_city(');
 needle:='p_radius_km integer DEFAULT NULL::integer)';
 if position(needle in definition)=0 then raise exception 'Unexpected radius signature'; end if;
 definition:=replace(definition,needle,'p_radius_km integer DEFAULT NULL::integer, p_city_id integer DEFAULT NULL)');
 needle:='  with candidates as (';
 if position(needle in definition)=0 then raise exception 'Unexpected radius body'; end if;
 definition:=replace(definition,needle,$filter$
  if p_city_id is not null and not exists(select 1 from private.discovery_cities where id=p_city_id)
  then raise exception 'Unknown city' using errcode='22023'; end if;
  with candidates as ($filter$);
 needle:='(p_radius_km is not null or coalesce(trim(p_location),'''')=''''';
 if position(needle in definition)=0 then raise exception 'Unexpected location predicate'; end if;
 definition:=replace(definition,needle,'(p_city_id is not null or p_radius_km is not null or coalesce(trim(p_location),'''')=''''');
 needle:='    order by case when p_sort=''price'' then price_minor end';
 if position(needle in definition)=0 then raise exception 'Unexpected radius limit'; end if;
 definition:=replace(definition,needle,$city$
      and (p_city_id is null or p_radius_km is not null or exists (
       select 1 from private.discovery_cities city where city.id=p_city_id
       and s.venue_latitude is not null and s.venue_longitude is not null
       and s.venue_latitude between city.latitude-0.225 and city.latitude+0.225
       and 6371000.0*acos(least(1.0,greatest(-1.0,sin(radians(city.latitude))*sin(radians(s.venue_latitude))+
       cos(radians(city.latitude))*cos(radians(s.venue_latitude))*cos(radians(s.venue_longitude-city.longitude)))))<=25000
      ))
    order by case when p_sort='price' then price_minor end$city$);
 execute definition;
end $migration$;
revoke all on function private.discover_sessions_by_city(text,text,date,date,integer,text,text,integer,integer,text,text,text,text[],text[],text,double precision,double precision,integer,integer) from public,anon,authenticated;
create function public.discover_sessions_by_city(
 p_location text default '',p_search text default '',p_from date default null,p_to date default null,
 p_category integer default null,p_time text default 'any',p_availability text default 'joinable',
 p_min_price integer default null,p_max_price integer default null,p_currency text default 'ARS',
 p_coverage text default 'any',p_gender text default 'any',p_session_attributes text[] default '{}',p_venue_attributes text[] default '{}',
 p_sort text default 'soonest',p_latitude double precision default null,p_longitude double precision default null,p_radius_km integer default null,p_city_id integer default null
) returns jsonb language sql stable security definer set search_path='' as $$
 select private.discover_sessions_by_city(p_location,p_search,p_from,p_to,p_category,p_time,p_availability,
 p_min_price,p_max_price,p_currency,p_coverage,p_gender,p_session_attributes,p_venue_attributes,p_sort,p_latitude,p_longitude,p_radius_km,p_city_id);
$$;
revoke all on function public.discover_sessions_by_city(text,text,date,date,integer,text,text,integer,integer,text,text,text,text[],text[],text,double precision,double precision,integer,integer) from public;
grant execute on function public.discover_sessions_by_city(text,text,date,date,integer,text,text,integer,integer,text,text,text,text[],text[],text,double precision,double precision,integer,integer) to anon,authenticated;
notify pgrst,'reload schema';
