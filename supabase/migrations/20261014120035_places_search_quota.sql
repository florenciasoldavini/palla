-- Private durable quota; clients cannot read or edit request counters.
create schema if not exists private;
create table private.places_search_quota (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  minute_start timestamptz not null,
  minute_count integer not null,
  day_start date not null,
  day_count integer not null
);
alter table private.places_search_quota enable row level security;
revoke all on private.places_search_quota from public, anon, authenticated;
-- Definer is required because authenticated callers must not modify the counter.
create function public.consume_places_search_quota() returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
  tick timestamptz := date_trunc('minute', now());
  today date := (now() at time zone 'UTC')::date;
  counter private.places_search_quota;
begin
  if caller is null or not exists (select 1 from public.organizers where profile_id = caller and status = 'active') then
    raise exception 'Organizer access required';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(caller::text, 41));
  insert into private.places_search_quota values (caller, tick, 0, today, 0) on conflict do nothing;
  select * into counter from private.places_search_quota where profile_id = caller for update;
  if counter.minute_start <> tick then counter.minute_count := 0; end if;
  if counter.day_start <> today then counter.day_count := 0; end if;
  if counter.minute_count >= 30 or counter.day_count >= 300 then return false; end if;
  update private.places_search_quota set minute_start = tick, minute_count = counter.minute_count + 1,
    day_start = today, day_count = counter.day_count + 1 where profile_id = caller;
  return true;
end;
$$;
revoke all on function public.consume_places_search_quota() from public, anon;
grant execute on function public.consume_places_search_quota() to authenticated;
