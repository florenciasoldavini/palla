-- Isolated fixture only. All account and session records are rolled back.
begin;
insert into auth.users(id) values ('60000000-0000-4000-8000-000000000001'), ('60000000-0000-4000-8000-000000000002'), ('60000000-0000-4000-8000-000000000003');
insert into public.profiles(id,first_name,onboarding_completed_at) select id,'QA',now() from auth.users;
insert into public.organizers(profile_id,display_name) values ('60000000-0000-4000-8000-000000000001','Organizer A'), ('60000000-0000-4000-8000-000000000002','Organizer B');
create function pg_temp.expect_error(statement text, pattern text) returns void language plpgsql as $$
begin
  execute statement;
  raise exception 'Expected rejection did not happen: %', statement;
exception when others then
  if sqlerrm not like '%' || pattern || '%' then raise; end if;
end;
$$;


insert into private.places_monthly_usage values (date_trunc('month',now() at time zone 'America/Los_Angeles')::date - interval '1 month',9000);
set local role authenticated;
select set_config('request.jwt.claim.sub','60000000-0000-4000-8000-000000000001',true);
do $$ begin
 assert public.reserve_places_request()='allowed', 'Previous exhausted month does not block a new billing month';
 perform pg_temp.expect_error('select * from private.places_monthly_usage','permission denied');
end $$;
reset role;
update private.places_monthly_usage set request_count=8999 where billing_month=date_trunc('month',now() at time zone 'America/Los_Angeles')::date;
set local role authenticated;
do $$ begin assert public.reserve_places_request()='allowed', 'Last allowed request'; assert public.reserve_places_request()='monthly_limit', '9001st request blocked'; end $$;
select set_config('request.jwt.claim.sub','60000000-0000-4000-8000-000000000002',true);
do $$ begin assert public.reserve_places_request()='monthly_limit', 'Different organizer shares global cap'; end $$;
select set_config('request.jwt.claim.sub','60000000-0000-4000-8000-000000000003',true);
select pg_temp.expect_error('select public.reserve_places_request()','Organizer access required');
set local role anon;
select pg_temp.expect_error('select public.reserve_places_request()','permission denied');
reset role;
do $$ begin assert (select request_count from private.places_monthly_usage where billing_month=date_trunc('month',now() at time zone 'America/Los_Angeles')::date)=9000, 'Denied requests never increment beyond cap'; end $$;
rollback;
