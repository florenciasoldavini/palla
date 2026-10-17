-- Explicit creation settings; preserve existing rows and organizer-only access.
create function public.valid_session_categories(categories smallint[]) returns boolean
language sql immutable set search_path='' as $$
  select categories is null or (array_ndims(categories)=1 and array_lower(categories,1)=1 and cardinality(categories) between 1 and 8
    and not exists(select 1 from unnest(categories) n where n is null or n not between 1 and 8)
    and cardinality(categories)=(select count(distinct n) from unnest(categories) n));
$$;
revoke all on function public.valid_session_categories(smallint[]) from public, anon;
grant execute on function public.valid_session_categories(smallint[]) to authenticated, service_role;
alter table public.sessions
  add column visibility text not null default 'private' check (visibility in ('public','private')),
  add column allowed_categories smallint[] check (public.valid_session_categories(allowed_categories)),
  add column waitlist_enabled boolean not null default false,
  add column waitlist_promotion_mode text not null default 'automatic' check (waitlist_promotion_mode in ('automatic','manual')),
  add column waitlist_capacity integer check (waitlist_capacity between 1 and 32767);
alter table public.session_series
  add column visibility text not null default 'private' check (visibility in ('public','private')),
  add column allowed_categories smallint[] check (public.valid_session_categories(allowed_categories)),
  add column waitlist_enabled boolean not null default false,
  add column waitlist_promotion_mode text not null default 'automatic' check (waitlist_promotion_mode in ('automatic','manual')),
  add column waitlist_capacity integer check (waitlist_capacity between 1 and 32767);
alter table public.sessions
  add column registration_opens_at timestamptz,
  alter column registration_closes_at drop not null,
  alter column cancellation_deadline_at drop not null,
  add constraint sessions_registration_window check (registration_opens_at is null or registration_opens_at < coalesce(registration_closes_at,starts_at));
alter table public.session_series
  add column registration_opens_minutes_before integer check (registration_opens_minutes_before between 0 and 527040),
  add column registration_closes_minutes_before integer check (registration_closes_minutes_before between 0 and 527040),
  add column cancellation_notice_minutes integer check (cancellation_notice_minutes between 0 and 527040),
  add constraint series_registration_window check (registration_opens_minutes_before is null or registration_opens_minutes_before > coalesce(registration_closes_minutes_before,0));
-- The transaction holds table locks; preserve versions even for past/cancelled rows.
alter table public.sessions disable trigger guard_session_change;
alter table public.session_series disable trigger guard_series_change;
update public.sessions s set allowed_categories=case when category_min is null then null else array(select generate_series(s.category_min::integer,s.category_max::integer)::smallint) end;
update public.session_series s set
  allowed_categories=case when draft_input->>'categoryMode'='range' and draft_input->>'categoryMin' ~ '^[1-8]$' and draft_input->>'categoryMax' ~ '^[1-8]$' and (draft_input->>'categoryMin')::int <= (draft_input->>'categoryMax')::int then array(select generate_series((s.draft_input->>'categoryMin')::int,(s.draft_input->>'categoryMax')::int)::smallint) else null end,
  registration_closes_minutes_before=case when draft_input->>'registrationHours' ~ '^\d{1,3}$' and (draft_input->>'registrationHours')::int <=720 then (draft_input->>'registrationHours')::int*60 else null end,
  cancellation_notice_minutes=case when draft_input->>'cancellationHours' ~ '^\d{1,3}$' and (draft_input->>'cancellationHours')::int <=720 then (draft_input->>'cancellationHours')::int*60 else null end;
alter table public.sessions enable trigger guard_session_change;
alter table public.session_series enable trigger guard_series_change;
alter table public.sessions drop column category_min, drop column category_max;

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
begin
  if not exists (select 1 from public.organizers where profile_id = auth.uid() and status = 'active') then raise exception 'Organizer access required'; end if;
  if p_input is null or jsonb_typeof(p_input) <> 'object' or octet_length(p_input::text)>16000 then raise exception 'Invalid session input'; end if;
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
    update public.session_series set draft_input = p_input, visibility=visibility_value, allowed_categories=categories, waitlist_enabled=waitlist_value, waitlist_promotion_mode=promotion_value, waitlist_capacity=queue_capacity,
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
    update public.session_series set draft_input = p_input, status = 'published', visibility=visibility_value, allowed_categories=categories, waitlist_enabled=waitlist_value, waitlist_promotion_mode=promotion_value, waitlist_capacity=queue_capacity,
      registration_opens_minutes_before=opens_minutes, registration_closes_minutes_before=closes_minutes, cancellation_notice_minutes=cancellation_minutes where id = p_id;
    day := first_date;
    while day <= last_date loop
      insert into public.sessions(organizer_id, series_id, occurrence_date, venue_id, title, description, court_label, capacity, allowed_categories, visibility, waitlist_enabled, waitlist_promotion_mode, waitlist_capacity, price_minor, starts_at, ends_at, registration_opens_at, registration_closes_at, cancellation_deadline_at)
      values(auth.uid(), p_id, day, venue, btrim(p_input->>'title'), nullif(btrim(p_input->>'description'), ''), nullif(btrim(p_input->>'courtLabel'), ''), (p_input->>'capacity')::integer, categories, visibility_value, waitlist_value, promotion_value, queue_capacity, ((p_input->>'price')::numeric * 100)::integer,
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
      allowed_categories = categories, visibility = visibility_value, waitlist_enabled = waitlist_value, waitlist_promotion_mode = promotion_value, waitlist_capacity = queue_capacity, price_minor = ((p_input->>'price')::numeric * 100)::integer,
      starts_at = (((starts_at at time zone 'America/Argentina/Buenos_Aires')::date + date_shift) + start_time) at time zone 'America/Argentina/Buenos_Aires',
      ends_at = (((starts_at at time zone 'America/Argentina/Buenos_Aires')::date + date_shift) + end_time) at time zone 'America/Argentina/Buenos_Aires',
      registration_opens_at = ((((starts_at at time zone 'America/Argentina/Buenos_Aires')::date + date_shift) + start_time) at time zone 'America/Argentina/Buenos_Aires') - make_interval(mins => opens_minutes),
      registration_closes_at = ((((starts_at at time zone 'America/Argentina/Buenos_Aires')::date + date_shift) + start_time) at time zone 'America/Argentina/Buenos_Aires') - make_interval(mins => closes_minutes),
      cancellation_deadline_at = ((((starts_at at time zone 'America/Argentina/Buenos_Aires')::date + date_shift) + start_time) at time zone 'America/Argentina/Buenos_Aires') - make_interval(mins => cancellation_minutes)
    where series_id = p_id and status = 'published' and starts_at > now() and (id = p_session_id or (p_scope = 'future' and occurrence_date >= target.occurrence_date));
    if p_scope='future' then update public.session_series set visibility=visibility_value, allowed_categories=categories, waitlist_enabled=waitlist_value, waitlist_promotion_mode=promotion_value, waitlist_capacity=queue_capacity,
      registration_opens_minutes_before=opens_minutes, registration_closes_minutes_before=closes_minutes, cancellation_notice_minutes=cancellation_minutes where id=p_id; end if;
    -- An edit changes existing occurrences only; it never extends the series silently.
  end if;
  return p_id;
end;
$$;
revoke all on function public.save_organizer_session(uuid,jsonb,boolean,uuid,text,timestamptz) from public, anon;
grant execute on function public.save_organizer_session(uuid,jsonb,boolean,uuid,text,timestamptz) to authenticated;
