-- Isolated rollback-only fixture. No live account writes.
begin;
insert into auth.users(id) values ('60000000-0000-4000-8000-000000000001'),('60000000-0000-4000-8000-000000000002'),('60000000-0000-4000-8000-000000000003'),('60000000-0000-4000-8000-000000000004'),('60000000-0000-4000-8000-000000000005');
insert into public.profiles(id,first_name,onboarding_completed_at) select id,'QA',now() from auth.users;
insert into public.organizers(profile_id,display_name) values ('60000000-0000-4000-8000-000000000001','Owner'),('60000000-0000-4000-8000-000000000002','Other organizer');
create function pg_temp.expect_error(statement text,pattern text) returns void language plpgsql as $$
begin execute statement; raise exception 'Expected rejection did not happen';
exception when others then if sqlerrm not like '%'||pattern||'%' then raise; end if; end; $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','60000000-0000-4000-8000-000000000001',true);
select public.save_organizer_session('61000000-0000-4000-8000-000000000001',jsonb_build_object('title','Attendance QA','venueId','','venueName','QA Club','venueAddress','QA Address','courtLabel','','date',(current_date+7)::text,'startTime','19:00','endTime','20:30','repeat','once','lastDate',(current_date+7)::text,'categoryMode','all','capacity','2','price','0','registrationHours','2','cancellationHours','24','description','','courtConfirmed',true),true);
reset role;
insert into public.registrations(id,session_id,player_id,status,confirmed_at) select '62000000-0000-4000-8000-000000000001',id,'60000000-0000-4000-8000-000000000003','confirmed',now() from public.sessions;
insert into public.registrations(id,session_id,player_id,status,confirmed_at) select '62000000-0000-4000-8000-000000000002',id,'60000000-0000-4000-8000-000000000004','confirmed',now() from public.sessions;
do $$ begin
  perform pg_temp.expect_error('insert into public.registrations(session_id,player_id,confirmed_at) select id,''60000000-0000-4000-8000-000000000005'',now() from public.sessions','capacity exceeded');
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','60000000-0000-4000-8000-000000000003',true);
do $$ begin
 assert (select count(*) from public.registrations)=0,'Players cannot read organizer roster';
 perform pg_temp.expect_error('select public.get_organizer_roster((select session_id from public.registrations limit 1))','Organizer access required');
 perform pg_temp.expect_error('select public.set_registration_attendance(''62000000-0000-4000-8000-000000000001'',true,now())','Organizer access required');
 perform pg_temp.expect_error('update public.registrations set checked_in_at=now()','permission denied');
end $$;
select set_config('request.jwt.claim.sub','60000000-0000-4000-8000-000000000002',true);
do $$ begin
 assert (select count(*) from public.registrations)=0,'Other organizer cannot read roster';
 perform pg_temp.expect_error('select public.set_registration_attendance(''62000000-0000-4000-8000-000000000001'',true,now())','Organizer access required');
end $$;
select set_config('request.jwt.claim.sub','60000000-0000-4000-8000-000000000001',true);
do $$ declare r public.registrations; original timestamptz; response jsonb;
begin
 assert (select count(*) from public.registrations)=2;
 assert jsonb_array_length(public.get_organizer_roster((select id from public.sessions limit 1)))=2;
 select * into r from public.registrations where id='62000000-0000-4000-8000-000000000001'; original:=r.updated_at;
 response:=public.set_registration_attendance(r.id,true,original);
 assert response->>'checked_in_by'='60000000-0000-4000-8000-000000000001' and response->>'checked_in_at' is not null;
 assert public.set_registration_attendance(r.id,true,original)=response,'Retry does not change arrival timestamp';
 perform pg_temp.expect_error(format('select public.set_registration_attendance(%L,false,%L)',r.id,original),'Attendance changed');
 response:=public.set_registration_attendance(r.id,false,(response->>'updated_at')::timestamptz);
 assert response->>'checked_in_at' is null and response->>'checked_in_by' is null,'Undo clears both fields';
 perform pg_temp.expect_error('update public.sessions set capacity=1','below confirmed attendance');
end $$;
-- The owning organizer's cancellation closes all roster entries atomically.
do $$ declare s public.sessions; begin
 select * into s from public.sessions limit 1;
 perform public.cancel_organizer_session(s.id,'one','QA',s.updated_at);
 assert (select bool_and(status='cancelled' and cancelled_by=s.organizer_id) from public.registrations);
 assert jsonb_array_length(public.get_organizer_roster(s.id))=0;
 perform pg_temp.expect_error('select public.set_registration_attendance(''62000000-0000-4000-8000-000000000001'',true,now())','Attendance unavailable');
end $$;
set local role anon;
do $$ begin
 perform pg_temp.expect_error('select public.get_organizer_roster(null)','permission denied');
 perform pg_temp.expect_error('select public.set_registration_attendance(null,true,now())','permission denied');
end $$;
rollback;
