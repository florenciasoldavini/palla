begin;
create function pg_temp.join_rejected(statement text, expected text) returns void language plpgsql as $$
begin
  begin execute statement; exception when others then
    if position(expected in sqlerrm)>0 then return; end if;
    raise exception 'Unexpected rejection: %',sqlerrm;
  end;
  raise exception 'Expected rejection: %',expected;
end $$;
insert into auth.users(id) select ('bf300000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid from generate_series(1,6)n;
insert into public.profiles(id,first_name,onboarding_completed_at,category_status,playing_category)
select id,'Join QA',case when right(id::text,1)<>'6' then now() end,
 case when right(id::text,1)='5' then 'unknown' else 'known' end,
 case when right(id::text,1)='5' then null when right(id::text,1)='3' then 4 else 6 end
from auth.users where id::text like 'bf300000-%';
insert into public.organizers(profile_id,display_name) values('bf300000-0000-4000-8000-000000000001','Join rollback host');
select set_config('request.jwt.claim.sub','bf300000-0000-4000-8000-000000000001',true);
select public.save_organizer_session('bf310000-0000-4000-8000-000000000001',jsonb_build_object(
 'title','Join rollback','venueId','','venueName','Join rollback club','venueAddress','Test address 321',
 'date',to_char(current_date+14,'YYYY-MM-DD'),'lastDate',to_char(current_date+21,'YYYY-MM-DD'),
 'startTime','19:00','endTime','20:30','repeat','weekly','capacity','1','price','0','courtConfirmed',true,
 'settings',jsonb_build_object('visibility','public','allowed_categories',array[6],'strict_category_enforcement',true,
 'participant_gender_policy','all','waitlist_enabled',true,'waitlist_promotion_mode','automatic','waitlist_capacity',null,
 'registration_opens_minutes_before',null,'registration_closes_minutes_before',null,'cancellation_notice_minutes',null)),true);
do $$
declare s uuid; other uuid; first_result jsonb; again jsonb; initial_count integer;
begin
 select id into s from public.sessions where series_id='bf310000-0000-4000-8000-000000000001' order by starts_at limit 1;
 select id into other from public.sessions where series_id='bf310000-0000-4000-8000-000000000001' order by starts_at offset 1 limit 1;
 perform pg_temp.join_rejected(format('select public.join_session(%L)',s),'JOIN_HOST');
 perform set_config('request.jwt.claim.sub','bf300000-0000-4000-8000-000000000003',true);
 perform pg_temp.join_rejected(format('select public.join_session(%L)',s),'JOIN_CATEGORY');
 perform set_config('request.jwt.claim.sub','bf300000-0000-4000-8000-000000000005',true);
 perform pg_temp.join_rejected(format('select public.join_session(%L)',s),'JOIN_CATEGORY');
 perform set_config('request.jwt.claim.sub','bf300000-0000-4000-8000-000000000006',true);
 perform pg_temp.join_rejected(format('select public.join_session(%L)',s),'JOIN_PROFILE_REQUIRED');
 perform set_config('request.jwt.claim.sub','bf300000-0000-4000-8000-000000000002',true);
 first_result:=public.join_session(s);
 again:=public.join_session(s);
 assert first_result=again,'Retry returns existing registration';
 assert first_result->>'status'='confirmed' and (first_result->>'confirmed_count')::int=1;
 assert (select count(*) from public.registrations where session_id=s)=1;
 assert not exists(select 1 from public.registrations where session_id=other),'Only selected occurrence';
 assert (select checked_in_at is null and checked_in_by is null from public.registrations where session_id=s),'Join is not attendance';
 assert public.get_public_session_detail(s)->>'viewer_registration'='confirmed';
 perform set_config('request.jwt.claim.sub','bf300000-0000-4000-8000-000000000004',true);
 perform pg_temp.join_rejected(format('select public.join_session(%L)',s),'JOIN_FULL');
 assert not exists(select 1 from public.registrations where session_id=s and status='waitlisted'),'No implicit queue enrollment';
 update public.sessions set registration_opens_at=clock_timestamp()+interval '1 day' where id=other;
 perform pg_temp.join_rejected(format('select public.join_session(%L)',other),'JOIN_NOT_OPEN');
 update public.sessions set registration_opens_at=null,registration_closes_at=clock_timestamp()-interval '1 minute' where id=other;
 perform pg_temp.join_rejected(format('select public.join_session(%L)',other),'JOIN_CLOSED');
 update public.sessions set registration_closes_at=null,visibility='private' where id=other;
 perform pg_temp.join_rejected(format('select public.join_session(%L)',other),'JOIN_UNAVAILABLE');
 update public.sessions set visibility='public',strict_category_enforcement=false where id=other;
 perform set_config('request.jwt.claim.sub','bf300000-0000-4000-8000-000000000005',true);
 assert public.join_session(other)->>'status'='confirmed','Non-strict category allows joining';
 insert into public.sessions select (jsonb_populate_record(null::public.sessions,to_jsonb(ss)||jsonb_build_object(
   'id','bf320000-0000-4000-8000-000000000001','occurrence_date',current_date-2,'starts_at',now()-interval '2 days',
   'ends_at',now()-interval '2 days'+interval '90 minutes','status','completed','completed_at',now()))).* from public.sessions ss where id=other;
 perform pg_temp.join_rejected('select public.join_session(''bf320000-0000-4000-8000-000000000001'')','JOIN_UNAVAILABLE');
 -- A player cannot undo a host removal by rejoining.
 update public.registrations set status='cancelled',cancelled_at=clock_timestamp(),cancelled_by='bf300000-0000-4000-8000-000000000001' where session_id=other;
 perform pg_temp.join_rejected(format('select public.join_session(%L)',other),'JOIN_REMOVED');
 update public.registrations set cancelled_by=player_id where session_id=other;
 assert public.join_session(other)->>'status'='confirmed','Self-cancelled registration can rejoin when eligible';
 update public.sessions set status='cancelled',cancelled_at=clock_timestamp() where id=other;
 perform pg_temp.join_rejected(format('select public.join_session(%L)',other),'JOIN_UNAVAILABLE');
 perform set_config('request.jwt.claim.sub','',true);
 perform pg_temp.join_rejected(format('select public.join_session(%L)',s),'JOIN_SIGN_IN_REQUIRED');
 assert not has_function_privilege('anon','public.join_session(uuid)','execute');
 assert not has_table_privilege('authenticated','public.registrations','insert');
 assert not has_table_privilege('authenticated','public.registrations','update');
end $$;
-- Exercise actual authenticated permissions, not only the owner role.
select set_config('join.test.session',(select id::text from public.sessions where series_id='bf310000-0000-4000-8000-000000000001' and status='published' order by starts_at limit 1),true);
set local role authenticated;
select set_config('request.jwt.claim.sub','bf300000-0000-4000-8000-000000000002',true);
do $$begin
 assert public.join_session(current_setting('join.test.session')::uuid)->>'status'='confirmed';
 perform pg_temp.join_rejected('select public.join_session(''00000000-0000-4000-8000-000000000000'')','JOIN_UNAVAILABLE');
end $$;
reset role;
rollback;
