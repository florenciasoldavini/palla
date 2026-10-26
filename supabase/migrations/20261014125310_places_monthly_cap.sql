-- One conservative total cap across both Places request types and all app users.
create table private.places_monthly_usage (
  billing_month date primary key,
  request_count integer not null default 0 check (request_count between 0 and 9000)
);
alter table private.places_monthly_usage enable row level security;
revoke all on private.places_monthly_usage from public, anon, authenticated;
create function public.reserve_places_request() returns text
language plpgsql security definer set search_path = '' as $$
declare
  month_key date := date_trunc('month', now() at time zone 'America/Los_Angeles')::date;
  used integer;
begin
  if auth.uid() is null or not exists (select 1 from public.organizers where profile_id=auth.uid() and status='active') then
    raise exception 'Organizer access required';
  end if;
  -- Serialize the global boundary; concurrent users cannot overrun the cap.
  perform pg_advisory_xact_lock(74141, 1);
  insert into private.places_monthly_usage(billing_month) values (month_key) on conflict do nothing;
  select request_count into used from private.places_monthly_usage where billing_month=month_key for update;
  if used >= 9000 then return 'monthly_limit'; end if;
  if not public.consume_places_search_quota() then return 'rate_limit'; end if;
  update private.places_monthly_usage set request_count=request_count+1 where billing_month=month_key;
  -- Reserve before calling Google. Failures/timeouts are never refunded.
  return 'allowed';
end;
$$;
revoke all on function public.reserve_places_request() from public, anon;
grant execute on function public.reserve_places_request() to authenticated;
