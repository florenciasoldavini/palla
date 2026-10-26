-- The occurrence lock covers the queue decision and write. Open places must not
-- allow newcomers to bypass players already waiting, including in manual mode.
CREATE OR REPLACE FUNCTION private.join_session(p_session_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  actor uuid := auth.uid();
  s public.sessions;
  p public.profiles;
  r public.registrations;
  instant timestamptz;
  next_status text;
begin
  if actor is null then raise exception 'JOIN_SIGN_IN_REQUIRED'; end if;
  if p_session_id is null then raise exception 'JOIN_UNAVAILABLE'; end if;
  select * into s from public.sessions where id=p_session_id for update;
  if s.id is null or s.visibility<>'public' or s.status<>'published'
    or not exists(select 1 from public.organizers where profile_id=s.organizer_id and status='active')
    or not exists(select 1 from public.venues where id=s.venue_id and is_active)
    then raise exception 'JOIN_UNAVAILABLE'; end if;
  if s.organizer_id=actor then raise exception 'JOIN_HOST'; end if;
  select * into p from public.profiles where id=actor for share;
  if p.id is null or p.onboarding_completed_at is null then raise exception 'JOIN_PROFILE_REQUIRED'; end if;
  select * into r from public.registrations where session_id=s.id and player_id=actor for update;
  -- A retry after a lost response must neither reserve twice nor promote a queued player.
  if r.status in ('confirmed','waitlisted') then
    return jsonb_build_object('registration_id',r.id,'status',r.status,
      'confirmed_count',(select count(*) from public.registrations where session_id=s.id and status='confirmed'),
      'waitlisted_count',(select count(*) from public.registrations where session_id=s.id and status='waitlisted'));
  end if;
  if r.status='cancelled' and r.cancelled_by is distinct from actor then raise exception 'JOIN_REMOVED'; end if;
  instant:=clock_timestamp();
  if s.starts_at<=instant or (s.registration_closes_at is not null and s.registration_closes_at<=instant)
    then raise exception 'JOIN_CLOSED'; end if;
  if s.registration_opens_at is not null and s.registration_opens_at>instant then raise exception 'JOIN_NOT_OPEN'; end if;
  if s.strict_category_enforcement and s.allowed_categories is not null
    and (p.category_status<>'known' or p.playing_category is null or not(p.playing_category=any(s.allowed_categories)))
    then raise exception 'JOIN_CATEGORY'; end if;
  next_status:='confirmed';
  if (select count(*) from public.registrations where session_id=s.id and status='confirmed')>=s.capacity
    or exists(select 1 from public.registrations where session_id=s.id and status='waitlisted') then
    if not s.waitlist_enabled then
      if exists(select 1 from public.registrations where session_id=s.id and status='waitlisted') then raise exception 'JOIN_WAITLIST_CLOSED'; end if;
      raise exception 'JOIN_FULL';
    end if;
    if s.waitlist_capacity is not null and (select count(*) from public.registrations where session_id=s.id and status='waitlisted')>=s.waitlist_capacity then raise exception 'JOIN_WAITLIST_FULL'; end if;
    next_status:='waitlisted';
  end if;
  if r.id is null then
    insert into public.registrations(session_id,player_id,status,confirmed_at)
      values(s.id,actor,next_status,case when next_status='confirmed' then instant end) returning * into r;
  else
    update public.registrations set status=next_status,joined_at=instant,confirmed_at=case when next_status='confirmed' then instant end,
      waitlist_sequence=null,cancelled_at=null,cancelled_by=null,cancellation_reason=null,
      checked_in_at=null,checked_in_by=null where id=r.id returning * into r;
  end if;
  -- AFTER triggers may have promoted a queued entry; report authoritative status.
  select * into r from public.registrations where id=r.id;
  perform private.notify_registration_host(r.id,case when r.status='waitlisted' then 'waitlist_joins' else 'new_registrations' end);
  return jsonb_build_object('registration_id',r.id,'status',r.status,
    'confirmed_count',(select count(*) from public.registrations where session_id=s.id and status='confirmed'),
      'waitlisted_count',(select count(*) from public.registrations where session_id=s.id and status='waitlisted'));
end; $function$;

-- A cancelled player rejoining an automatic queue must trigger the same
-- first-eligible fill as a newly inserted queue entry, in this transaction.
create or replace function private.refresh_waitlist_after_registration() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if (new.status='waitlisted' and (tg_op='INSERT' or old.status<>'waitlisted')) or
    (tg_op='UPDATE' and old.status='confirmed' and new.status='cancelled') then
   perform private.fill_waitlist(new.session_id);
 end if;
 return new;
end;
$$;

-- Keep the paged discovery availability filters consistent with admission.
-- Preserve the existing cursor, geographic, category, and ordering logic.
do $migration$
declare definition text;
begin
 definition:=pg_get_functiondef('private.discover_sessions_page(text,text,date,date,integer,text,text,integer,integer,text,text,text,text[],text[],text,double precision,double precision,integer,integer,jsonb,jsonb,integer)'::regprocedure);
 if position('confirmed_count<capacity' in definition)=0 or position('confirmed_count>=capacity and waitlist_enabled' in definition)=0
 then raise exception 'Discovery availability definition changed; review waitlist priority migration';end if;
 definition:=replace(definition,'confirmed_count<capacity','(confirmed_count<capacity and waitlisted_count=0)');
 definition:=replace(definition,'confirmed_count>=capacity and waitlist_enabled','(confirmed_count>=capacity or waitlisted_count>0) and waitlist_enabled');
 execute definition;
end $migration$;
