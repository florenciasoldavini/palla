-- Read-only organizer analytics. All performance numbers use completed occurrences.
create function private.organizer_dashboard_period(p_period text,p_now timestamptz default now())
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare
 zone constant text := 'America/Argentina/Buenos_Aires';
 local_now timestamp := p_now at time zone zone;
 start_local timestamp; end_local timestamp; previous_start timestamp; previous_end timestamp;
begin
 if p_period is null or p_period not in ('this_month','last_month') then
  raise exception 'Invalid dashboard period' using errcode='22023';
 end if;
 start_local:=date_trunc('month',local_now);
 if p_period='last_month' then
  end_local:=start_local; start_local:=start_local-interval '1 month';
  previous_start:=start_local-interval '1 month'; previous_end:=start_local;
 else
  end_local:=local_now; previous_start:=start_local-interval '1 month';
  previous_end:=least(start_local,previous_start+(end_local-start_local));
 end if;
 return jsonb_build_object('start_at',start_local at time zone zone,'end_at',end_local at time zone zone,
  'previous_start_at',previous_start at time zone zone,'previous_end_at',previous_end at time zone zone,
  'timezone',zone,'start_date',start_local::date,'end_date',(end_local-interval '1 microsecond')::date,
  'previous_start_date',previous_start::date,'previous_end_date',(previous_end-interval '1 microsecond')::date);
end$$;
revoke all on function private.organizer_dashboard_period(text,timestamptz) from public,anon,authenticated;

create function private.organizer_dashboard_reviews(p_period text,p_cursor jsonb default null,p_limit integer default 20)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
 actor uuid:=auth.uid(); bounds jsonb; cursor_time timestamptz; cursor_id uuid; result jsonb;
begin
 if actor is null or not exists(select 1 from public.organizers where profile_id=actor and status='active') then
  raise exception 'Organizer access required' using errcode='42501';
 end if;
 bounds:=private.organizer_dashboard_period(p_period);
 if p_limit is null or p_limit not between 1 and 20 then raise exception 'Invalid review limit' using errcode='22023';end if;
 if p_cursor is not null then
  cursor_time:=(p_cursor->>'created_at')::timestamptz;cursor_id:=(p_cursor->>'id')::uuid;
  if jsonb_typeof(p_cursor)<>'object' or cursor_time is null or cursor_id is null or not isfinite(cursor_time) then
   raise exception 'Invalid review cursor' using errcode='22023';
  end if;
 end if;
 with eligible as materialized (
  select r.id,r.registration_id,r.rating,r.comment,r.created_at,
   coalesce(nullif(btrim(concat_ws(' ',p.first_name,p.last_name)),''),'Player') as reviewer_name,
   p.avatar_url as reviewer_avatar_url,s.title as session_title,s.starts_at as session_starts_at
  from public.session_reviews r join public.sessions s on s.id=r.session_id
  join public.profiles p on p.id=r.reviewer_id
  where s.organizer_id=actor and r.organizer_id=actor and r.status='published'
   and s.status='completed' and s.ends_at<=now()
   and s.starts_at>=(bounds->>'start_at')::timestamptz and s.starts_at<(bounds->>'end_at')::timestamptz
 ), candidates as materialized (
  select * from eligible where p_cursor is null or (created_at,id)<(cursor_time,cursor_id)
  order by created_at desc,id desc limit p_limit+1
 ), page as materialized (select * from candidates order by created_at desc,id desc limit p_limit)
 select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(page) order by created_at desc,id desc) from page),'[]'::jsonb),
  'next_cursor',case when (select count(*) from candidates)>p_limit then
   (select jsonb_build_object('created_at',created_at,'id',id) from page order by created_at,id limit 1) else null end)
 into result;
 return result;
end$$;
revoke all on function private.organizer_dashboard_reviews(text,jsonb,integer) from public,anon;
grant execute on function private.organizer_dashboard_reviews(text,jsonb,integer) to authenticated;
create function public.get_organizer_dashboard_reviews(p_period text default 'this_month',p_cursor jsonb default null,p_limit integer default 20)
returns jsonb language sql stable security invoker set search_path='' as $$
 select private.organizer_dashboard_reviews(p_period,p_cursor,p_limit)
$$;
revoke all on function public.get_organizer_dashboard_reviews(text,jsonb,integer) from public,anon;
grant execute on function public.get_organizer_dashboard_reviews(text,jsonb,integer) to authenticated;

