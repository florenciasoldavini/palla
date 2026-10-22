-- Rank the complete eligible result set before the bounded page. Existing RPCs
-- delegate to this core with Soonest, preserving installed clients.
do $migration$
declare definition text;needle text; ordering text;
begin
 definition:=pg_get_functiondef('private.discover_sessions_filtered(text,text,date,date,integer,text,text,integer,integer,text,text,text,text[],text[])'::regprocedure);
 definition:=replace(definition,'FUNCTION private.discover_sessions_filtered(', 'FUNCTION private.discover_sessions_ranked(');
 needle:='p_venue_attributes text[] DEFAULT ''{}''::text[])';
 if position(needle in definition)=0 then raise exception 'Unexpected discovery filter signature'; end if;
 definition:=replace(definition,needle,$args$p_venue_attributes text[] DEFAULT '{}'::text[],
   p_sort text DEFAULT 'soonest', p_latitude double precision DEFAULT NULL, p_longitude double precision DEFAULT NULL)$args$);
 needle:='  with candidates as (';
 if position(needle in definition)=0 then raise exception 'Unexpected discovery candidates'; end if;
 definition:=replace(definition,needle,$validation$
  if p_sort is null or p_sort not in ('soonest','price','nearest')
    or (p_latitude is null)<>(p_longitude is null)
    or p_latitude not between -90 and 90 or p_longitude not between -180 and 180
    or (p_sort='nearest' and p_latitude is null)
  then raise exception 'Invalid discovery sorting or location' using errcode='22023'; end if;
  with candidates as ($validation$);
 needle:='counts.confirmed_count,counts.waitlisted_count,';
 if position(needle in definition)=0 then raise exception 'Unexpected discovery projection'; end if;
 definition:=replace(definition,needle,$distance$counts.confirmed_count,counts.waitlisted_count,
      case when p_sort='nearest' and v.latitude is not null and v.longitude is not null then
        6371000.0 * acos(least(1.0,greatest(-1.0,
          sin(radians(p_latitude))*sin(radians(v.latitude)) +
          cos(radians(p_latitude))*cos(radians(v.latitude))*cos(radians(v.longitude-p_longitude)))))
        else null end distance_m,$distance$);
 ordering:='case when p_sort=''price'' then price_minor end, case when p_sort=''nearest'' then distance_m end nulls last, starts_at,id';
 -- All three orderings must agree: candidate limit, page limit, JSON aggregation.
 if (length(definition)-length(replace(definition,'order by starts_at,id','')))/length('order by starts_at,id')<>3
 then raise exception 'Unexpected discovery ordering count'; end if;
 definition:=replace(definition,'order by starts_at,id','order by '||ordering);
 definition:=replace(definition,'''id'',id,''title'',title,','''id'',id,''title'',title,''distance_m'',distance_m,');
 execute definition;
end $migration$;
revoke all on function private.discover_sessions_ranked(text,text,date,date,integer,text,text,integer,integer,text,text,text,text[],text[],text,double precision,double precision) from public,anon,authenticated;

create function public.discover_sessions_ranked(
 p_location text default '',p_search text default '',p_from date default null,p_to date default null,
 p_category integer default null,p_time text default 'any',p_availability text default 'joinable',
 p_min_price integer default null,p_max_price integer default null,p_currency text default 'ARS',
 p_coverage text default 'any',p_gender text default 'any',p_session_attributes text[] default '{}',p_venue_attributes text[] default '{}',
 p_sort text default 'soonest',p_latitude double precision default null,p_longitude double precision default null
) returns jsonb language sql stable security definer set search_path='' as $$
 select private.discover_sessions_ranked(p_location,p_search,p_from,p_to,p_category,p_time,p_availability,
   p_min_price,p_max_price,p_currency,p_coverage,p_gender,p_session_attributes,p_venue_attributes,p_sort,p_latitude,p_longitude);
$$;
revoke all on function public.discover_sessions_ranked(text,text,date,date,integer,text,text,integer,integer,text,text,text,text[],text[],text,double precision,double precision) from public;
grant execute on function public.discover_sessions_ranked(text,text,date,date,integer,text,text,integer,integer,text,text,text,text[],text[],text,double precision,double precision) to anon,authenticated;

create or replace function private.discover_sessions_filtered(
 p_location text default '',p_search text default '',p_from date default null,p_to date default null,
 p_category integer default null,p_time text default 'any',p_availability text default 'joinable',
 p_min_price integer default null,p_max_price integer default null,p_currency text default 'ARS',
 p_coverage text default 'any',p_gender text default 'any',p_session_attributes text[] default '{}',p_venue_attributes text[] default '{}'
) returns jsonb language sql stable security definer set search_path='' as $$
 select private.discover_sessions_ranked(p_location,p_search,p_from,p_to,p_category,p_time,p_availability,
   p_min_price,p_max_price,p_currency,p_coverage,p_gender,p_session_attributes,p_venue_attributes);
$$;
notify pgrst,'reload schema';
