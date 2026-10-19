-- Isolated rollback-only fixtures: no real accounts, sessions or push destinations.
begin;
create function pg_temp.expect_error(statement text, pattern text) returns void language plpgsql as $$
begin execute statement; raise exception 'Expected rejection did not happen';
exception when others then if sqlerrm not like '%'||pattern||'%' then raise; end if; end; $$;
insert into auth.users(id) values ('a9000000-0000-4000-8000-000000000001'),('a9000000-0000-4000-8000-000000000002'),('a9000000-0000-4000-8000-000000000003');
insert into public.profiles(id,first_name,onboarding_completed_at) select id,'Review QA',now() from auth.users where id::text like 'a9000000-%';
insert into public.organizers(profile_id,display_name) values ('a9000000-0000-4000-8000-000000000001','Review QA host');
insert into public.venues(id,created_by,name,address) values ('a9100000-0000-4000-8000-000000000001','a9000000-0000-4000-8000-000000000001','Isolated review QA venue','Rollback only review QA');
insert into public.session_series(id,organizer_id,draft_input) values ('a9200000-0000-4000-8000-000000000001','a9000000-0000-4000-8000-000000000001','{}');
insert into public.sessions(id,organizer_id,series_id,occurrence_date,venue_id,title,capacity,price_minor,starts_at,ends_at,registration_closes_at,cancellation_deadline_at,status,waitlist_enabled)
select ('a9300000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'a9000000-0000-4000-8000-000000000001','a9200000-0000-4000-8000-000000000001',current_date-n,'a9100000-0000-4000-8000-000000000001','Review QA '||n,8,0,
case when n=3 then now()+interval '1 day' when n=4 then now()-interval '16 days' else now()-interval '4 hours' end,
case when n=3 then now()+interval '25 hours' when n=4 then now()-interval '15 days' else now()-interval '2 hours' end,
now()-interval '20 days',now()-interval '20 days','published',true from generate_series(1,4)n;
insert into public.registrations(id,session_id,player_id,status,confirmed_at)
select ('a9400000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,('a9300000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'a9000000-0000-4000-8000-000000000002','confirmed',now()-interval '20 days' from generate_series(1,4)n;
insert into public.registrations(id,session_id,player_id,status,confirmed_at) values ('a9400000-0000-4000-8000-000000000005','a9300000-0000-4000-8000-000000000001','a9000000-0000-4000-8000-000000000001','confirmed',now());
insert into public.registrations(id,session_id,player_id,status,cancelled_at,cancelled_by) values ('a9400000-0000-4000-8000-000000000006','a9300000-0000-4000-8000-000000000002','a9000000-0000-4000-8000-000000000003','cancelled',now(),'a9000000-0000-4000-8000-000000000003');
-- Device records use invalid local-only tokens. Nothing commits and the transport is never called.
insert into private.chat_push_devices(installation_id,profile_id,expo_token,platform) values
('a9500000-0000-4000-8000-000000000001','a9000000-0000-4000-8000-000000000001','ExpoPushToken[review-qa-host]','ios'),
('a9500000-0000-4000-8000-000000000002','a9000000-0000-4000-8000-000000000002','ExpoPushToken[review-qa-player]','android');
select private.complete_sessions_and_request_reviews();
select private.complete_sessions_and_request_reviews();
do $$ begin
 assert (select count(*) from private.app_notifications where recipient_id::text like 'a9000000-%')=2,'Only eligible reminders, once';
 assert (select count(*) from public.sessions where id::text like 'a9300000-%' and status='completed' and completed_at is not null)=3;
 assert (select count(*) from private.notification_push_jobs where recipient_id::text like 'a9000000-%')=2;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','a9000000-0000-4000-8000-000000000002',true);
do $$declare response jsonb; v uuid; original timestamptz;begin
 assert jsonb_array_length(public.get_notification_settings('player'))=2;
 perform pg_temp.expect_error($s$select public.get_notification_settings('organizer')$s$,'Organizer access required');
 assert public.set_notification_preference('chat_messages',false)=false;
 assert public.get_chat_notification_preference()=false,'Old API preserved';
 assert (public.get_push_subscription_state()->>'review_reminders')::boolean;
 assert (public.get_review_context('a9400000-0000-4000-8000-000000000001')->>'eligible')::boolean;
 assert (public.get_review_context('a9400000-0000-4000-8000-000000000001')->>'starts_at')::timestamptz=now()-interval '4 hours';
 assert public.get_review_context('a9400000-0000-4000-8000-000000000001')->>'timezone'='America/Argentina/Buenos_Aires';
 perform pg_temp.expect_error($s$select public.submit_session_review('a9400000-0000-4000-8000-000000000003',5,'')$s$,'window');
 perform pg_temp.expect_error($s$select public.submit_session_review('a9400000-0000-4000-8000-000000000004',5,'')$s$,'window');
 perform pg_temp.expect_error($s$select public.submit_session_review('a9400000-0000-4000-8000-000000000001',0,'')$s$,'rating');
 perform pg_temp.expect_error($s$select public.submit_session_review('a9400000-0000-4000-8000-000000000001',5,repeat('x',2001))$s$,'2000');
 response:=public.submit_session_review('a9400000-0000-4000-8000-000000000001',5,'Great session');
 v:=(response->'review'->>'id')::uuid; original:=(response->'review'->>'updated_at')::timestamptz;
 assert public.submit_session_review('a9400000-0000-4000-8000-000000000001',5,'Great session')=response,'Lost-response retry is idempotent';
 perform pg_temp.expect_error($s$select public.submit_session_review('a9400000-0000-4000-8000-000000000001',1,'Overwrite')$s$,'changed');
 response:=public.submit_session_review('a9400000-0000-4000-8000-000000000001',4,'Edited',original);
 perform pg_temp.expect_error(format('select public.report_session_review(%L,''other'','''')',v),'Only this session host');
 perform public.submit_session_review('a9400000-0000-4000-8000-000000000002',2,'Different session');
 assert (public.get_review_rating_summary('a9000000-0000-4000-8000-000000000001')->>'count')::integer=2;
 assert (public.get_review_rating_summary('a9000000-0000-4000-8000-000000000001')->>'rating')::numeric=3,'Each session counts equally';
 assert public.get_unread_notification_count('player')=2;
 perform public.mark_notifications_read('player');
 assert public.get_unread_notification_count('player')=0;
 assert jsonb_array_length(public.get_notification_inbox('player',true))=0;
 assert jsonb_array_length(public.get_notification_inbox('player'))=2,'Read invitations remain available';
 perform pg_temp.expect_error($s$select public.moderate_session_review(null,'hide',null,'test')$s$,'permission denied');
 perform pg_temp.expect_error($s$update public.session_reviews set rating=1$s$,'permission denied');
 perform pg_temp.expect_error($s$select * from private.review_reports$s$,'permission denied');
end $$;
select set_config('request.jwt.claim.sub','a9000000-0000-4000-8000-000000000003',true);
do $$begin
 perform pg_temp.expect_error($s$select public.get_review_context('a9400000-0000-4000-8000-000000000001')$s$,'Review unavailable');
 perform pg_temp.expect_error($s$select public.submit_session_review('a9400000-0000-4000-8000-000000000006',1,'')$s$,'window');
 assert jsonb_array_length(public.get_notification_inbox('player'))=0;
end $$;
select set_config('request.jwt.claim.sub','a9000000-0000-4000-8000-000000000001',true);
do $$declare v uuid;begin
 assert jsonb_array_length(public.get_notification_settings('organizer'))=2;
 assert jsonb_array_length(public.get_notification_inbox('organizer'))=2,'Exactly one host alert per initial review';
 assert jsonb_array_length(public.get_notification_inbox('player'))=0,'No self reminder';
 perform pg_temp.expect_error($s$select public.submit_session_review('a9400000-0000-4000-8000-000000000005',5,'')$s$,'window');
 v:=(public.get_review_context('a9400000-0000-4000-8000-000000000001')->'review'->>'id')::uuid;
 perform public.report_session_review(v,'other','QA report');
 perform public.report_session_review(v,'spam','Duplicate');
 assert (select status from public.session_reviews where id=v)='published','Reporting does not hide';
 perform public.set_notification_preference('new_reviews',false);
end $$;
reset role;
do $$declare v uuid;begin
 assert (select count(*) from private.review_reports where reporter_id::text like 'a9000000-%')=1;
 assert not exists(select 1 from public.registrations where id::text like 'a9400000-%' and checked_in_at is not null),'Review never changes attendance';
 assert not exists(select 1 from private.notification_push_jobs where recipient_id='a9000000-0000-4000-8000-000000000001' and state='pending'),'Opt-out skips queued jobs';
 select id into v from public.session_reviews where registration_id='a9400000-0000-4000-8000-000000000001';
 perform private.moderate_session_review(v,'hide','a9000000-0000-4000-8000-000000000003','QA moderation');
 assert (select count(*) from private.review_moderation_log where review_id=v)=1;
end $$;
set local role anon;
do $$ begin
 assert (public.get_review_rating_summary('a9000000-0000-4000-8000-000000000001')->>'count')::integer=1,'Hidden excluded';
 perform pg_temp.expect_error($s$select public.get_notification_inbox('player')$s$,'permission denied');
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','a9000000-0000-4000-8000-000000000002',true);
do $$declare ctx jsonb;begin
 ctx:=public.get_review_context('a9400000-0000-4000-8000-000000000001');
 assert ctx->'review'->>'status'='hidden';
 ctx:=public.submit_session_review('a9400000-0000-4000-8000-000000000001',3,'Revised',(ctx->'review'->>'updated_at')::timestamptz);
 assert ctx->'review'->>'status'='published','Editing republishes';
 perform public.remove_session_review((ctx->'review'->>'id')::uuid);
 perform pg_temp.expect_error($s$select public.submit_session_review('a9400000-0000-4000-8000-000000000001',5,'new')$s$,'removed');
 assert (public.get_review_rating_summary('a9000000-0000-4000-8000-000000000001')->>'count')::integer=1;
end $$;
reset role;
do $$begin
 assert (select count(*) from private.app_notifications where recipient_id='a9000000-0000-4000-8000-000000000001')=2,'No host re-alert after edits or republication';
 assert (select snapshot->>'comment' from private.review_reports where reporter_id='a9000000-0000-4000-8000-000000000001')='Edited','Original report evidence preserved';
end $$;
-- Keyset pagination remains stable for equal timestamps.
insert into private.app_notifications(recipient_id,notification_type,registration_id,deduplication_key,read_at)
select 'a9000000-0000-4000-8000-000000000002','review_reminders','a9400000-0000-4000-8000-000000000001','review-pagination-qa:'||n,now() from generate_series(1,33)n;
set local role authenticated;
select set_config('request.jwt.claim.sub','a9000000-0000-4000-8000-000000000002',true);
do $$declare first_page jsonb;second_page jsonb;cursor_row jsonb;begin
 first_page:=public.get_notification_inbox('player');
 assert jsonb_array_length(first_page)=30;
 cursor_row:=first_page->29;
 second_page:=public.get_notification_inbox('player',false,(cursor_row->>'created_at')::timestamptz,(cursor_row->>'id')::uuid);
 assert jsonb_array_length(second_page)=5;
 assert not exists(select 1 from jsonb_array_elements(first_page)a join jsonb_array_elements(second_page)b on a->>'id'=b->>'id'),'No duplicate rows across a tied timestamp cursor';
end$$;
reset role;
-- A worker claim rechecks read/preference/review state immediately before delivery.
set local role service_role;
do $$begin perform public.claim_review_notification_push_jobs(); perform public.claim_review_notification_push_receipts();end$$;
reset role;
do $$begin
 assert not exists(select 1 from private.notification_push_jobs where recipient_id::text like 'a9000000-%' and state in ('pending','sending')),'No stale invitation or opted-out host push is delivered';
end$$;
-- Deletion remains possible after the edit deadline.
insert into public.session_reviews(registration_id,session_id,organizer_id,reviewer_id,rating) values('a9400000-0000-4000-8000-000000000004','a9300000-0000-4000-8000-000000000004','a9000000-0000-4000-8000-000000000001','a9000000-0000-4000-8000-000000000002',5);
set local role authenticated;
select set_config('request.jwt.claim.sub','a9000000-0000-4000-8000-000000000002',true);
do $$declare ctx jsonb;begin
 ctx:=public.get_review_context('a9400000-0000-4000-8000-000000000004');
 assert not (ctx->>'eligible')::boolean;
 perform public.remove_session_review((ctx->'review'->>'id')::uuid);
end$$;
rollback;
