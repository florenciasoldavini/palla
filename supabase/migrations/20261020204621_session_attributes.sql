-- Extensible attribute catalog. Venue claims belong to organizer + venue.
create table public.attribute_definitions (
 code text primary key check(code ~ '^[a-z][a-z_]{0,63}$'),
 scope text not null check(scope in ('session','venue')),
 is_active boolean not null default true,
 unique(code,scope)
);
insert into public.attribute_definitions(code,scope) values
 ('balls_provided','session'),('new_balls','session'),('spare_rackets','session'),('coaching','session'),('snacks','session'),('drinks','session'),
 ('free_parking','venue'),('paid_parking','venue'),('showers','venue'),('changing_rooms','venue'),('lockers','venue'),('water_dispenser','venue'),('accessible','venue'),('racket_rental','venue'),('shop','venue'),('cafe','venue');
create table public.organizer_venue_attributes (
 organizer_id uuid not null references public.organizers(profile_id) on delete cascade,
 venue_id uuid not null references public.venues(id) on delete cascade,
 attribute_code text not null,
 scope text not null default 'venue' check(scope='venue'),
 primary key(organizer_id,venue_id,attribute_code),
 foreign key(attribute_code,scope) references public.attribute_definitions(code,scope)
);
create index organizer_venue_attributes_venue on public.organizer_venue_attributes(venue_id);
create index organizer_venue_attributes_code on public.organizer_venue_attributes(attribute_code,scope);
create table public.session_series_attributes (
 series_id uuid not null references public.session_series(id) on delete cascade,
 attribute_code text not null,
 scope text not null default 'session' check(scope='session'),
 primary key(series_id,attribute_code),
 foreign key(attribute_code,scope) references public.attribute_definitions(code,scope)
);
create index session_series_attributes_code on public.session_series_attributes(attribute_code,scope);
create table public.session_attributes (
 session_id uuid not null references public.sessions(id) on delete cascade,
 attribute_code text not null,
 scope text not null default 'session' check(scope='session'),
 primary key(session_id,attribute_code),
 foreign key(attribute_code,scope) references public.attribute_definitions(code,scope)
);
create index session_attributes_code on public.session_attributes(attribute_code,scope);
alter table public.attribute_definitions enable row level security;
alter table public.organizer_venue_attributes enable row level security;
alter table public.session_series_attributes enable row level security;
alter table public.session_attributes enable row level security;
revoke all on public.attribute_definitions,public.organizer_venue_attributes,public.session_series_attributes,public.session_attributes from public,anon,authenticated;
grant select on public.attribute_definitions to authenticated;
grant select,insert,delete on public.organizer_venue_attributes,public.session_series_attributes,public.session_attributes to authenticated;
grant all on public.attribute_definitions,public.organizer_venue_attributes,public.session_series_attributes,public.session_attributes to service_role;
create policy attribute_definitions_read on public.attribute_definitions for select to authenticated using(true);
create policy organizer_venue_attributes_read on public.organizer_venue_attributes for select to authenticated using(organizer_id=(select auth.uid()));
create policy organizer_venue_attributes_insert on public.organizer_venue_attributes for insert to authenticated with check(
 organizer_id=(select auth.uid()) and exists(select 1 from public.organizers o where o.profile_id=(select auth.uid()) and o.status='active')
 and exists(select 1 from public.venues v where v.id=venue_id and v.is_active)
 and exists(select 1 from public.attribute_definitions a where a.code=attribute_code and a.scope='venue' and a.is_active));
create policy organizer_venue_attributes_delete on public.organizer_venue_attributes for delete to authenticated using(
 organizer_id=(select auth.uid()) and exists(select 1 from public.organizers o where o.profile_id=(select auth.uid()) and o.status='active'));
