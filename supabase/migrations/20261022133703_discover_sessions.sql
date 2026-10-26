-- A bounded public projection, without exposing rosters or broadening table RLS.
create or replace function private.discover_sessions(
  p_location text default '', p_search text default '', p_from date default null,
  p_to date default null, p_category integer default null,
  p_time text default 'any', p_availability text default 'joinable'
) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  if length(coalesce(p_location,'')) > 120 or length(coalesce(p_search,'')) > 120
    or (p_category is not null and p_category not between 1 and 8)
    or p_time not in ('any','morning','afternoon','evening')
    or p_availability not in ('joinable','spots','waitlist','all')
    or (p_from is not null and p_to is not null and p_from > p_to)
  then raise exception 'Invalid discovery filters' using errcode='22023'; end if;
  with candidates as (
    select s.*, coalesce(ss.timezone,'America/Argentina/Buenos_Aires') tz,
      v.name venue_name,v.address venue_address,
      counts.confirmed_count,counts.waitlisted_count,
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
    where s.status='published' and s.visibility='public' and s.starts_at>now()
      and (s.registration_opens_at is null or s.registration_opens_at<=now())
      and (s.registration_closes_at is null or s.registration_closes_at>now())
      and (p_category is null or s.allowed_categories is null or p_category=any(s.allowed_categories))
      and (coalesce(trim(p_location),'')='' or position(lower(trim(p_location)) in lower(concat_ws(' ',v.name,v.address)))>0)
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
    order by starts_at,id limit 501
  ), page as (select * from matching order by starts_at,id limit 500)
  select jsonb_build_object('has_more',(select count(*)>500 from matching),
    'sessions',coalesce(jsonb_agg(jsonb_build_object(
      'id',id,'title',title,'starts_at',starts_at,'ends_at',ends_at,'timezone',tz,
      'capacity',capacity,'confirmed_count',confirmed_count,'waitlist_enabled',waitlist_enabled,
      'waitlist_capacity',waitlist_capacity,'waitlisted_count',waitlisted_count,
      'allowed_categories',allowed_categories,'price_minor',price_minor,'currency',currency,
      'registration_opens_at',registration_opens_at,'registration_closes_at',registration_closes_at,
      'viewer_registration',viewer_registration,'viewer_is_host',viewer_is_host,
      'venue',jsonb_build_object('id',venue_id,'name',venue_name,'address',venue_address)
    ) order by starts_at,id),'[]'::jsonb)) into result from page;
  return result;
end $$;
revoke all on function private.discover_sessions(text,text,date,date,integer,text,text) from public;
grant execute on function private.discover_sessions(text,text,date,date,integer,text,text) to anon, authenticated;
create or replace function public.discover_sessions(
  p_location text default '', p_search text default '', p_from date default null,
  p_to date default null, p_category integer default null,
  p_time text default 'any', p_availability text default 'joinable'
) returns jsonb language sql stable security invoker set search_path = '' as $$
  select private.discover_sessions(p_location,p_search,p_from,p_to,p_category,p_time,p_availability);
$$;
revoke all on function public.discover_sessions(text,text,date,date,integer,text,text) from public;
grant execute on function public.discover_sessions(text,text,date,date,integer,text,text) to anon, authenticated;
