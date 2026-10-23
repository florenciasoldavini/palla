-- One canonical core adds a radius; old RPC arguments keep their defaults.
-- A separate public endpoint avoids overloads and preserves installed clients.
do $migration$
declare definition text;needle text;
begin
 definition:=pg_get_functiondef('private.discover_sessions_ranked(text,text,date,date,integer,text,text,integer,integer,text,text,text,text[],text[],text,double precision,double precision)'::regprocedure);
 definition:=replace(definition,'FUNCTION private.discover_sessions_ranked(', 'FUNCTION private.discover_sessions_in_radius(');
 needle:='p_longitude double precision DEFAULT NULL::double precision)';
 if position(needle in definition)=0 then raise exception 'Unexpected ranked signature'; end if;
 definition:=replace(definition,needle,'p_longitude double precision DEFAULT NULL::double precision, p_radius_km integer DEFAULT NULL)');
 needle:='  with candidates as (';
 if position(needle in definition)=0 then raise exception 'Unexpected ranked candidates'; end if;
 definition:=replace(definition,needle,$validation$
  if p_radius_km is not null and (p_radius_km not in (5,10,25) or p_latitude is null or p_longitude is null)
  then raise exception 'Invalid discovery radius or location' using errcode='22023'; end if;
  with candidates as ($validation$);
 needle:='case when p_sort=''nearest'' and v.latitude is not null';
 if position(needle in definition)=0 then raise exception 'Unexpected distance projection'; end if;
 definition:=replace(definition,needle,'case when (p_sort=''nearest'' or p_radius_km is not null) and v.latitude is not null');
 -- Near me replaces the saved text area, while retaining all other filters.
 needle:='(coalesce(trim(p_location),'''')=''''';
 if position(needle in definition)=0 then raise exception 'Unexpected location predicate'; end if;
 definition:=replace(definition,needle,'(p_radius_km is not null or coalesce(trim(p_location),'''')=''''');
 needle:='    order by case when p_sort=''price'' then price_minor end';
 if position(needle in definition)=0 then raise exception 'Unexpected ranked limit'; end if;
 definition:=replace(definition,needle,'      and (p_radius_km is null or s.distance_m <= p_radius_km * 1000.0)'||chr(10)||needle);
 execute definition;
end $migration$;
revoke all on function private.discover_sessions_in_radius(text,text,date,date,integer,text,text,integer,integer,text,text,text,text[],text[],text,double precision,double precision,integer) from public,anon,authenticated;

create function public.discover_sessions_nearby(
 p_location text default '',p_search text default '',p_from date default null,p_to date default null,
 p_category integer default null,p_time text default 'any',p_availability text default 'joinable',
 p_min_price integer default null,p_max_price integer default null,p_currency text default 'ARS',
 p_coverage text default 'any',p_gender text default 'any',p_session_attributes text[] default '{}',p_venue_attributes text[] default '{}',
 p_sort text default 'soonest',p_latitude double precision default null,p_longitude double precision default null,p_radius_km integer default null
) returns jsonb language sql stable security definer set search_path='' as $$
 select private.discover_sessions_in_radius(p_location,p_search,p_from,p_to,p_category,p_time,p_availability,
   p_min_price,p_max_price,p_currency,p_coverage,p_gender,p_session_attributes,p_venue_attributes,p_sort,p_latitude,p_longitude,p_radius_km);
$$;
revoke all on function public.discover_sessions_nearby(text,text,date,date,integer,text,text,integer,integer,text,text,text,text[],text[],text,double precision,double precision,integer) from public;
grant execute on function public.discover_sessions_nearby(text,text,date,date,integer,text,text,integer,integer,text,text,text,text[],text[],text,double precision,double precision,integer) to anon,authenticated;

create or replace function private.discover_sessions_ranked(
 p_location text default '',p_search text default '',p_from date default null,p_to date default null,
 p_category integer default null,p_time text default 'any',p_availability text default 'joinable',
 p_min_price integer default null,p_max_price integer default null,p_currency text default 'ARS',
 p_coverage text default 'any',p_gender text default 'any',p_session_attributes text[] default '{}',p_venue_attributes text[] default '{}',
 p_sort text default 'soonest',p_latitude double precision default null,p_longitude double precision default null
) returns jsonb language sql stable security definer set search_path='' as $$
 select private.discover_sessions_in_radius(p_location,p_search,p_from,p_to,p_category,p_time,p_availability,
   p_min_price,p_max_price,p_currency,p_coverage,p_gender,p_session_attributes,p_venue_attributes,p_sort,p_latitude,p_longitude);
$$;
notify pgrst,'reload schema';
