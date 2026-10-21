-- Normalized published template; incomplete drafts remain in draft_input.
alter table public.session_series disable trigger guard_series_change;
alter table public.sessions disable trigger guard_session_change;
alter table public.session_series drop constraint session_series_status_check;
alter table public.session_series
  add column venue_id uuid references public.venues(id),
  add column title text check (length(btrim(title)) between 1 and 120),
  add column description text check (length(description)<=2000),
  add column court_label text check (length(court_label)<=80),
  add column capacity integer check (capacity between 1 and 32767),
  add column recurrence text check (recurrence in ('once','weekly')),
  add column timezone text not null default 'America/Argentina/Buenos_Aires' check (timezone='America/Argentina/Buenos_Aires'),
  add column weekday smallint check (weekday between 1 and 7),
  add column local_start_time time,
  add column duration_minutes integer check (duration_minutes between 1 and 1439),
  add column starts_on date,
  add column ends_on date,
  add column participant_gender_policy text not null default 'all' check (participant_gender_policy in ('all','women_only','men_only'));
alter table public.sessions add column participant_gender_policy text not null default 'all' check (participant_gender_policy in ('all','women_only','men_only'));
-- Use saved publication template, not an individually overridden occurrence.
update public.session_series s set status='active',
  venue_id=(select venue_id from public.sessions o where o.series_id=s.id order by occurrence_date limit 1),
  title=btrim(draft_input->>'title'), description=nullif(btrim(draft_input->>'description'),''), court_label=nullif(btrim(draft_input->>'courtLabel'),''), capacity=(draft_input->>'capacity')::integer,
  recurrence=draft_input->>'repeat', weekday=extract(isodow from (draft_input->>'date')::date)::integer,
  local_start_time=(draft_input->>'startTime')::time,
  duration_minutes=extract(epoch from ((draft_input->>'endTime')::time-(draft_input->>'startTime')::time))::integer/60,
  starts_on=(draft_input->>'date')::date, ends_on=case when draft_input->>'repeat'='weekly' then (draft_input->>'lastDate')::date else (draft_input->>'date')::date end
where status='published';
alter table public.session_series add constraint session_series_status_check check (status in ('draft','active','paused','ended')),
  add constraint series_published_template check (status='draft' or (venue_id is not null and title is not null and capacity is not null and recurrence is not null and weekday is not null and local_start_time is not null and duration_minutes is not null and starts_on is not null and ends_on is not null)),
  add constraint series_date_bounds check (ends_on>=starts_on and ends_on-starts_on<=357),
  add constraint series_weekday check (weekday=extract(isodow from starts_on)),
  add constraint series_one_off check (recurrence<>'once' or (ends_on=starts_on and status<>'paused'));
create or replace function private.guard_session_change() returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if new.organizer_id<>old.organizer_id or new.id<>old.id then raise exception 'Session ownership cannot change'; end if;
  if tg_table_name='sessions' then
    if new.series_id<>old.series_id or new.occurrence_date<>old.occurrence_date then raise exception 'Occurrence identity cannot change'; end if;
    if old.status<>'published' or old.starts_at<=now() or new.starts_at<=now() then raise exception 'This session can no longer be changed'; end if;
  elsif new.status<>old.status then
    if not ((old.status='draft' and new.status='active') or (old.status='active' and new.status in ('paused','ended')) or (old.status='paused' and new.status in ('active','ended'))) then raise exception 'Invalid series transition'; end if;
  end if;
  new.updated_at:=clock_timestamp(); return new;
end; $$;
alter table public.session_series enable trigger guard_series_change;
alter table public.sessions enable trigger guard_session_change;
drop policy sessions_create on public.sessions;
create policy sessions_create on public.sessions for insert to authenticated with check (
  organizer_id=(select auth.uid()) and exists(select 1 from public.organizers where profile_id=(select auth.uid()) and status='active')
  and exists(select 1 from public.session_series where id=series_id and organizer_id=(select auth.uid()) and status='active'));
drop policy sessions_update on public.sessions;
create policy sessions_update on public.sessions for update to authenticated using (
  organizer_id=(select auth.uid()) and exists(select 1 from public.organizers where profile_id=(select auth.uid()) and status='active'))
