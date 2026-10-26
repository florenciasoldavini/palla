begin;
-- Scope all fixture reads/writes to this test's series, even on a populated project.
create temporary view waitlist_test_sessions with (security_invoker=true) as
 select * from public.sessions where series_id='71000000-0000-4000-8000-000000000001';
create temporary view waitlist_test_registrations with (security_invoker=true) as
 select * from public.registrations where session_id in (select id from pg_temp.waitlist_test_sessions);
grant select,update,insert,delete on pg_temp.waitlist_test_sessions,pg_temp.waitlist_test_registrations to authenticated,anon;

insert into auth.users(id) select ('70000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid from generate_series(1,9) n;
insert into public.profiles(id,first_name,playing_category,category_status,onboarding_completed_at) select id,'Waitlist QA',6,'known',now() from auth.users where id::text like '70000000%';
insert into public.organizers(profile_id,display_name) values ('70000000-0000-4000-8000-000000000001','Owner'),('70000000-0000-4000-8000-000000000002','Other');
create function pg_temp.expect_error(statement text,pattern text) returns void language plpgsql as $$ begin execute statement; raise exception 'Expected rejection did not happen'; exception when others then if sqlerrm not like '%'||pattern||'%' then raise; end if; end; $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000001',true);
select public.save_organizer_session('71000000-0000-4000-8000-000000000001',jsonb_build_object('title','Waitlist QA','venueId','','venueName','QA Club','venueAddress','QA Address','courtLabel','','date',(current_date+7)::text,'startTime','19:00','endTime','20:30','repeat','once','lastDate',(current_date+7)::text,'categoryMode','all','capacity','2','price','0','registrationHours','2','cancellationHours','24','description','','courtConfirmed',true),true);
reset role;
update pg_temp.waitlist_test_sessions set waitlist_enabled=true,waitlist_promotion_mode='manual' where series_id='71000000-0000-4000-8000-000000000001';
insert into pg_temp.waitlist_test_registrations(id,session_id,player_id,status,confirmed_at) select '72000000-0000-4000-8000-000000000003',id,'70000000-0000-4000-8000-000000000003','confirmed',now() from pg_temp.waitlist_test_sessions;
insert into pg_temp.waitlist_test_registrations(id,session_id,player_id,status) select ('72000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,s.id,('70000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'waitlisted' from pg_temp.waitlist_test_sessions s cross join generate_series(4,6) n order by n;
set local role authenticated;
select set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000002',true);
do $$ begin perform pg_temp.expect_error('select public.get_organizer_waitlist((select id from pg_temp.waitlist_test_sessions limit 1))','Organizer access required'); perform pg_temp.expect_error('select public.manage_organizer_waitlist(''72000000-0000-4000-8000-000000000004'',''promote'',now())','Organizer access required'); end $$;
select set_config('request.jwt.claim.sub','70000000-0000-4000-8000-000000000001',true);
do $$ declare w jsonb; r pg_temp.waitlist_test_registrations; result jsonb; begin
 w:=public.get_organizer_waitlist((select id from pg_temp.waitlist_test_sessions limit 1));
 assert jsonb_array_length(w->'entries')=3 and w->>'blocked_reason' is null;
 assert w->'entries'->0->>'waitlist_sequence'='1';
 select * into r from pg_temp.waitlist_test_registrations where id='72000000-0000-4000-8000-000000000005';
 perform pg_temp.expect_error(format('select public.manage_organizer_waitlist(%L,''promote'',%L)',r.id,now()-interval '1 day'),'Waitlist changed');
 result:=public.manage_organizer_waitlist(r.id,'promote',r.updated_at);
 assert result->>'status'='confirmed';
 assert public.manage_organizer_waitlist(r.id,'promote',r.updated_at)=result,'Same promotion retry is idempotent';
 select * into r from pg_temp.waitlist_test_registrations where id='72000000-0000-4000-8000-000000000004';
 perform pg_temp.expect_error(format('select public.manage_organizer_waitlist(%L,''promote'',%L)',r.id,r.updated_at),'full');
 result:=public.manage_organizer_waitlist(r.id,'remove',r.updated_at);
 assert result->>'status'='cancelled' and result->>'cancelled_by'=auth.uid()::text;
 assert public.manage_organizer_waitlist(r.id,'remove',r.updated_at)=result;
 result:=public.set_organizer_waitlist_mode((w->>'session_id')::uuid,'automatic',(w->>'session_version')::timestamptz);
 assert result->>'promotion_mode'='automatic','Mode response reflects the saved setting';
end $$;
reset role;
-- A confirmed cancellation automatically fills the vacated place, atomically.
update pg_temp.waitlist_test_registrations set status='cancelled',cancelled_at=now(),cancelled_by='70000000-0000-4000-8000-000000000001' where id='72000000-0000-4000-8000-000000000003';
do $$ begin assert (select status='confirmed' from pg_temp.waitlist_test_registrations where id='72000000-0000-4000-8000-000000000006'); assert (select count(*) from pg_temp.waitlist_test_registrations where status='confirmed')=2; end $$;
-- Manual mode holds open places; automatic mode fills immediately and skips ineligible categories.
update pg_temp.waitlist_test_sessions set waitlist_promotion_mode='manual',allowed_categories=array[6],strict_category_enforcement=true;
update public.profiles set playing_category=8 where id='70000000-0000-4000-8000-000000000007';
insert into pg_temp.waitlist_test_registrations(id,session_id,player_id,status) select ('72000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,s.id,('70000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'waitlisted' from pg_temp.waitlist_test_sessions s cross join generate_series(7,8) n order by n;
update pg_temp.waitlist_test_sessions set capacity=3;
do $$ begin assert (select count(*) from pg_temp.waitlist_test_registrations where status='waitlisted')=2; end $$;
set local role authenticated;
do $$ declare s pg_temp.waitlist_test_sessions; r pg_temp.waitlist_test_registrations; begin
 select * into s from pg_temp.waitlist_test_sessions limit 1;
 select * into r from pg_temp.waitlist_test_registrations where id='72000000-0000-4000-8000-000000000007';
 perform pg_temp.expect_error(format('select public.manage_organizer_waitlist(%L,''promote'',%L)',r.id,r.updated_at),'category is not eligible');
 perform public.set_organizer_waitlist_mode(s.id,'automatic',s.updated_at);
 assert (select status='confirmed' from pg_temp.waitlist_test_registrations where id='72000000-0000-4000-8000-000000000008');
 assert (select status='waitlisted' from pg_temp.waitlist_test_registrations where id=r.id);
end $$;
reset role;
update pg_temp.waitlist_test_sessions set registration_closes_at=now()-interval '1 minute',capacity=4,strict_category_enforcement=false;
set local role authenticated;
do $$ declare r pg_temp.waitlist_test_registrations; begin
 select * into r from pg_temp.waitlist_test_registrations where id='72000000-0000-4000-8000-000000000007';
 perform pg_temp.expect_error(format('select public.manage_organizer_waitlist(%L,''promote'',%L)',r.id,r.updated_at),'deadline');
end $$;
reset role;
update pg_temp.waitlist_test_sessions set registration_closes_at=starts_at,waitlist_promotion_mode='manual',waitlist_capacity=1;
do $$ begin perform pg_temp.expect_error('insert into pg_temp.waitlist_test_registrations(session_id,player_id,status) select id,''70000000-0000-4000-8000-000000000009'',''waitlisted'' from pg_temp.waitlist_test_sessions','Waitlist capacity exceeded'); end $$;
-- Whole-session cancellation never promotes anyone.
set local role authenticated;
do $$ declare s pg_temp.waitlist_test_sessions; begin select * into s from pg_temp.waitlist_test_sessions limit 1; perform public.cancel_organizer_session(s.id,'one','QA',s.updated_at); assert (select count(*) from pg_temp.waitlist_test_registrations where status in ('confirmed','waitlisted'))=0; end $$;
set local role anon;
do $$ begin perform pg_temp.expect_error('select public.get_organizer_waitlist(null)','permission denied'); perform pg_temp.expect_error('select public.manage_organizer_waitlist(null,''promote'',now())','permission denied'); end $$;
rollback;