create policy session_series_attributes_read on public.session_series_attributes for select to authenticated using(exists(select 1 from public.session_series s where s.id=series_id and s.organizer_id=(select auth.uid())));
create policy session_series_attributes_insert on public.session_series_attributes for insert to authenticated with check(
 exists(select 1 from public.session_series s join public.organizers o on o.profile_id=s.organizer_id where s.id=series_id and s.organizer_id=(select auth.uid()) and o.status='active' and s.status in ('draft','active','paused'))
 and exists(select 1 from public.attribute_definitions a where a.code=attribute_code and a.scope='session' and a.is_active));
create policy session_series_attributes_delete on public.session_series_attributes for delete to authenticated using(
 exists(select 1 from public.session_series s join public.organizers o on o.profile_id=s.organizer_id where s.id=series_id and s.organizer_id=(select auth.uid()) and o.status='active' and s.status in ('draft','active','paused')));
create policy session_attributes_read on public.session_attributes for select to authenticated using(exists(select 1 from public.sessions s where s.id=session_id and s.organizer_id=(select auth.uid())));
create policy session_attributes_insert on public.session_attributes for insert to authenticated with check(
 exists(select 1 from public.sessions s join public.organizers o on o.profile_id=s.organizer_id where s.id=session_id and s.organizer_id=(select auth.uid()) and o.status='active' and s.status='published' and s.starts_at>now())
 and exists(select 1 from public.attribute_definitions a where a.code=attribute_code and a.scope='session' and a.is_active));
create policy session_attributes_delete on public.session_attributes for delete to authenticated using(
 exists(select 1 from public.sessions s join public.organizers o on o.profile_id=s.organizer_id where s.id=session_id and s.organizer_id=(select auth.uid()) and o.status='active' and s.status='published' and s.starts_at>now()));

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
  strict_value boolean;
  attribute_session text[] := '{}';
  attribute_venue text[] := '{}';
  attribute_baseline text[] := '{}';
  attribute_current text[];
  attribute_scope_ids uuid[];
  attribute_key text;
  attribute_json jsonb;