with check (organizer_id=(select auth.uid()) and exists(select 1 from public.session_series where id=series_id and organizer_id=(select auth.uid()) and status in ('active','paused','ended')));
create or replace function public.save_organizer_session(p_id uuid, p_input jsonb, p_publish boolean, p_session_id uuid default null, p_scope text default 'one', p_expected_version timestamptz default null)
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
  settings jsonb;
  categories smallint[];
  visibility_value text;
  waitlist_value boolean;
  promotion_value text;
  queue_capacity integer;
  opens_minutes integer;
  closes_minutes integer;
  cancellation_minutes integer;
  gender_value text;
begin
  if not exists (select 1 from public.organizers where profile_id = auth.uid() and status = 'active') then raise exception 'Organizer access required'; end if;
  if p_input is null or jsonb_typeof(p_input) <> 'object' or octet_length(p_input::text)>16000 then raise exception 'Invalid session input'; end if;
  if p_id is null or p_publish is null or p_scope not in ('one', 'future') or p_scope is null then raise exception 'Invalid session request'; end if;
  select * into existing from public.session_series where id = p_id for update;
  if existing.id is null then
    if p_session_id is not null or p_expected_version is not null then raise exception 'Session not found'; end if;
    insert into public.session_series(id, organizer_id, draft_input) values (p_id, auth.uid(), p_input) returning * into existing;
  elsif p_session_id is null and existing.status <> 'draft' then
    -- Retried publish with the same request ID must not create duplicate occurrences.
    if p_publish and p_expected_version is null then return p_id; end if;
    raise exception 'Open an occurrence to edit this series';
  elsif p_session_id is null and (p_expected_version is null or existing.updated_at <> p_expected_version) then
    raise exception 'Session changed. Reload before saving';
  end if;
  if not p_publish and not (p_input ? 'settings') then
    if existing.status <> 'draft' or p_session_id is not null then raise exception 'Only drafts can be saved as drafts'; end if;
    update public.session_series set draft_input=p_input where id=p_id;
    return p_id;
  end if;
  settings := p_input->'settings';
  if settings is null then
    categories := null;
    if p_input->>'categoryMode' = 'range' then
      if p_input->>'categoryMin' !~ '^[1-8]$' or p_input->>'categoryMax' !~ '^[1-8]$' or p_input->>'categoryMin' is null or p_input->>'categoryMax' is null then raise exception 'Choose valid categories'; end if;
      select array_agg(n::smallint order by n) into categories from generate_series((p_input->>'categoryMin')::integer, (p_input->>'categoryMax')::integer) n;
      if categories is null then raise exception 'Choose valid categories'; end if;
    elsif p_input->>'categoryMode' is distinct from 'all' then raise exception 'Choose valid categories'; end if;
    settings := jsonb_build_object('visibility', 'private', 'allowed_categories', categories, 'waitlist_enabled', false, 'waitlist_promotion_mode', 'automatic', 'waitlist_capacity', null,
      'registration_opens_minutes_before', null, 'registration_closes_minutes_before', nullif(p_input->>'registrationHours','')::integer * 60, 'cancellation_notice_minutes', nullif(p_input->>'cancellationHours','')::integer * 60);
  else
    if jsonb_typeof(settings) <> 'object' or jsonb_typeof(settings->'waitlist_enabled') is distinct from 'boolean' then raise exception 'Invalid session settings'; end if;
    categories := null;
    if settings->'allowed_categories' is distinct from 'null'::jsonb then
      if jsonb_typeof(settings->'allowed_categories') is distinct from 'array' then raise exception 'Choose valid categories'; end if;
      if exists(select 1 from jsonb_array_elements(settings->'allowed_categories') v where jsonb_typeof(v) <> 'number') then raise exception 'Choose valid categories'; end if;
      select array_agg(v::smallint order by v::smallint) into categories from jsonb_array_elements_text(settings->'allowed_categories') v;
      if categories is null then raise exception 'Choose at least one category'; end if;
    end if;
  end if;
  gender_value := coalesce(settings->>'participant_gender_policy', case when p_session_id is not null then (select participant_gender_policy from public.sessions where id=p_session_id and series_id=p_id) else existing.participant_gender_policy end, 'all');
  if gender_value not in ('all','women_only','men_only') then raise exception 'Invalid participant gender policy'; end if;
  visibility_value := settings->>'visibility';
  waitlist_value := (settings->>'waitlist_enabled')::boolean;
  promotion_value := settings->>'waitlist_promotion_mode';
  queue_capacity := (settings->>'waitlist_capacity')::integer;
  opens_minutes := (settings->>'registration_opens_minutes_before')::integer;
  closes_minutes := (settings->>'registration_closes_minutes_before')::integer;
  cancellation_minutes := (settings->>'cancellation_notice_minutes')::integer;
  if visibility_value is null or visibility_value not in ('public','private') or waitlist_value is null or promotion_value is null or promotion_value not in ('automatic','manual')
    or not public.valid_session_categories(categories) or (queue_capacity is not null and queue_capacity not between 1 and 32767)
    or (opens_minutes is not null and opens_minutes not between 0 and 527040) or (closes_minutes is not null and closes_minutes not between 0 and 527040)
    or (cancellation_minutes is not null and cancellation_minutes not between 0 and 527040)
    or (opens_minutes is not null and opens_minutes <= coalesce(closes_minutes,0)) then raise exception 'Invalid session settings'; end if;
  if not p_publish then
    if existing.status <> 'draft' or p_session_id is not null then raise exception 'Only drafts can be saved as drafts'; end if;
    update public.session_series set draft_input = p_input, visibility=visibility_value, allowed_categories=categories, participant_gender_policy=gender_value, waitlist_enabled=waitlist_value, waitlist_promotion_mode=promotion_value, waitlist_capacity=queue_capacity,
      registration_opens_minutes_before=opens_minutes, registration_closes_minutes_before=closes_minutes, cancellation_notice_minutes=cancellation_minutes where id = p_id;
    return p_id;
  end if;
  first_date := (p_input->>'date')::date;
  last_date := case when p_input->>'repeat' = 'weekly' then (p_input->>'lastDate')::date else first_date end;
  start_time := (p_input->>'startTime')::time;
  end_time := (p_input->>'endTime')::time;
  start_instant := (first_date + start_time) at time zone 'America/Argentina/Buenos_Aires';
  end_instant := (first_date + end_time) at time zone 'America/Argentina/Buenos_Aires';
  if first_date is null or last_date is null or last_date < first_date or last_date - first_date > 357
    or start_instant is null or end_instant is null or start_instant <= now() or end_instant <= start_instant
    or p_input->>'repeat' not in ('once', 'weekly') or p_input->>'repeat' is null
    or coalesce((p_input->>'courtConfirmed')::boolean, false) = false then raise exception 'Check the schedule and court confirmation'; end if;
  venue := nullif(p_input->>'venueId', '')::uuid;
  if venue is null then
    insert into public.venues(created_by, name, address) values (auth.uid(), btrim(p_input->>'venueName'), btrim(p_input->>'venueAddress'))
    on conflict (lower(btrim(name)), lower(btrim(address))) where google_place_id is null do nothing returning id into venue;
    if venue is null then select id into venue from public.venues where lower(btrim(name)) = lower(btrim(p_input->>'venueName')) and lower(btrim(address)) = lower(btrim(p_input->>'venueAddress')) and google_place_id is null; end if;
  end if;
  if not exists (select 1 from public.venues where id = venue and is_active) then raise exception 'Choose an available venue'; end if;
  if p_session_id is null then
    update public.session_series set draft_input = p_input, status = 'active', venue_id=venue, title=btrim(p_input->>'title'), description=nullif(btrim(p_input->>'description'),''), court_label=nullif(btrim(p_input->>'courtLabel'),''), capacity=(p_input->>'capacity')::integer, recurrence=p_input->>'repeat', timezone='America/Argentina/Buenos_Aires', local_start_time=start_time, duration_minutes=extract(epoch from (end_time-start_time))::integer/60, starts_on=first_date, ends_on=last_date, weekday=extract(isodow from first_date)::integer, visibility=visibility_value, allowed_categories=categories, participant_gender_policy=gender_value, waitlist_enabled=waitlist_value, waitlist_promotion_mode=promotion_value, waitlist_capacity=queue_capacity,
      registration_opens_minutes_before=opens_minutes, registration_closes_minutes_before=closes_minutes, cancellation_notice_minutes=cancellation_minutes where id = p_id;
    day := first_date;
    while day <= last_date loop
      insert into public.sessions(organizer_id, series_id, occurrence_date, venue_id, title, description, court_label, capacity, allowed_categories, participant_gender_policy, visibility, waitlist_enabled, waitlist_promotion_mode, waitlist_capacity, price_minor, starts_at, ends_at, registration_opens_at, registration_closes_at, cancellation_deadline_at)
      values(auth.uid(), p_id, day, venue, btrim(p_input->>'title'), nullif(btrim(p_input->>'description'), ''), nullif(btrim(p_input->>'courtLabel'), ''), (p_input->>'capacity')::integer, categories, gender_value, visibility_value, waitlist_value, promotion_value, queue_capacity, ((p_input->>'price')::numeric * 100)::integer,
        (day + start_time) at time zone 'America/Argentina/Buenos_Aires', (day + end_time) at time zone 'America/Argentina/Buenos_Aires',
        ((day + start_time) at time zone 'America/Argentina/Buenos_Aires') - make_interval(mins => opens_minutes),
        ((day + start_time) at time zone 'America/Argentina/Buenos_Aires') - make_interval(mins => closes_minutes), ((day + start_time) at time zone 'America/Argentina/Buenos_Aires') - make_interval(mins => cancellation_minutes));
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
      allowed_categories = categories, participant_gender_policy = gender_value, visibility = visibility_value, waitlist_enabled = waitlist_value, waitlist_promotion_mode = promotion_value, waitlist_capacity = queue_capacity, price_minor = ((p_input->>'price')::numeric * 100)::integer,
      starts_at = (((starts_at at time zone 'America/Argentina/Buenos_Aires')::date + date_shift) + start_time) at time zone 'America/Argentina/Buenos_Aires',
      ends_at = (((starts_at at time zone 'America/Argentina/Buenos_Aires')::date + date_shift) + end_time) at time zone 'America/Argentina/Buenos_Aires',
      registration_opens_at = ((((starts_at at time zone 'America/Argentina/Buenos_Aires')::date + date_shift) + start_time) at time zone 'America/Argentina/Buenos_Aires') - make_interval(mins => opens_minutes),
      registration_closes_at = ((((starts_at at time zone 'America/Argentina/Buenos_Aires')::date + date_shift) + start_time) at time zone 'America/Argentina/Buenos_Aires') - make_interval(mins => closes_minutes),
      cancellation_deadline_at = ((((starts_at at time zone 'America/Argentina/Buenos_Aires')::date + date_shift) + start_time) at time zone 'America/Argentina/Buenos_Aires') - make_interval(mins => cancellation_minutes)
    where series_id = p_id and status = 'published' and starts_at > now() and (id = p_session_id or (p_scope = 'future' and occurrence_date >= target.occurrence_date));
    if p_scope='future' then update public.session_series set venue_id=venue, title=btrim(p_input->>'title'), description=nullif(btrim(p_input->>'description'),''), court_label=nullif(btrim(p_input->>'courtLabel'),''), capacity=(p_input->>'capacity')::integer, local_start_time=start_time, duration_minutes=extract(epoch from (end_time-start_time))::integer/60, visibility=visibility_value, allowed_categories=categories, participant_gender_policy=gender_value, waitlist_enabled=waitlist_value, waitlist_promotion_mode=promotion_value, waitlist_capacity=queue_capacity,
      registration_opens_minutes_before=opens_minutes, registration_closes_minutes_before=closes_minutes, cancellation_notice_minutes=cancellation_minutes where id=p_id; end if;
    -- An edit changes existing occurrences only; it never extends the series silently.
  end if;
  return p_id;
