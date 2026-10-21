-- One authenticated player joins one public occurrence. Never trust a client player ID.
-- The existing registration trigger uses the same occurrence lock for capacity/cancellation.
create function private.join_session(p_session_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  actor uuid := auth.uid();
  s public.sessions;
  p public.profiles;
  r public.registrations;
  instant timestamptz;
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
      'confirmed_count',(select count(*) from public.registrations where session_id=s.id and status='confirmed'));
  end if;
  if r.status='cancelled' and r.cancelled_by is distinct from actor then raise exception 'JOIN_REMOVED'; end if;
  instant:=clock_timestamp();
  if s.starts_at<=instant or (s.registration_closes_at is not null and s.registration_closes_at<=instant)
    then raise exception 'JOIN_CLOSED'; end if;
  if s.registration_opens_at is not null and s.registration_opens_at>instant then raise exception 'JOIN_NOT_OPEN'; end if;
  if s.strict_category_enforcement and s.allowed_categories is not null
    and (p.category_status<>'known' or p.playing_category is null or not(p.playing_category=any(s.allowed_categories)))
    then raise exception 'JOIN_CATEGORY'; end if;
  if (select count(*) from public.registrations where session_id=s.id and status='confirmed')>=s.capacity
    then raise exception 'JOIN_FULL'; end if;
  if r.id is null then
    insert into public.registrations(session_id,player_id,status,confirmed_at)
      values(s.id,actor,'confirmed',instant) returning * into r;
  else
    update public.registrations set status='confirmed',joined_at=instant,confirmed_at=instant,
      waitlist_sequence=null,cancelled_at=null,cancelled_by=null,cancellation_reason=null,
      checked_in_at=null,checked_in_by=null where id=r.id returning * into r;
  end if;
  return jsonb_build_object('registration_id',r.id,'status',r.status,
    'confirmed_count',(select count(*) from public.registrations where session_id=s.id and status='confirmed'));
end; $$;
create function public.join_session(p_session_id uuid) returns jsonb
language sql security invoker set search_path='' as $$select private.join_session(p_session_id)$$;
revoke all on function private.join_session(uuid), public.join_session(uuid) from public,anon;
grant execute on function private.join_session(uuid), public.join_session(uuid) to authenticated;
comment on function public.join_session(uuid) is 'Reserve one confirmed place for auth.uid() in an eligible public occurrence. Serialized with roster changes; no waitlist enrollment or payments.';