begin
  if not exists (select 1 from public.organizers where profile_id = auth.uid() and status = 'active') then raise exception 'Organizer access required'; end if;
  if p_input is null or jsonb_typeof(p_input) <> 'object' or octet_length(p_input::text)>16000 then raise exception 'Invalid session input'; end if;
  if p_id is null or p_publish is null or p_scope not in ('one', 'future') or p_scope is null then raise exception 'Invalid session request'; end if;
  -- Validate new fields even on draft saves. Missing fields preserve older clients' selections.
  foreach attribute_key in array array['sessionAttributes','venueAttributes','venueAttributesBaseline'] loop
    if p_input ? attribute_key then
      attribute_json := p_input->attribute_key;
      if jsonb_typeof(attribute_json) is distinct from 'array' or jsonb_array_length(attribute_json)>16 then raise exception 'Invalid attribute selection'; end if;
      if exists(select 1 from jsonb_array_elements(attribute_json) e where jsonb_typeof(e)<>'string') then raise exception 'Invalid attribute selection'; end if;
      if (select count(*) from jsonb_array_elements(attribute_json))<>(select count(distinct e) from jsonb_array_elements(attribute_json) e) then raise exception 'Duplicate attribute selection'; end if;
      if exists(select 1 from jsonb_array_elements_text(attribute_json) e where not exists(select 1 from public.attribute_definitions a where a.code=e and a.scope=case when attribute_key='sessionAttributes' then 'session' else 'venue' end and (a.is_active or attribute_key='venueAttributesBaseline'))) then raise exception 'Unknown or inactive attribute selection'; end if;
    end if;
  end loop;
  if p_input ? 'venueAttributesEdited' and jsonb_typeof(p_input->'venueAttributesEdited') is distinct from 'boolean' then raise exception 'Invalid venue attribute request'; end if;
  if coalesce((p_input->>'venueAttributesEdited')::boolean,false) and not(p_input ? 'venueAttributes' and p_input ? 'venueAttributesBaseline') then raise exception 'Venue attribute baseline required'; end if;
  select coalesce(array_agg(e order by e),'{}') into attribute_session from jsonb_array_elements_text(coalesce(p_input->'sessionAttributes','[]')) e;
  if 'new_balls'=any(attribute_session) then attribute_session:=array_remove(attribute_session,'balls_provided'); end if;
  if p_input ? 'sessionAttributes' then p_input:=jsonb_set(p_input,'{sessionAttributes}',to_jsonb(attribute_session)); end if;
  select coalesce(array_agg(e order by e),'{}') into attribute_venue from jsonb_array_elements_text(coalesce(p_input->'venueAttributes','[]')) e;
  select coalesce(array_agg(e order by e),'{}') into attribute_baseline from jsonb_array_elements_text(coalesce(p_input->'venueAttributesBaseline','[]')) e;
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
    if p_input ? 'sessionAttributes' then
      delete from public.session_series_attributes where series_id=p_id;
      insert into public.session_series_attributes(series_id,attribute_code) select p_id,unnest(attribute_session);
    end if;
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
  if settings ? 'strict_category_enforcement' and jsonb_typeof(settings->'strict_category_enforcement') is distinct from 'boolean' then raise exception 'Invalid category enforcement'; end if;
  strict_value := coalesce((settings->>'strict_category_enforcement')::boolean, case when p_session_id is not null then (select strict_category_enforcement from public.sessions where id=p_session_id and series_id=p_id) else existing.strict_category_enforcement end, false);
  if categories is null then strict_value := false; end if;
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
    update public.session_series set draft_input = p_input, visibility=visibility_value, allowed_categories=categories, participant_gender_policy=gender_value, strict_category_enforcement=strict_value, waitlist_enabled=waitlist_value, waitlist_promotion_mode=promotion_value, waitlist_capacity=queue_capacity,
      registration_opens_minutes_before=opens_minutes, registration_closes_minutes_before=closes_minutes, cancellation_notice_minutes=cancellation_minutes where id = p_id;
    if p_input ? 'sessionAttributes' then
      delete from public.session_series_attributes where series_id=p_id;
      insert into public.session_series_attributes(series_id,attribute_code) select p_id,unnest(attribute_session);
    end if;
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
    update public.session_series set draft_input = p_input, status = 'active', venue_id=venue, title=btrim(p_input->>'title'), description=nullif(btrim(p_input->>'description'),''), court_label=nullif(btrim(p_input->>'courtLabel'),''), capacity=(p_input->>'capacity')::integer, recurrence=p_input->>'repeat', timezone='America/Argentina/Buenos_Aires', local_start_time=start_time, duration_minutes=extract(epoch from (end_time-start_time))::integer/60, starts_on=first_date, ends_on=last_date, weekday=extract(isodow from first_date)::integer, visibility=visibility_value, allowed_categories=categories, participant_gender_policy=gender_value, strict_category_enforcement=strict_value, waitlist_enabled=waitlist_value, waitlist_promotion_mode=promotion_value, waitlist_capacity=queue_capacity,
      registration_opens_minutes_before=opens_minutes, registration_closes_minutes_before=closes_minutes, cancellation_notice_minutes=cancellation_minutes where id = p_id;
    day := first_date;
    while day <= last_date loop
      insert into public.sessions(organizer_id, series_id, occurrence_date, venue_id, title, description, court_label, capacity, allowed_categories, strict_category_enforcement, participant_gender_policy, visibility, waitlist_enabled, waitlist_promotion_mode, waitlist_capacity, price_minor, starts_at, ends_at, registration_opens_at, registration_closes_at, cancellation_deadline_at)
      values(auth.uid(), p_id, day, venue, btrim(p_input->>'title'), nullif(btrim(p_input->>'description'), ''), nullif(btrim(p_input->>'courtLabel'), ''), (p_input->>'capacity')::integer, categories, strict_value, gender_value, visibility_value, waitlist_value, promotion_value, queue_capacity, ((p_input->>'price')::numeric * 100)::integer,
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
      allowed_categories = categories, participant_gender_policy = gender_value, strict_category_enforcement=strict_value, visibility = visibility_value, waitlist_enabled = waitlist_value, waitlist_promotion_mode = promotion_value, waitlist_capacity = queue_capacity, price_minor = ((p_input->>'price')::numeric * 100)::integer,
      starts_at = (((starts_at at time zone 'America/Argentina/Buenos_Aires')::date + date_shift) + start_time) at time zone 'America/Argentina/Buenos_Aires',
      ends_at = (((starts_at at time zone 'America/Argentina/Buenos_Aires')::date + date_shift) + end_time) at time zone 'America/Argentina/Buenos_Aires',
      registration_opens_at = ((((starts_at at time zone 'America/Argentina/Buenos_Aires')::date + date_shift) + start_time) at time zone 'America/Argentina/Buenos_Aires') - make_interval(mins => opens_minutes),
      registration_closes_at = ((((starts_at at time zone 'America/Argentina/Buenos_Aires')::date + date_shift) + start_time) at time zone 'America/Argentina/Buenos_Aires') - make_interval(mins => closes_minutes),
      cancellation_deadline_at = ((((starts_at at time zone 'America/Argentina/Buenos_Aires')::date + date_shift) + start_time) at time zone 'America/Argentina/Buenos_Aires') - make_interval(mins => cancellation_minutes)
    where series_id = p_id and status = 'published' and starts_at > now() and (id = p_session_id or (p_scope = 'future' and occurrence_date >= target.occurrence_date));
    if p_scope='future' then update public.session_series set venue_id=venue, title=btrim(p_input->>'title'), description=nullif(btrim(p_input->>'description'),''), court_label=nullif(btrim(p_input->>'courtLabel'),''), capacity=(p_input->>'capacity')::integer, local_start_time=start_time, duration_minutes=extract(epoch from (end_time-start_time))::integer/60, visibility=visibility_value, allowed_categories=categories, participant_gender_policy=gender_value, strict_category_enforcement=strict_value, waitlist_enabled=waitlist_value, waitlist_promotion_mode=promotion_value, waitlist_capacity=queue_capacity,
      registration_opens_minutes_before=opens_minutes, registration_closes_minutes_before=closes_minutes, cancellation_notice_minutes=cancellation_minutes where id=p_id; end if;
    -- An edit changes existing occurrences only; it never extends the series silently.
  end if;
  if p_input ? 'sessionAttributes' then
    select array_agg(s.id) into attribute_scope_ids from public.sessions s
    where s.series_id=p_id and s.status='published' and s.starts_at>now()
      and (p_session_id is null or s.id=p_session_id or (p_scope='future' and s.occurrence_date>=target.occurrence_date));
    delete from public.session_attributes where session_id=any(attribute_scope_ids);
    insert into public.session_attributes(session_id,attribute_code) select sid,code from unnest(attribute_scope_ids) sid cross join unnest(attribute_session) code;
    if p_session_id is null or p_scope='future' then
      delete from public.session_series_attributes where series_id=p_id;
      insert into public.session_series_attributes(series_id,attribute_code) select p_id,unnest(attribute_session);
    end if;
  end if;
  if coalesce((p_input->>'venueAttributesEdited')::boolean,false) then
    -- Serialize claims for this organizer/venue across different session series.
    perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||':'||venue::text,0));
    select coalesce(array_agg(attribute_code order by attribute_code),'{}') into attribute_current from public.organizer_venue_attributes where organizer_id=auth.uid() and venue_id=venue;
    if attribute_current<>attribute_baseline then raise exception 'Venue amenities changed. Reload before saving'; end if;
    delete from public.organizer_venue_attributes where organizer_id=auth.uid() and venue_id=venue;
    insert into public.organizer_venue_attributes(organizer_id,venue_id,attribute_code) select auth.uid(),venue,unnest(attribute_venue);
  end if;
  return p_id;
