-- Organizer-owned drafts and bounded series; dated occurrences remain authoritative.
create table public.venues (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id),
  google_place_id text unique,
  name text not null check (length(btrim(name)) between 1 and 160),
  address text not null check (length(btrim(address)) between 1 and 300),
  arrival_instructions text check (length(arrival_instructions) <= 1000),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index venues_manual_identity on public.venues (lower(btrim(name)), lower(btrim(address))) where google_place_id is null;
create index venues_created_by on public.venues(created_by);

create table public.session_series (
  id uuid primary key,
  organizer_id uuid not null references public.organizers(profile_id),
  draft_input jsonb not null check (jsonb_typeof(draft_input) = 'object' and octet_length(draft_input::text) <= 16000),
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index session_series_organizer on public.session_series(organizer_id, status);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.organizers(profile_id),
  series_id uuid not null references public.session_series(id) on delete restrict,
  occurrence_date date not null,
  venue_id uuid not null references public.venues(id),
  title text not null check (length(btrim(title)) between 1 and 120),
  description text check (length(description) <= 2000),
  court_label text check (length(court_label) <= 80),
  capacity integer not null check (capacity between 1 and 32767),
  category_min smallint check (category_min between 1 and 8),
  category_max smallint check (category_max between 1 and 8),
  price_minor integer not null check (price_minor >= 0),
  currency text not null default 'ARS' check (currency = 'ARS'),
  payment_instructions text check (length(payment_instructions) <= 1000),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  registration_closes_at timestamptz not null,
  cancellation_deadline_at timestamptz not null,
  status text not null default 'published' check (status in ('published', 'cancelled', 'completed')),
  cancelled_at timestamptz,
  cancellation_reason text check (length(cancellation_reason) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(series_id, occurrence_date),
  check ((category_min is null and category_max is null) or (category_min is not null and category_max is not null and category_min <= category_max)),
  check (ends_at > starts_at and registration_closes_at <= starts_at and cancellation_deadline_at <= starts_at),
  check ((status = 'cancelled') = (cancelled_at is not null))
);
create index sessions_organizer_start on public.sessions(organizer_id, starts_at);
create index sessions_venue on public.sessions(venue_id);

alter table public.venues enable row level security;
alter table public.session_series enable row level security;
alter table public.sessions enable row level security;
revoke all on public.venues, public.session_series, public.sessions from anon, authenticated;
grant select, insert on public.venues to authenticated;
grant select, insert, update, delete on public.session_series to authenticated;
grant select, insert, update on public.sessions to authenticated;
grant all on public.venues, public.session_series, public.sessions to service_role;

create policy venues_read on public.venues for select to authenticated using (is_active);
create policy venues_create on public.venues for insert to authenticated with check (
  created_by = (select auth.uid()) and exists (select 1 from public.organizers where profile_id = (select auth.uid()) and status = 'active')
);
create policy series_read on public.session_series for select to authenticated using (organizer_id = (select auth.uid()));
create policy series_create on public.session_series for insert to authenticated with check (
  organizer_id = (select auth.uid()) and exists (select 1 from public.organizers where profile_id = (select auth.uid()) and status = 'active')
);
create policy series_update on public.session_series for update to authenticated using (
  organizer_id = (select auth.uid()) and exists (select 1 from public.organizers where profile_id = (select auth.uid()) and status = 'active')
) with check (organizer_id = (select auth.uid()));
create policy series_delete_draft on public.session_series for delete to authenticated using (
  organizer_id = (select auth.uid()) and status = 'draft' and exists (select 1 from public.organizers where profile_id = (select auth.uid()) and status = 'active')
);
create policy sessions_read on public.sessions for select to authenticated using (organizer_id = (select auth.uid()));
create policy sessions_create on public.sessions for insert to authenticated with check (
  organizer_id = (select auth.uid()) and exists (select 1 from public.organizers where profile_id = (select auth.uid()) and status = 'active')
  and exists (select 1 from public.session_series where id = series_id and organizer_id = (select auth.uid()) and status = 'published')
);
create policy sessions_update on public.sessions for update to authenticated using (
  organizer_id = (select auth.uid()) and exists (select 1 from public.organizers where profile_id = (select auth.uid()) and status = 'active')
) with check (organizer_id = (select auth.uid()) and exists (select 1 from public.session_series where id = series_id and organizer_id = (select auth.uid()) and status = 'published'));

create function private.guard_session_change() returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.organizer_id <> old.organizer_id or new.id <> old.id then raise exception 'Session ownership cannot change'; end if;
  if tg_table_name = 'sessions' then
    if new.series_id <> old.series_id or new.occurrence_date <> old.occurrence_date then raise exception 'Occurrence identity cannot change'; end if;
    if old.status <> 'published' or old.starts_at <= now() or new.starts_at <= now() then raise exception 'This session can no longer be changed'; end if;
  elsif old.status = 'published' and new.status <> 'published' then
    raise exception 'Published series cannot become drafts';
  end if;
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
revoke all on function private.guard_session_change() from public;
create trigger guard_session_change before update on public.sessions for each row execute function private.guard_session_change();
create trigger guard_series_change before update on public.session_series for each row execute function private.guard_session_change();

-- One transaction saves partial drafts or publishes/edits occurrences. Invoker + RLS
-- enforce ownership on every row. Versions reject stale edits instead of overwriting.
create function public.save_organizer_session(p_id uuid, p_input jsonb, p_publish boolean, p_session_id uuid default null, p_scope text default 'one', p_expected_version timestamptz default null)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  existing public.session_series;
  target public.sessions;
  venue uuid;
  first_date date;
  last_date date;
  day date;
  start_time time;
  end_time time;
  start_instant timestamptz;
  end_instant timestamptz;
  date_shift integer;
  reg_hours integer;
  cancel_hours integer;
  category_low integer;
  category_high integer;
begin
  if not exists (select 1 from public.organizers where profile_id = auth.uid() and status = 'active') then raise exception 'Organizer access required'; end if;
  if p_id is null or p_publish is null or p_scope not in ('one', 'future') or p_scope is null then raise exception 'Invalid session request'; end if;
  select * into existing from public.session_series where id = p_id for update;
  if existing.id is null then
    if p_session_id is not null or p_expected_version is not null then raise exception 'Session not found'; end if;
    insert into public.session_series(id, organizer_id, draft_input) values (p_id, auth.uid(), p_input) returning * into existing;
  elsif p_session_id is null and existing.status = 'published' then
    -- Retried publish with the same request ID must not create duplicate occurrences.
    if p_publish and p_expected_version is null then return p_id; end if;
    raise exception 'Open an occurrence to edit this series';
  elsif p_session_id is null and (p_expected_version is null or existing.updated_at <> p_expected_version) then
    raise exception 'Session changed. Reload before saving';
  end if;
  if not p_publish then
    if existing.status <> 'draft' or p_session_id is not null then raise exception 'Only drafts can be saved as drafts'; end if;
    update public.session_series set draft_input = p_input where id = p_id;
    return p_id;
  end if;
  first_date := (p_input->>'date')::date;
  last_date := case when p_input->>'repeat' = 'weekly' then (p_input->>'lastDate')::date else first_date end;
  start_time := (p_input->>'startTime')::time;
  end_time := (p_input->>'endTime')::time;
  start_instant := (first_date + start_time) at time zone 'America/Argentina/Buenos_Aires';
  end_instant := (first_date + end_time) at time zone 'America/Argentina/Buenos_Aires';
  reg_hours := (p_input->>'registrationHours')::integer;
  cancel_hours := (p_input->>'cancellationHours')::integer;
  if first_date is null or last_date is null or last_date < first_date or last_date - first_date > 357
    or start_instant is null or end_instant is null or start_instant <= now() or end_instant <= start_instant
    or reg_hours is null or cancel_hours is null or reg_hours not between 0 and 720 or cancel_hours not between 0 and 720
    or p_input->>'repeat' not in ('once', 'weekly') or p_input->>'repeat' is null
    or p_input->>'categoryMode' not in ('all', 'range') or p_input->>'categoryMode' is null
    or coalesce((p_input->>'courtConfirmed')::boolean, false) = false then raise exception 'Check the schedule and court confirmation'; end if;
  if p_input->>'categoryMode' = 'range' then
    category_low := (p_input->>'categoryMin')::integer;
    category_high := (p_input->>'categoryMax')::integer;
    if category_low is null or category_high is null then raise exception 'Choose both categories'; end if;
  end if;
  venue := nullif(p_input->>'venueId', '')::uuid;
  if venue is null then
    insert into public.venues(created_by, name, address) values (auth.uid(), btrim(p_input->>'venueName'), btrim(p_input->>'venueAddress'))
    on conflict (lower(btrim(name)), lower(btrim(address))) where google_place_id is null do nothing returning id into venue;
    if venue is null then select id into venue from public.venues where lower(btrim(name)) = lower(btrim(p_input->>'venueName')) and lower(btrim(address)) = lower(btrim(p_input->>'venueAddress')) and google_place_id is null; end if;
  end if;
  if not exists (select 1 from public.venues where id = venue and is_active) then raise exception 'Choose an available venue'; end if;
  if p_session_id is null then
    update public.session_series set draft_input = p_input, status = 'published' where id = p_id;
    day := first_date;
    while day <= last_date loop
      insert into public.sessions(organizer_id, series_id, occurrence_date, venue_id, title, description, court_label, capacity, category_min, category_max, price_minor, starts_at, ends_at, registration_closes_at, cancellation_deadline_at)
      values(auth.uid(), p_id, day, venue, btrim(p_input->>'title'), nullif(btrim(p_input->>'description'), ''), nullif(btrim(p_input->>'courtLabel'), ''), (p_input->>'capacity')::integer, category_low, category_high, ((p_input->>'price')::numeric * 100)::integer,
        (day + start_time) at time zone 'America/Argentina/Buenos_Aires', (day + end_time) at time zone 'America/Argentina/Buenos_Aires',
        ((day + start_time) at time zone 'America/Argentina/Buenos_Aires') - make_interval(hours => reg_hours), ((day + start_time) at time zone 'America/Argentina/Buenos_Aires') - make_interval(hours => cancel_hours));
      day := day + 7;
    end loop;
  else
    select * into target from public.sessions where id = p_session_id and series_id = p_id for update;
    if target.id is null or target.status <> 'published' or target.starts_at <= now() then raise exception 'This session can no longer be changed'; end if;
    if p_expected_version is null or target.updated_at <> p_expected_version then raise exception 'Session changed. Reload before saving'; end if;
    -- Lock the entire scope before the update; cancelled and past occurrences are untouched.
    perform id from public.sessions where series_id = p_id and status = 'published' and starts_at > now() and (id = p_session_id or (p_scope = 'future' and occurrence_date >= target.occurrence_date)) order by id for update;
    date_shift := first_date - (target.starts_at at time zone 'America/Argentina/Buenos_Aires')::date;
    update public.sessions set venue_id = venue, title = btrim(p_input->>'title'), description = nullif(btrim(p_input->>'description'), ''), court_label = nullif(btrim(p_input->>'courtLabel'), ''), capacity = (p_input->>'capacity')::integer,
      category_min = category_low, category_max = category_high, price_minor = ((p_input->>'price')::numeric * 100)::integer,
      starts_at = (((starts_at at time zone 'America/Argentina/Buenos_Aires')::date + date_shift) + start_time) at time zone 'America/Argentina/Buenos_Aires',
      ends_at = (((starts_at at time zone 'America/Argentina/Buenos_Aires')::date + date_shift) + end_time) at time zone 'America/Argentina/Buenos_Aires',
      registration_closes_at = ((((starts_at at time zone 'America/Argentina/Buenos_Aires')::date + date_shift) + start_time) at time zone 'America/Argentina/Buenos_Aires') - make_interval(hours => reg_hours),
      cancellation_deadline_at = ((((starts_at at time zone 'America/Argentina/Buenos_Aires')::date + date_shift) + start_time) at time zone 'America/Argentina/Buenos_Aires') - make_interval(hours => cancel_hours)
    where series_id = p_id and status = 'published' and starts_at > now() and (id = p_session_id or (p_scope = 'future' and occurrence_date >= target.occurrence_date));
    -- An edit changes existing occurrences only; it never extends the series silently.
  end if;
  return p_id;
end;
$$;
revoke all on function public.save_organizer_session(uuid,jsonb,boolean,uuid,text,timestamptz) from public, anon;
grant execute on function public.save_organizer_session(uuid,jsonb,boolean,uuid,text,timestamptz) to authenticated;

create function public.cancel_organizer_session(p_session_id uuid, p_scope text, p_reason text, p_expected_version timestamptz)
returns integer language plpgsql security invoker set search_path = '' as $$
declare target public.sessions; affected integer;
begin
  if p_scope not in ('one', 'future') or p_scope is null then raise exception 'Choose a cancellation scope'; end if;
  -- Same series-first lock order as save; prevents concurrent scope mutations.
  perform ss.id from public.session_series ss join public.sessions s on s.series_id = ss.id where s.id = p_session_id for update of ss;
  select * into target from public.sessions where id = p_session_id for update;
  if target.id is null or target.status <> 'published' or target.starts_at <= now() then raise exception 'This session can no longer be changed'; end if;
  if p_expected_version is null or target.updated_at <> p_expected_version then raise exception 'Session changed. Reload before saving'; end if;
  update public.sessions set status = 'cancelled', cancelled_at = now(), cancellation_reason = nullif(btrim(p_reason), '')
  where series_id = target.series_id and status = 'published' and starts_at > now() and (id = target.id or (p_scope = 'future' and occurrence_date >= target.occurrence_date));
  get diagnostics affected = row_count;
  return affected;
end;
$$;
revoke all on function public.cancel_organizer_session(uuid,text,text,timestamptz) from public, anon;
grant execute on function public.cancel_organizer_session(uuid,text,text,timestamptz) to authenticated;
