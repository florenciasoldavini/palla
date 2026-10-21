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
declare s uuid; other uuid; result jsonb;
begin
 select id into s from public.sessions where series_id='bf310000-0000-4000-8000-000000000001' order by starts_at limit 1;
 select id into other from public.sessions where series_id='bf310000-0000-4000-8000-000000000001' order by starts_at offset 1 limit 1;
 perform set_config('request.jwt.claim.sub','bf300000-0000-4000-8000-000000000002',true);
 perform public.join_session(s);
 insert into public.registrations(session_id,player_id,status,waitlist_sequence) values(s,'bf300000-0000-4000-8000-000000000004','waitlisted',1);
 result:=public.cancel_session_registration(s);
 assert result->>'status'='cancelled' and (result->>'confirmed_count')::int=1,'Count includes automatic promotion';
 assert (select status='cancelled' and cancelled_by=player_id and cancelled_at is not null and checked_in_at is null from public.registrations where session_id=s and player_id='bf300000-0000-4000-8000-000000000002');
 assert (select status='confirmed' from public.registrations where session_id=s and player_id='bf300000-0000-4000-8000-000000000004'),'Automatic waitlist promotion remains active';
 assert public.cancel_session_registration(s)=result,'Repeated cancellation is harmless';
 perform set_config('request.jwt.claim.sub','bf300000-0000-4000-8000-000000000003',true);
 perform pg_temp.join_rejected(format('select public.cancel_session_registration(%L)',s),'CANCEL_NOT_REGISTERED');
 assert (select count(*) from public.registrations where session_id=s and status='confirmed')=1,'Cannot cancel another player';
 perform set_config('request.jwt.claim.sub','bf300000-0000-4000-8000-000000000002',true);
 perform public.join_session(other);
 update public.sessions set cancellation_deadline_at=clock_timestamp()-interval '1 minute' where id=other;
 perform pg_temp.join_rejected(format('select public.cancel_session_registration(%L)',other),'CANCEL_DEADLINE');
 assert (select status='confirmed' from public.registrations where session_id=other and player_id='bf300000-0000-4000-8000-000000000002');
 update public.sessions set cancellation_deadline_at=null,registration_closes_at=clock_timestamp()-interval '1 minute' where id=other;
 assert public.cancel_session_registration(other)->>'status'='cancelled','Registration closure does not prevent an allowed cancellation';
 update public.sessions set registration_closes_at=null where id=other;
 assert public.join_session(other)->>'status'='confirmed','Player can rejoin if eligible';
 insert into public.sessions select (jsonb_populate_record(null::public.sessions,to_jsonb(ss)||jsonb_build_object(
   'id','bf520000-0000-4000-8000-000000000001','occurrence_date',current_date-2,'starts_at',now()-interval '1 hour',
   'ends_at',now()+interval '30 minutes','registration_closes_at',null,'cancellation_deadline_at',null))).* from public.sessions ss where id=other;
 insert into public.registrations(session_id,player_id,status,confirmed_at) values('bf520000-0000-4000-8000-000000000001','bf300000-0000-4000-8000-000000000002','confirmed',now());
 perform pg_temp.join_rejected('select public.cancel_session_registration(''bf520000-0000-4000-8000-000000000001'')','CANCEL_UNAVAILABLE');
 perform set_config('request.jwt.claim.sub','',true);
 perform pg_temp.join_rejected(format('select public.cancel_session_registration(%L)',s),'CANCEL_SIGN_IN_REQUIRED');
 assert not has_function_privilege('anon','public.cancel_session_registration(uuid)','execute');
 assert not has_table_privilege('authenticated','public.registrations','update');
end $$;
select set_config('cancel.test.session',(select id::text from public.sessions where series_id='bf310000-0000-4000-8000-000000000001' order by starts_at desc limit 1),true);
set local role authenticated;
select set_config('request.jwt.claim.sub','bf300000-0000-4000-8000-000000000002',true);
do $$ begin
 assert public.cancel_session_registration(current_setting('cancel.test.session')::uuid)->>'status'='cancelled';
end $$;
reset role;
rollback;