end;
$$;
revoke all on function public.save_organizer_session(uuid,jsonb,boolean,uuid,text,timestamptz) from public, anon;
grant execute on function public.save_organizer_session(uuid,jsonb,boolean,uuid,text,timestamptz) to authenticated;

-- Narrow read API for one occurrence. Keep base tables and organizer roster private.
-- Definer privileges are needed only to project these explicitly public fields
-- across owner-only tables. No writes, attendance, contact details, or draft data.
create or replace function public.get_public_session_detail(p_session_id uuid)
returns jsonb
language sql stable security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'attributes', coalesce((select jsonb_agg(a.attribute_code order by a.attribute_code) from public.session_attributes a where a.session_id=s.id),'[]'::jsonb),
    'id', s.id, 'title', s.title, 'description', s.description,
    'court_label', s.court_label, 'starts_at', s.starts_at, 'ends_at', s.ends_at,
    'timezone', coalesce(ss.timezone, 'America/Argentina/Buenos_Aires'),
    'status', s.status, 'visibility', s.visibility, 'capacity', s.capacity,
    'confirmed_count', (select count(*) from public.registrations r where r.session_id=s.id and r.status='confirmed'),
    'allowed_categories', s.allowed_categories,
    'participant_gender_policy', s.participant_gender_policy,
    'price_minor', s.price_minor, 'currency', s.currency,
    'registration_opens_at', s.registration_opens_at,
    'registration_closes_at', s.registration_closes_at,
    'cancellation_deadline_at', s.cancellation_deadline_at,
    'payment_instructions', s.payment_instructions,
    'weekly', coalesce(ss.recurrence='weekly', false),
    'venue', jsonb_build_object('attributes', coalesce((select jsonb_agg(a.attribute_code order by a.attribute_code) from public.organizer_venue_attributes a where a.organizer_id=s.organizer_id and a.venue_id=s.venue_id),'[]'::jsonb), 'name', v.name, 'address', v.address,
      'google_place_id', v.google_place_id, 'arrival_instructions', v.arrival_instructions),
    'host', jsonb_build_object('name', coalesce(nullif(concat_ws(' ',hp.first_name,hp.last_name),''),'Session host'), 'avatar_url', hp.avatar_url),
    'players', case when exists(select 1 from public.profiles vp where vp.id=(select auth.uid()) and vp.onboarding_completed_at is not null)
      then coalesce((select jsonb_agg(p.player order by p.confirmed_at, p.id) from (
        select r.confirmed_at, r.id, jsonb_build_object(
          'name', coalesce(nullif(concat_ws(' ', pp.first_name, case when nullif(pp.last_name,'') is not null then left(pp.last_name,1)||'.' end),''),'Player'),
          'avatar_url', pp.avatar_url, 'category', pp.playing_category) player
        from public.registrations r join public.profiles pp on pp.id=r.player_id
        where r.session_id=s.id and r.status='confirmed'
        order by r.confirmed_at, r.id limit 12
      ) p),'[]'::jsonb) else '[]'::jsonb end,
    'viewer_registration', (select r.status from public.registrations r where r.session_id=s.id and r.player_id=(select auth.uid()) and r.status in ('confirmed','waitlisted')),
    'viewer_is_host', coalesce(s.organizer_id=(select auth.uid()),false)
  )
  from public.sessions s
  join public.venues v on v.id=s.venue_id and v.is_active
  join public.profiles hp on hp.id=s.organizer_id
  join public.organizers o on o.profile_id=s.organizer_id and o.status='active'
  left join public.session_series ss on ss.id=s.series_id
  where s.id=p_session_id and s.status in ('published','cancelled','completed')
    and (s.visibility='public' or s.organizer_id=(select auth.uid()));
$$;
revoke all on function public.get_public_session_detail(uuid) from public, anon, authenticated;
grant execute on function public.get_public_session_detail(uuid) to anon, authenticated;
comment on function public.get_public_session_detail(uuid) is 'Read-only public occurrence projection. Private occurrences are owner-only; drafts never returned. Anonymous callers receive no participant identities.';
