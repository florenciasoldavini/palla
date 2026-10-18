-- Isolated database or hosted transaction: all fixtures roll back. No real push requests.
begin;
-- Rollback-only fixture: assertions are scoped to synthetic recipients; no provider requests.
insert into auth.users(id) select ('a1000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid from generate_series(1,3)n;
insert into public.profiles(id,first_name,onboarding_completed_at) select id,'Push QA',now() from auth.users where id::text like 'a1000000%';
update public.profiles set first_name='Carlos',last_name='M.' where id='a1000000-0000-4000-8000-000000000001';
insert into public.organizers(profile_id,display_name) values('a1000000-0000-4000-8000-000000000001','Push QA');
insert into public.chat_conversations(id,organizer_id,player_id) values('a2000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000002');
create function pg_temp.reject(q text) returns void language plpgsql as $$begin execute q;raise exception 'Expected rejection';exception when insufficient_privilege or invalid_parameter_value then null;end$$;
set local role authenticated;
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000002',true);
select public.register_chat_push_device('a3000000-0000-4000-8000-000000000001','ExpoPushToken[qa_only_fake_token]','android','a1000000-0000-4000-8000-000000000002');
select pg_temp.reject('select public.claim_chat_push_jobs()');
select pg_temp.reject('select public.authorize_chat_push_worker(''anything'')');
select pg_temp.reject('select * from private.chat_push_devices');
select pg_temp.reject('select public.register_chat_push_device(''a3000000-0000-4000-8000-000000000002'',''bad'',''android'',''a1000000-0000-4000-8000-000000000002'')');
select pg_temp.reject('select public.register_chat_push_device(''a3000000-0000-4000-8000-000000000002'',''ExpoPushToken[fake]'',''android'',''a1000000-0000-4000-8000-000000000001'')');

reset role;
insert into public.chat_messages(id,conversation_id,sender_id,body) values('a4000000-0000-4000-8000-000000000001','a2000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','Pending before opt out');
do $$begin assert (select count(*)=1 from private.chat_push_jobs where recipient_id='a1000000-0000-4000-8000-000000000002');end$$;
set local role authenticated;
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000002',true);
do $$begin
 assert public.get_chat_notification_preference();
 assert not public.set_chat_notification_preference(false);
 assert not public.get_chat_notification_preference();
end$$;
select pg_temp.reject('select public.set_chat_notification_preference(null)');
select pg_temp.reject('select * from private.notification_preferences');
select pg_temp.reject('update private.notification_preferences set chat_messages=true');
-- A token refresh cannot reset the account preference.
select public.register_chat_push_device('a3000000-0000-4000-8000-000000000002','ExpoPushToken[qa_only_second_device]','ios','a1000000-0000-4000-8000-000000000002');
do $$begin assert not public.get_chat_notification_preference();end$$;
reset role;
do $$begin assert (select state='skipped' from private.chat_push_jobs where message_id='a4000000-0000-4000-8000-000000000001');end$$;
insert into public.chat_messages(id,conversation_id,sender_id,body) values('a4000000-0000-4000-8000-000000000002','a2000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','While off on both devices');
do $$begin assert not exists(select 1 from private.chat_push_jobs where message_id='a4000000-0000-4000-8000-000000000002');end$$;
-- Simulate an older pending job to verify the worker independently checks preference.
insert into private.chat_push_jobs(message_id,installation_id,recipient_id,expo_token) values('a4000000-0000-4000-8000-000000000002','a3000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000002','ExpoPushToken[qa_only_fake_token]');
set local role service_role;
do $$begin assert not exists(select 1 from jsonb_array_elements(public.claim_chat_push_jobs()) j where j->>'recipient_id'='a1000000-0000-4000-8000-000000000002');end$$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000001',true);
do $$begin assert public.get_chat_notification_preference();end$$;
select set_config('request.jwt.claim.sub','a1000000-0000-4000-8000-000000000002',true);
do $$begin assert not public.get_chat_notification_preference();assert public.set_chat_notification_preference(true);end$$;
reset role;
insert into public.chat_messages(id,conversation_id,sender_id,body) values('a4000000-0000-4000-8000-000000000003','a2000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','Future notifications resume');
update private.chat_push_jobs set created_at=now()-interval '23 hours' where recipient_id='a1000000-0000-4000-8000-000000000002';
set local role service_role;
do $$begin assert (select count(*)=2 from jsonb_array_elements(public.claim_chat_push_jobs()) j where j->>'recipient_id'='a1000000-0000-4000-8000-000000000002');end$$;
reset role;
set local role anon;
select pg_temp.reject('select public.get_chat_notification_preference()');
select pg_temp.reject('select public.set_chat_notification_preference(false)');
reset role;
select 'Notification preferences: default, ownership, null/anonymous rejection, both devices, queue suppression, worker gate, re-enable passed' as result;
rollback;
