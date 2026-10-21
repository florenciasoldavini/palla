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

set local role authenticated;
select set_config('request.jwt.claim.sub','60000000-0000-4000-8000-000000000001',true);
do $$ begin
 for i in 1..30 loop assert public.consume_places_search_quota(), '30 requests permitted'; end loop;
 assert not public.consume_places_search_quota(), '31st request blocked';
 perform pg_temp.expect_error('select * from private.places_search_quota','permission denied');
end $$;
reset role;
update private.places_search_quota set minute_start=now()-interval '2 minutes', day_count=300;
set local role authenticated;
do $$ begin assert not public.consume_places_search_quota(), 'Daily quota enforced across minutes'; end $$;
select set_config('request.jwt.claim.sub','60000000-0000-4000-8000-000000000003',true);
select pg_temp.expect_error('select public.consume_places_search_quota()','Organizer access required');
set local role anon;
select pg_temp.expect_error('select public.consume_places_search_quota()','permission denied');
reset role;
rollback;
