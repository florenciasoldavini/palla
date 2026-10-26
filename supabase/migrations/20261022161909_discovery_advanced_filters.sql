-- Keep the original RPC for installed clients; both entry points share one core.
-- Filtering runs before pagination and does not expose base tables or roster data.
do $migration$
declare definition text; needle text;
begin
 definition:=pg_get_functiondef('private.discover_sessions(text,text,date,date,integer,text,text)'::regprocedure);
 definition:=replace(definition,'FUNCTION private.discover_sessions(', 'FUNCTION private.discover_sessions_filtered(');
 needle:='p_availability text DEFAULT ''joinable''::text)';
 if position(needle in definition)=0 then raise exception 'Unexpected discovery signature'; end if;
 definition:=replace(definition,needle,$args$p_availability text DEFAULT 'joinable'::text,
   p_min_price integer DEFAULT NULL, p_max_price integer DEFAULT NULL, p_currency text DEFAULT 'ARS',
   p_coverage text DEFAULT 'any', p_gender text DEFAULT 'any',
   p_session_attributes text[] DEFAULT '{}', p_venue_attributes text[] DEFAULT '{}')$args$);
 needle:='  with candidates as (';
 if position(needle in definition)=0 then raise exception 'Unexpected discovery candidates'; end if;
 definition:=replace(definition,needle,$validation$
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
  with candidates as ($validation$);
 needle:='    order by starts_at,id limit 501';
 if position(needle in definition)=0 then raise exception 'Unexpected discovery pagination'; end if;
 definition:=replace(definition,needle,$filters$
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
    order by starts_at,id limit 501$filters$);
 execute definition;
end $migration$;
revoke all on function private.discover_sessions_filtered(text,text,date,date,integer,text,text,integer,integer,text,text,text,text[],text[]) from public,anon,authenticated;

create function public.discover_sessions_filtered(
 p_location text default '',p_search text default '',p_from date default null,p_to date default null,
 p_category integer default null,p_time text default 'any',p_availability text default 'joinable',
 p_min_price integer default null,p_max_price integer default null,p_currency text default 'ARS',
 p_coverage text default 'any',p_gender text default 'any',p_session_attributes text[] default '{}',p_venue_attributes text[] default '{}'
) returns jsonb language sql stable security definer set search_path='' as $$
 select private.discover_sessions_filtered(p_location,p_search,p_from,p_to,p_category,p_time,p_availability,
   p_min_price,p_max_price,p_currency,p_coverage,p_gender,p_session_attributes,p_venue_attributes);
$$;
revoke all on function public.discover_sessions_filtered(text,text,date,date,integer,text,text,integer,integer,text,text,text,text[],text[]) from public;
grant execute on function public.discover_sessions_filtered(text,text,date,date,integer,text,text,integer,integer,text,text,text,text[],text[]) to anon,authenticated;

create or replace function private.discover_sessions(
 p_location text default '',p_search text default '',p_from date default null,p_to date default null,
 p_category integer default null,p_time text default 'any',p_availability text default 'joinable'
) returns jsonb language sql stable security definer set search_path='' as $$
 select private.discover_sessions_filtered(p_location,p_search,p_from,p_to,p_category,p_time,p_availability);
$$;
notify pgrst,'reload schema';
