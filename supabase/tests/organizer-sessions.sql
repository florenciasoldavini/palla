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
create temp table qa_values(payload jsonb);
insert into qa_values values (jsonb_build_object('title','QA weekly', 'venueId','', 'venueName','QA Club','venueAddress','QA Address 1','courtLabel','Court 2','date',(current_date+7)::text,'startTime','19:00','endTime','20:30','repeat','weekly','lastDate',(current_date+35)::text,'categoryMode','range','categoryMin','6','categoryMax','7','capacity','8','price','12000','registrationHours','2','cancellationHours','24','description','Bring a racket','courtConfirmed',true));
grant select on qa_values to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub','60000000-0000-4000-8000-000000000001',true);
select public.save_organizer_session('61000000-0000-4000-8000-000000000001',(select payload from qa_values),true);
do $$ begin
  assert (select count(*) from public.sessions) = 5, 'Weekly publish creates five dated occurrences';
  assert (select count(*) from public.venues) = 1, 'Venue created once';
  assert (select bool_and(allowed_categories=array[6,7]::smallint[] and price_minor=1200000) from public.sessions), 'Category and money correct';
  assert (select bool_and(extract(hour from starts_at at time zone 'America/Argentina/Buenos_Aires')=19) from public.sessions), 'Local clock preserved';
end $$;
-- Idempotent publish retry must not duplicate anything.
select public.save_organizer_session('61000000-0000-4000-8000-000000000001',(select payload from qa_values),true);
do $$ declare target public.sessions; original timestamptz; version timestamptz;
begin
  assert (select count(*) from public.sessions)=5;
  select * into target from public.sessions order by occurrence_date limit 1;
  original := target.starts_at;
  perform public.save_organizer_session(target.series_id,(select payload from qa_values)||'{"startTime":"19:30","endTime":"21:00"}'::jsonb,true,target.id,'one',target.updated_at);
  assert (select starts_at from public.sessions where id=target.id)=original+interval '30 minutes';
  assert (select count(*) from public.sessions where starts_at=original+interval '7 days')=1, 'One edit leaves other occurrences unchanged';
  perform pg_temp.expect_error(format('select public.save_organizer_session(%L,%L,true,%L,%L,%L)',target.series_id,(select payload from qa_values),target.id,'one',target.updated_at),'Session changed');
  select updated_at into version from public.sessions where id=target.id;
  perform public.save_organizer_session(target.series_id,(select payload from qa_values)||'{"startTime":"20:00","endTime":"21:30"}'::jsonb,true,target.id,'future',version);
  assert (select count(*) from public.sessions)=5, 'Scope edit never creates occurrences';
  assert (select bool_and(extract(hour from starts_at at time zone 'America/Argentina/Buenos_Aires')=20) from public.sessions), 'Future scope applies the chosen clock time even after one-off edits';
  select updated_at into version from public.sessions where id=target.id;
  assert public.cancel_organizer_session(target.id,'one','Club unavailable',version)=1;
  assert (select count(*) from public.sessions where status='cancelled')=1;
  select * into target from public.sessions where status='published' order by occurrence_date limit 1;
  assert public.cancel_organizer_session(target.id,'future','Weather',target.updated_at)=4;
  assert (select count(*) from public.sessions)=5 and (select bool_and(status='cancelled') from public.sessions), 'Cancellation retains history';
end $$;
-- Partial draft and duplicate manual venue reuse.
select public.save_organizer_session('61000000-0000-4000-8000-000000000002','{"title":"Incomplete draft"}',false);
delete from public.session_series where id='61000000-0000-4000-8000-000000000002' and status='draft';
do $$ begin assert (select count(*) from public.session_series)=1; end $$;
select public.save_organizer_session('61000000-0000-4000-8000-000000000003',(select payload from qa_values)||'{"repeat":"once"}'::jsonb,true);
do $$ begin assert (select count(*) from public.venues)=1; end $$;
select set_config('palla.qa_session_id',(select id::text from public.sessions where status='published' limit 1),true);
-- Another organizer cannot read, edit, cancel or delete A's inventory.
select set_config('request.jwt.claim.sub','60000000-0000-4000-8000-000000000002',true);
do $$ declare affected integer; begin
  update public.sessions set capacity=1 where id=current_setting('palla.qa_session_id')::uuid;
  get diagnostics affected=row_count;
  assert affected=0, 'Another organizer cannot update the owned session';
  assert (select count(*) from public.sessions)=0;
  assert (select count(*) from public.session_series)=0;
  perform pg_temp.expect_error(format('select public.cancel_organizer_session(%L,''one'',null,now())', current_setting('palla.qa_session_id')),'no longer be changed');
  perform pg_temp.expect_error('select public.save_organizer_session(''61000000-0000-4000-8000-000000000001'',''{}'',false)','duplicate key');
end $$;
select set_config('request.jwt.claim.sub','60000000-0000-4000-8000-000000000003',true);
select pg_temp.expect_error('select public.save_organizer_session(''61000000-0000-4000-8000-000000000004'',''{}'',false)','Organizer access required');
set local role anon;
select pg_temp.expect_error('select * from public.sessions','permission denied');
reset role;
rollback;