create function private.organizer_dashboard(p_period text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
 actor uuid:=auth.uid(); bounds jsonb; start_at timestamptz; end_at timestamptz;
 previous_start timestamptz; previous_end timestamptz; zone text; result jsonb;
begin
 if actor is null or not exists(select 1 from public.organizers where profile_id=actor and status='active') then
  raise exception 'Organizer access required' using errcode='42501';
 end if;
 bounds:=private.organizer_dashboard_period(p_period);
 start_at:=(bounds->>'start_at')::timestamptz;end_at:=(bounds->>'end_at')::timestamptz;
 previous_start:=(bounds->>'previous_start_at')::timestamptz;previous_end:=(bounds->>'previous_end_at')::timestamptz;
 zone:=bounds->>'timezone';
 with completed as materialized (
  select s.id,s.starts_at,s.capacity,
   (select count(*) from public.registrations r where r.session_id=s.id and r.status='confirmed' and r.player_id<>actor) as bookings,
   case when s.starts_at>=start_at then 'current' else 'previous' end as period
  from public.sessions s where s.organizer_id=actor and s.status='completed' and s.ends_at<=now()
   and ((s.starts_at>=start_at and s.starts_at<end_at) or (s.starts_at>=previous_start and s.starts_at<previous_end))
 ), summary as (
  select periods.period,count(c.id)::int as sessions,coalesce(sum(c.bookings),0)::int as bookings,
   coalesce(sum(c.capacity),0)::int as capacity,
   case when sum(c.capacity)>0 then round(100.0*sum(c.bookings)/sum(c.capacity),1) else null end as fill_rate,
   (select round(avg(r.rating),1) from public.session_reviews r join completed x on x.id=r.session_id
    where x.period=periods.period and r.organizer_id=actor and r.status='published') as average_rating,
   (select count(*)::int from public.session_reviews r join completed x on x.id=r.session_id
    where x.period=periods.period and r.organizer_id=actor and r.status='published') as review_count
  from (values('current'),('previous')) periods(period) left join completed c on c.period=periods.period group by periods.period
 ), daily as (
  select period,extract(day from starts_at at time zone zone)::int as day,sum(bookings)::int as bookings
  from completed group by period,extract(day from starts_at at time zone zone)
 ), days as (
  select generate_series(1,greatest(extract(day from (end_at at time zone zone)-interval '1 microsecond')::int,
   extract(day from (previous_end at time zone zone)-interval '1 microsecond')::int)) as day
 ), chart as (
  select days.day,sum(coalesce(c.bookings,0)) over(order by days.day)::int as current,
   sum(coalesce(p.bookings,0)) over(order by days.day)::int as previous
  from days left join daily c on c.period='current' and c.day=days.day
  left join daily p on p.period='previous' and p.day=days.day
 ), upcoming as materialized (
  select s.id,s.title,s.starts_at,s.ends_at,s.capacity,v.name as venue_name,
   (select count(*)::int from public.registrations r where r.session_id=s.id and r.status='confirmed' and r.player_id<>actor) as confirmed_count
  from public.sessions s join public.venues v on v.id=s.venue_id
  where s.organizer_id=actor and s.status='published' and s.starts_at>now()
  order by s.starts_at,s.id
 ), attention as (
  select * from upcoming where starts_at<=now()+interval '48 hours' and confirmed_count*2<capacity
  order by starts_at,id limit 3
 ), unread as (
  select count(*)::int as count from public.chat_conversations c
  left join public.chat_preferences pref on pref.conversation_id=c.id and pref.profile_id=actor
  left join public.chat_reads reads on reads.conversation_id=c.id and reads.profile_id=actor
  where c.organizer_id=actor and (
   coalesce(pref.marked_unread,false) or exists(select 1 from public.chat_messages m
    where m.conversation_id=c.id and m.sender_id<>actor and m.deleted_at is null
     and m.sequence>greatest(coalesce(reads.through_sequence,0),coalesce(pref.cleared_through_sequence,0)))
   ) and (not coalesce(pref.hidden,false) or exists(select 1 from public.chat_messages m
    where m.conversation_id=c.id and m.sequence>coalesce(pref.cleared_through_sequence,0)))
 )
 select jsonb_build_object('period',p_period,'bounds',bounds,
  'current',(select to_jsonb(summary)-'period' from summary where period='current'),
  'previous',(select to_jsonb(summary)-'period' from summary where period='previous'),
  'chart',coalesce((select jsonb_agg(to_jsonb(chart) order by day) from chart),'[]'::jsonb),
  'attention',coalesce((select jsonb_agg(to_jsonb(attention) order by starts_at,id) from attention),'[]'::jsonb),
  'unread_conversations',(select count from unread),
  'next_session',(select to_jsonb(x) from (select * from upcoming order by starts_at,id limit 1)x),
  'recent_reviews',private.organizer_dashboard_reviews(p_period,null,2)->'items',
  'generated_at',now()) into result;
 return result;
end$$;
revoke all on function private.organizer_dashboard(text) from public,anon;
grant execute on function private.organizer_dashboard(text) to authenticated;
create function public.get_organizer_dashboard(p_period text default 'this_month')
returns jsonb language sql stable security invoker set search_path='' as $$select private.organizer_dashboard(p_period)$$;
revoke all on function public.get_organizer_dashboard(text) from public,anon;
grant execute on function public.get_organizer_dashboard(text) to authenticated;
