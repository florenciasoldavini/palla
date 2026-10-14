-- Organizer roster/attendance foundation. Player registration flows are deferred.
create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete restrict,
  player_id uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'confirmed' check (status in ('confirmed','waitlisted','cancelled')),
  joined_at timestamptz not null default now(),
  waitlist_sequence bigint check (waitlist_sequence > 0),
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  cancelled_by uuid references public.profiles(id) on delete restrict,
  cancellation_reason text check (length(cancellation_reason) <= 1000),
  checked_in_at timestamptz,
  checked_in_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(session_id,player_id),
  check (status <> 'confirmed' or confirmed_at is not null),
  check (status <> 'waitlisted' or (waitlist_sequence is not null and confirmed_at is null)),
  check ((status='cancelled') = (cancelled_at is not null)),
  check ((status='cancelled') = (cancelled_by is not null)),
  check ((checked_in_at is null) = (checked_in_by is null)),
  check (checked_in_at is null or status='confirmed')
);
create index registrations_player on public.registrations(player_id);
create index registrations_confirmed on public.registrations(session_id) where status='confirmed';
create index registrations_queue on public.registrations(session_id,waitlist_sequence) where status='waitlisted';
alter table public.registrations enable row level security;
revoke all on public.registrations from public,anon,authenticated;
grant select on public.registrations to authenticated;
grant all on public.registrations to service_role;
create policy registrations_organizer_read on public.registrations for select to authenticated using (
  session_id in (select id from public.sessions where organizer_id=(select auth.uid()))
);

-- Backend writes and organizer edits serialize on the same occurrence row.
create function private.guard_registration() returns trigger
language plpgsql security definer set search_path='' as $$
declare s public.sessions;
begin
  select * into s from public.sessions where id=new.session_id for update;
  if tg_op='UPDATE' and (new.id<>old.id or new.session_id<>old.session_id or new.player_id<>old.player_id) then
    raise exception 'Registration identity cannot change';
  end if;
  if new.status in ('confirmed','waitlisted') then
    if s.status<>'published' then raise exception 'Session unavailable'; end if;
    if new.status='confirmed' and (select count(*) from public.registrations where session_id=new.session_id and status='confirmed' and id<>new.id)>=s.capacity then
      raise exception 'Session capacity exceeded';
    end if;
  end if;
  new.updated_at:=clock_timestamp();
  return new;
end;
$$;
revoke all on function private.guard_registration() from public,anon,authenticated;
create trigger guard_registration before insert or update on public.registrations for each row execute function private.guard_registration();

create function private.guard_registered_capacity() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.capacity<(select count(*) from public.registrations where session_id=new.id and status='confirmed') then
    raise exception 'Capacity cannot be below confirmed attendance';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_registered_capacity() from public,anon,authenticated;
create trigger guard_registered_capacity before update of capacity on public.sessions for each row execute function private.guard_registered_capacity();

-- Session cancellation keeps roster history, clears active arrival marks.
create function private.cancel_session_registrations() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.status='cancelled' and old.status<>'cancelled' then
    update public.registrations set status='cancelled',cancelled_at=new.cancelled_at,
      cancelled_by=new.organizer_id,cancellation_reason=new.cancellation_reason,
      checked_in_at=null,checked_in_by=null
    where session_id=new.id and status in ('confirmed','waitlisted');
  end if;
  return new;
end;
$$;
revoke all on function private.cancel_session_registrations() from public,anon,authenticated;
create trigger cancel_session_registrations after update of status on public.sessions for each row execute function private.cancel_session_registrations();

-- Narrow authorized entrypoints: no generic player directory or direct writes.
create function private.organizer_roster(p_session_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if auth.uid() is null or not exists (
    select 1 from public.sessions s join public.organizers o on o.profile_id=s.organizer_id
    where s.id=p_session_id and s.organizer_id=auth.uid() and o.status='active'
  ) then raise exception 'Organizer access required'; end if;
  return coalesce((select jsonb_agg(
    (to_jsonb(r)||jsonb_build_object('waitlist_sequence',r.waitlist_sequence::text))||
    jsonb_build_object('player',jsonb_build_object('first_name',p.first_name,'last_name',p.last_name,'avatar_url',p.avatar_url,'playing_category',p.playing_category))
    order by r.joined_at,r.id)
    from public.registrations r join public.profiles p on p.id=r.player_id
    where r.session_id=p_session_id and r.status='confirmed'),'[]'::jsonb);
end;
$$;
create function public.get_organizer_roster(p_session_id uuid) returns jsonb
language sql stable security invoker set search_path='' as $$ select private.organizer_roster(p_session_id); $$;

create function private.mark_arrival(p_registration_id uuid,p_arrived boolean,p_expected_version timestamptz) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.registrations; s public.sessions;
begin
  if auth.uid() is null or p_arrived is null or p_expected_version is null then raise exception 'Invalid attendance request'; end if;
  -- Resolve without locking; then always lock session before registration.
  select s0.* into s from public.sessions s0 join public.registrations r0 on r0.session_id=s0.id where r0.id=p_registration_id;
  if s.id is null or s.organizer_id<>auth.uid() or not exists(select 1 from public.organizers where profile_id=auth.uid() and status='active') then raise exception 'Organizer access required'; end if;
  select * into s from public.sessions where id=s.id for update;
  select * into r from public.registrations where id=p_registration_id for update;
  if s.status<>'published' or r.status<>'confirmed' then raise exception 'Attendance unavailable'; end if;
  -- Identical retries are harmless; conflicting stale actions are rejected.
  if (r.checked_in_at is not null)=p_arrived then
    return to_jsonb(r)||jsonb_build_object('waitlist_sequence',r.waitlist_sequence::text);
  end if;
  if r.updated_at<>p_expected_version then raise exception 'Attendance changed. Reload before saving'; end if;
  update public.registrations set checked_in_at=case when p_arrived then clock_timestamp() end,
    checked_in_by=case when p_arrived then auth.uid() end where id=r.id returning * into r;
  return to_jsonb(r)||jsonb_build_object('waitlist_sequence',r.waitlist_sequence::text);
end;
$$;
create function public.set_registration_attendance(p_registration_id uuid,p_arrived boolean,p_expected_version timestamptz) returns jsonb
language sql security invoker set search_path='' as $$ select private.mark_arrival(p_registration_id,p_arrived,p_expected_version); $$;
revoke all on function private.organizer_roster(uuid),private.mark_arrival(uuid,boolean,timestamptz),public.get_organizer_roster(uuid),public.set_registration_attendance(uuid,boolean,timestamptz) from public,anon;
grant usage on schema private to authenticated;
grant execute on function private.organizer_roster(uuid),private.mark_arrival(uuid,boolean,timestamptz),public.get_organizer_roster(uuid),public.set_registration_attendance(uuid,boolean,timestamptz) to authenticated;