end;
$$;
revoke all on function public.save_organizer_session(uuid,jsonb,boolean,uuid,text,timestamptz) from public, anon;
grant execute on function public.save_organizer_session(uuid,jsonb,boolean,uuid,text,timestamptz) to authenticated;


-- Pausing or ending never cancels, hides, or rewrites published occurrences.
create or replace function public.set_organizer_series_status(p_id uuid, p_status text, p_expected_version timestamptz)
returns public.session_series language plpgsql security invoker set search_path='' as $$
declare s public.session_series;
begin
  if not exists(select 1 from public.organizers where profile_id=auth.uid() and status='active') then raise exception 'Organizer access required'; end if;
  select * into s from public.session_series where id=p_id for update;
  if s.id is null then raise exception 'Series not found'; end if;
  if p_expected_version is null or s.updated_at<>p_expected_version then raise exception 'Session changed. Reload before saving'; end if;
  if p_status is null or p_status not in ('active','paused','ended') or s.status in ('draft','ended') or s.status=p_status then raise exception 'Invalid series transition'; end if;
  if p_status='paused' and s.recurrence<>'weekly' then raise exception 'Only recurring series can be paused'; end if;
  update public.session_series set status=p_status where id=p_id returning * into s;
  return s;
end; $$;
revoke all on function public.set_organizer_series_status(uuid,text,timestamptz) from public,anon;
grant execute on function public.set_organizer_series_status(uuid,text,timestamptz) to authenticated;
