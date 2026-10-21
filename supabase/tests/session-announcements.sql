-- Isolated rollback fixtures: never contacts real accounts or devices.
begin;
create function pg_temp.expect_error(statement text, pattern text) returns void language plpgsql as $$begin execute statement;raise exception 'Expected rejection did not happen';exception when others then if sqlerrm not like '%'||pattern||'%' then raise;end if;end$$;
insert into auth.users(id) select ('aa000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid from generate_series(1,6)n;
insert into public.profiles(id,first_name,onboarding_completed_at) select id,'Announcement QA',now() from auth.users where id::text like 'aa000000-%';
insert into public.organizers(profile_id,display_name) values('aa000000-0000-4000-8000-000000000001','Announcement QA host');
insert into public.venues(id,created_by,name,address) values('aa100000-0000-4000-8000-000000000001','aa000000-0000-4000-8000-000000000001','QA rollback venue','No real place');
insert into public.session_series(id,organizer_id,draft_input) values('aa200000-0000-4000-8000-000000000001','aa000000-0000-4000-8000-000000000001','{}');
insert into public.sessions(id,organizer_id,series_id,occurrence_date,venue_id,title,capacity,price_minor,starts_at,ends_at,status,waitlist_enabled)
select ('aa300000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'aa000000-0000-4000-8000-000000000001','aa200000-0000-4000-8000-000000000001',current_date+n,'aa100000-0000-4000-8000-000000000001','Announcement QA '||n,8,0,case when n=4 then now()-interval '2 hours' else now()+interval '1 day'*n end,case when n=4 then now()-interval '1 hour' else now()+interval '1 day'*n+interval '1 hour' end,'published',true from generate_series(1,4)n;
update public.sessions set waitlist_promotion_mode='manual' where id::text like 'aa300000-%' and starts_at>now();
update public.sessions set status='cancelled',cancelled_at=now() where id='aa300000-0000-4000-8000-000000000003';
insert into public.registrations(id,session_id,player_id,status,confirmed_at) values
('aa400000-0000-4000-8000-000000000001','aa300000-0000-4000-8000-000000000001','aa000000-0000-4000-8000-000000000002','confirmed',now()),
('aa400000-0000-4000-8000-000000000002','aa300000-0000-4000-8000-000000000001','aa000000-0000-4000-8000-000000000001','confirmed',now());
insert into public.registrations(id,session_id,player_id,status,waitlist_sequence) values('aa400000-0000-4000-8000-000000000003','aa300000-0000-4000-8000-000000000001','aa000000-0000-4000-8000-000000000003','waitlisted',1);
insert into public.registrations(id,session_id,player_id,status,cancelled_at,cancelled_by) values('aa400000-0000-4000-8000-000000000004','aa300000-0000-4000-8000-000000000001','aa000000-0000-4000-8000-000000000004','cancelled',now(),'aa000000-0000-4000-8000-000000000004');
insert into private.chat_push_devices(installation_id,profile_id,expo_token,platform) values('aa500000-0000-4000-8000-000000000002','aa000000-0000-4000-8000-000000000002','ExpoPushToken[announcement-qa-invalid]','android');
set local role authenticated;
select set_config('request.jwt.claim.sub','aa000000-0000-4000-8000-000000000002',true);
do $$begin
 assert exists(select 1 from jsonb_array_elements(public.get_notification_settings('player'))r where r->>'key'='session_announcements');
 assert (public.get_push_subscription_state()->>'session_announcements')::boolean;
 perform pg_temp.expect_error($s$select public.publish_session_announcement('aa300000-0000-4000-8000-000000000001','Hello','aa600000-0000-4000-8000-000000000001',1)$s$,'Organizer access required');
 perform pg_temp.expect_error($s$select * from public.session_announcements$s$,'permission denied');
end$$;
select set_config('request.jwt.claim.sub','aa000000-0000-4000-8000-000000000001',true);
do $$declare ctx jsonb; a uuid;begin
 assert not exists(select 1 from jsonb_array_elements(public.get_notification_settings('organizer'))r where r->>'key'='session_announcements');
 assert (public.get_session_announcements('aa300000-0000-4000-8000-000000000001')->>'recipient_count')::int=1,'Host excluded';
 perform pg_temp.expect_error($s$select public.publish_session_announcement('aa300000-0000-4000-8000-000000000001',E' \n\t','aa600000-0000-4000-8000-000000000001',1)$s$,'1,000');
 perform pg_temp.expect_error($s$select public.publish_session_announcement('aa300000-0000-4000-8000-000000000001',repeat('a',1001),'aa600000-0000-4000-8000-000000000001',1)$s$,'1,000');
 perform pg_temp.expect_error($s$select public.publish_session_announcement('aa300000-0000-4000-8000-000000000001','Hello','aa600000-0000-4000-8000-000000000001',2)$s$,'recipient count changed');
 perform pg_temp.expect_error($s$select public.publish_session_announcement('aa300000-0000-4000-8000-000000000002','Hello','aa600000-0000-4000-8000-000000000001',0)$s$,'no confirmed');
 perform pg_temp.expect_error($s$select public.publish_session_announcement('aa300000-0000-4000-8000-000000000003','Hello','aa600000-0000-4000-8000-000000000001',1)$s$,'before the session ends');
 ctx:=public.publish_session_announcement('aa300000-0000-4000-8000-000000000001','Court 3 today','aa600000-0000-4000-8000-000000000001',1);
 a:=(ctx->'announcements'->0->>'id')::uuid;
 assert (ctx->'announcements'->0->>'recipient_count')::int=1;
 assert public.publish_session_announcement('aa300000-0000-4000-8000-000000000001','Court 3 today','aa600000-0000-4000-8000-000000000001',1)->'announcements'->0->>'id'=a::text,'Retry idempotent';
 perform pg_temp.expect_error($s$select public.publish_session_announcement('aa300000-0000-4000-8000-000000000001','Changed','aa600000-0000-4000-8000-000000000001',1)$s$,'already used');
end$$;
reset role;
do $$begin
 assert (select count(*) from private.app_notifications where recipient_id::text like 'aa000000-%')=1,'Confirmed audience only, one notification';
 assert (select count(*) from private.notification_push_jobs where recipient_id::text like 'aa000000-%')=1,'One push job';
 assert (select count(*) from private.session_announcement_recipients where recipient_id::text like 'aa000000-%')=1;
end$$;
set local role service_role;
do $$declare jobs jsonb;begin
 jobs:=public.claim_review_notification_push_jobs();
 assert exists(select 1 from jsonb_array_elements(jobs)j where j->>'recipient_id'='aa000000-0000-4000-8000-000000000002' and j->>'kind'='session_announcements' and j->>'mode'='player'),'Worker claims typed announcement target';
end$$;
reset role;
-- A later registrant sees history, but receives no historical alerts.
insert into public.registrations(id,session_id,player_id,status,confirmed_at) values('aa400000-0000-4000-8000-000000000005','aa300000-0000-4000-8000-000000000001','aa000000-0000-4000-8000-000000000005','confirmed',now());
set local role authenticated;
select set_config('request.jwt.claim.sub','aa000000-0000-4000-8000-000000000005',true);
do $$begin assert jsonb_array_length(public.get_session_announcements('aa300000-0000-4000-8000-000000000001')->'announcements')=1;assert jsonb_array_length(public.get_notification_inbox('player'))=0;end$$;
select set_config('request.jwt.claim.sub','aa000000-0000-4000-8000-000000000003',true);
select pg_temp.expect_error($s$select public.get_session_announcements('aa300000-0000-4000-8000-000000000001')$s$,'unavailable');
select set_config('request.jwt.claim.sub','aa000000-0000-4000-8000-000000000006',true);
select pg_temp.expect_error($s$select public.get_session_announcements('aa300000-0000-4000-8000-000000000001')$s$,'unavailable');
select set_config('request.jwt.claim.sub','aa000000-0000-4000-8000-000000000002',true);
do $$declare item jsonb; a uuid;begin
 item:=public.get_notification_inbox('player')->0;a:=(item->>'announcement_id')::uuid;
 assert item->>'notification_type'='session_announcements';assert item->>'announcement_preview'='Court 3 today';
 assert public.get_notification_target((item->>'id')::uuid)->>'announcement_id'=a::text;
 assert public.get_session_announcement(a)->'announcements'->0->>'body'='Court 3 today';
 perform pg_temp.expect_error(format('select public.remove_session_announcement(%L)',a),'unavailable');
 assert public.set_notification_preference('session_announcements',false)=false;
 assert public.get_unread_notification_count('player')=1,'Opt-out preserves inbox';
 perform public.mark_notifications_read('player',(item->>'id')::uuid);
 assert public.get_unread_notification_count('player')=0;
 assert jsonb_array_length(public.get_notification_inbox('player'))=1;
end$$;
reset role;
do $$begin assert not exists(select 1 from private.notification_push_jobs where recipient_id::text like 'aa000000-%' and state='pending'),'Preference skips pending push';end$$;
-- Cancellation retains access to messages originally received.
update public.registrations set status='cancelled',cancelled_at=now(),cancelled_by=player_id where id='aa400000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','aa000000-0000-4000-8000-000000000002',true);
do $$begin assert jsonb_array_length(public.get_session_announcements('aa300000-0000-4000-8000-000000000001')->'announcements')=1;end$$;
select set_config('request.jwt.claim.sub','aa000000-0000-4000-8000-000000000001',true);
do $$declare a uuid;begin
 a:=(public.get_session_announcements('aa300000-0000-4000-8000-000000000001')->'announcements'->0->>'id')::uuid;
 perform public.remove_session_announcement(a);perform public.remove_session_announcement(a);
 assert public.get_session_announcement(a)->'announcements'->0->>'body' is null;
end$$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','aa000000-0000-4000-8000-000000000001',true);
select pg_temp.expect_error($s$select public.publish_session_announcement('aa300000-0000-4000-8000-000000000004','Hello','aa600000-0000-4000-8000-000000000002',1)$s$,'before the session ends');
-- Rate limits serialize per host, including sends across occurrences. Removed sends still count.
select set_config('request.jwt.claim.sub','aa000000-0000-4000-8000-000000000001',true);
do $$begin
 for n in 1..9 loop
  perform public.publish_session_announcement('aa300000-0000-4000-8000-000000000001','Another update',('aa700000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,1);
 end loop;
 perform pg_temp.expect_error($s$select public.publish_session_announcement('aa300000-0000-4000-8000-000000000001','Too many','aa700000-0000-4000-8000-000000000010',1)$s$,'Please wait a minute');
end$$;
select set_config('request.jwt.claim.sub','aa000000-0000-4000-8000-000000000002',true);
do $$begin assert jsonb_array_length(public.get_session_announcements('aa300000-0000-4000-8000-000000000001')->'announcements')=1,'Cancelled original recipient cannot see later announcements';end$$;
set local role anon;
select pg_temp.expect_error($s$select public.get_session_announcements('aa300000-0000-4000-8000-000000000001')$s$,'permission denied');
reset role;
set local role service_role;
select public.claim_review_notification_push_jobs();
reset role;
rollback;
