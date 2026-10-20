-- Isolated transaction: all Auth/product fixtures and queued device jobs roll back.
begin;
create function pg_temp.expect_error(statement text, pattern text) returns void language plpgsql as $$begin execute statement;raise exception 'Expected rejection did not happen';exception when others then if sqlerrm not like '%'||pattern||'%' then raise;end if;end$$;
insert into auth.users(id) select ('ac000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid from generate_series(1,7)n;
insert into public.profiles(id,first_name,onboarding_completed_at) select id,'Cancellation QA',now() from auth.users where id::text like 'ac000000-%';
insert into public.organizers(profile_id,display_name) values('ac000000-0000-4000-8000-000000000001','Rollback host'),('ac000000-0000-4000-8000-000000000007','Other host');
insert into public.venues(id,created_by,name,address) values('ac100000-0000-4000-8000-000000000001','ac000000-0000-4000-8000-000000000001','Cancellation rollback venue','No real address');
insert into public.session_series(id,organizer_id,draft_input) values('ac200000-0000-4000-8000-000000000001','ac000000-0000-4000-8000-000000000001','{}');
insert into public.sessions(id,organizer_id,series_id,occurrence_date,venue_id,title,capacity,price_minor,starts_at,ends_at,status,waitlist_enabled,waitlist_promotion_mode)
select ('ac300000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'ac000000-0000-4000-8000-000000000001','ac200000-0000-4000-8000-000000000001',current_date+n,'ac100000-0000-4000-8000-000000000001','Cancellation QA '||n,8,0,now()+interval '1 day'*n,now()+interval '1 day'*n+interval '1 hour','published',true,'manual' from generate_series(1,5)n;
insert into public.registrations(id,session_id,player_id,status,confirmed_at)
select ('ac400000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,('ac300000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'ac000000-0000-4000-8000-000000000002','confirmed',now() from generate_series(1,3)n;
insert into public.registrations(id,session_id,player_id,status,confirmed_at) values
('ac400000-0000-4000-8000-000000000004','ac300000-0000-4000-8000-000000000001','ac000000-0000-4000-8000-000000000001','confirmed',now()),
('ac400000-0000-4000-8000-000000000006','ac300000-0000-4000-8000-000000000001','ac000000-0000-4000-8000-000000000005','confirmed',now());
insert into public.registrations(id,session_id,player_id,status,waitlist_sequence) values('ac400000-0000-4000-8000-000000000005','ac300000-0000-4000-8000-000000000001','ac000000-0000-4000-8000-000000000003','waitlisted',1);
insert into public.registrations(id,session_id,player_id,status,cancelled_at,cancelled_by) values('ac400000-0000-4000-8000-000000000007','ac300000-0000-4000-8000-000000000001','ac000000-0000-4000-8000-000000000004','cancelled',now(),'ac000000-0000-4000-8000-000000000004');
insert into private.notification_preferences(profile_id,notification_type,push_enabled) values('ac000000-0000-4000-8000-000000000005','session_cancellations',false);
insert into private.chat_push_devices(installation_id,profile_id,expo_token,platform) select ('ac500000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,('ac000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'ExpoPushToken[cancellation-qa-invalid-'||n||']','android' from generate_series(2,5)n;
set local role authenticated;
select set_config('request.jwt.claim.sub','ac000000-0000-4000-8000-000000000002',true);
do $$begin
 assert exists(select 1 from jsonb_array_elements(public.get_notification_settings('player'))r where r->>'key'='session_cancellations' and (r->>'push_enabled')::boolean),'Default on';
 assert (public.get_push_subscription_state()->>'session_cancellations')::boolean;
 perform pg_temp.expect_error($s$select public.get_session_cancellation_context('ac300000-0000-4000-8000-000000000001')$s$,'Session unavailable');
 perform pg_temp.expect_error($s$select public.cancel_session_occurrences('ac300000-0000-4000-8000-000000000001','one','weather','rain',now(),'ac600000-0000-4000-8000-000000000001',3)$s$,'Organizer access required');
 perform pg_temp.expect_error($s$select * from private.session_cancellations$s$,'permission denied');
end$$;
select set_config('request.jwt.claim.sub','ac000000-0000-4000-8000-000000000007',true);
select pg_temp.expect_error($s$select public.cancel_session_occurrences('ac300000-0000-4000-8000-000000000001','one','weather','rain',now(),'ac600000-0000-4000-8000-000000000001',3)$s$,'Session unavailable');
select set_config('request.jwt.claim.sub','ac000000-0000-4000-8000-000000000001',true);
do $$declare version timestamptz;ctx jsonb;event_id uuid;begin
 assert not exists(select 1 from jsonb_array_elements(public.get_notification_settings('organizer'))r where r->>'key'='session_cancellations'),'Player-only setting';
 ctx:=public.get_session_cancellation_context('ac300000-0000-4000-8000-000000000001');
 assert (ctx->>'confirmed_count')::int=2 and (ctx->>'waitlisted_count')::int=1,'Host excluded; both active statuses counted';
 version:=(ctx->>'updated_at')::timestamptz;
 perform pg_temp.expect_error(format($s$select public.cancel_session_occurrences('ac300000-0000-4000-8000-000000000001','one','invented','rain',%L,'ac600000-0000-4000-8000-000000000001',3)$s$,version),'Choose a cancellation reason');
 perform pg_temp.expect_error(format($s$select public.cancel_session_occurrences('ac300000-0000-4000-8000-000000000001','one','weather',repeat('a',1001),%L,'ac600000-0000-4000-8000-000000000001',3)$s$,version),'1,000');
 perform pg_temp.expect_error(format($s$select public.cancel_session_occurrences('ac300000-0000-4000-8000-000000000001','one','weather','rain',%L,'ac600000-0000-4000-8000-000000000001',4)$s$,version),'recipient count changed');
 perform pg_temp.expect_error($s$select public.cancel_session_occurrences('ac300000-0000-4000-8000-000000000001','one','weather','rain',now()-interval '2 days','ac600000-0000-4000-8000-000000000001',3)$s$,'Session changed');
 ctx:=public.cancel_session_occurrences('ac300000-0000-4000-8000-000000000001','one','weather','  Outdoor courts flooded.  ',version,'ac600000-0000-4000-8000-000000000001',3);
 assert (ctx->>'cancelled_count')::int=1;
 assert ctx->>'reason_code'='weather' and ctx->>'message'='Outdoor courts flooded.';
 event_id:=(ctx->>'cancellation_id')::uuid;
 assert public.cancel_session_occurrences('ac300000-0000-4000-8000-000000000001','one','weather','Outdoor courts flooded.',version,'ac600000-0000-4000-8000-000000000001',3)->>'cancellation_id'=event_id::text,'Retry deduplicated after state change';
 perform pg_temp.expect_error(format($s$select public.cancel_session_occurrences('ac300000-0000-4000-8000-000000000001','one','other','Changed',%L,'ac600000-0000-4000-8000-000000000001',3)$s$,version),'request already used');
end$$;
reset role;
do $$begin
 assert (select status from public.sessions where id='ac300000-0000-4000-8000-000000000002')='published','Next occurrence unchanged';
 assert (select count(*) from public.registrations where session_id='ac300000-0000-4000-8000-000000000001' and status='cancelled')=5,'All existing registrations retained';
 assert (select count(*) from private.app_notifications where recipient_id::text like 'ac000000-%')=3,'Exactly confirmed and waitlisted recipients';
 assert (select count(*) from private.app_notifications where recipient_id='ac000000-0000-4000-8000-000000000003' and recipient_status='waitlisted')=1;
 assert not exists(select 1 from private.app_notifications where recipient_id in ('ac000000-0000-4000-8000-000000000001','ac000000-0000-4000-8000-000000000004')),'Host and previously cancelled excluded';
 assert (select count(*) from private.notification_push_jobs where recipient_id::text like 'ac000000-%')=2,'Opt-out preserves inbox without push';
 assert not exists(select 1 from private.app_notifications where recipient_id::text like 'ac000000-%' and notification_type='review_reminders');
end$$;
select set_config('test.cancellation_id',(select id::text from private.session_cancellations where session_id='ac300000-0000-4000-8000-000000000001'),true);
set local role authenticated;
select set_config('request.jwt.claim.sub','ac000000-0000-4000-8000-000000000003',true);
do $$declare n jsonb;ctx jsonb;begin
 n:=public.get_notification_inbox('player',false,null,null)->0;
 assert n->>'notification_type'='session_cancellations' and n->>'recipient_status'='waitlisted';
 ctx:=public.get_session_cancellation((n->>'cancellation_id')::uuid);
 assert ctx->>'recipient_status'='waitlisted' and ctx->>'message'='Outdoor courts flooded.';
 assert n->>'session_starts_at' is not null and n->>'session_timezone' is not null;
 perform public.start_chat('ac000000-0000-4000-8000-000000000001','ac000000-0000-4000-8000-000000000003',null); -- Chat can open after waitlist cancellation.
 assert public.get_notification_target((n->>'id')::uuid)->>'cancellation_id'=n->>'cancellation_id';
 perform public.mark_notifications_read('player',(n->>'id')::uuid);
 assert public.get_unread_notification_count('player')=0;
end$$;
select set_config('request.jwt.claim.sub','ac000000-0000-4000-8000-000000000004',true);
select pg_temp.expect_error($s$select public.get_session_cancellation((select (public.get_session_cancellation_context('ac300000-0000-4000-8000-000000000001')->>'cancellation_id')::uuid))$s$,'Session unavailable');
select pg_temp.expect_error($s$select public.get_session_cancellation(current_setting('test.cancellation_id')::uuid)$s$,'Cancellation unavailable');
reset role;
-- Service worker can send despite cancelled session/registration, but skips read and opt-out.
set local role service_role;
do $$declare jobs jsonb;begin
 jobs:=public.claim_review_notification_push_jobs();
 assert exists(select 1 from jsonb_array_elements(jobs)j where j->>'recipient_id'='ac000000-0000-4000-8000-000000000002' and j->>'kind'='session_cancellations' and j->>'title'='Session cancelled');
 assert not exists(select 1 from jsonb_array_elements(jobs)j where j->>'recipient_id' in ('ac000000-0000-4000-8000-000000000003','ac000000-0000-4000-8000-000000000005'));
end$$;
reset role;
-- Empty occurrences and the legacy RPC remain safe and produce no invented recipients.
set local role authenticated;
select set_config('request.jwt.claim.sub','ac000000-0000-4000-8000-000000000001',true);
do $$declare ctx jsonb;begin
 ctx:=public.get_session_cancellation_context('ac300000-0000-4000-8000-000000000004');
 assert (ctx->>'confirmed_count')::int+(ctx->>'waitlisted_count')::int=0;
 assert public.cancel_organizer_session('ac300000-0000-4000-8000-000000000004','one','No players',(ctx->>'updated_at')::timestamptz)=1;
end$$;
reset role;
-- Backend-only future scope: one notification per date, a single grouped push per device.
set local role authenticated;
select set_config('request.jwt.claim.sub','ac000000-0000-4000-8000-000000000001',true);
do $$declare ctx jsonb;begin
 ctx:=public.get_session_cancellation_context('ac300000-0000-4000-8000-000000000002');
 perform public.cancel_session_occurrences('ac300000-0000-4000-8000-000000000002','future','venue_issue','',(ctx->>'updated_at')::timestamptz,'ac600000-0000-4000-8000-000000000002',1);
end$$;
reset role;
do $$begin
 assert (select count(*) from private.app_notifications where recipient_id='ac000000-0000-4000-8000-000000000002')=3,'Per-occurrence inbox history';
 assert (select count(*) from private.notification_push_jobs where recipient_id='ac000000-0000-4000-8000-000000000002')=2,'One single-occurrence job plus one batch job';
end$$;
set local role service_role;
do $$declare jobs jsonb;begin
 jobs:=public.claim_review_notification_push_jobs();
 assert exists(select 1 from jsonb_array_elements(jobs)j where j->>'recipient_id'='ac000000-0000-4000-8000-000000000002' and j->>'title'='2 sessions cancelled'),'Batch summary counts only dates affecting this player';
end$$;
reset role;
-- No historical QA writes or external sends survive this transaction.
rollback;
