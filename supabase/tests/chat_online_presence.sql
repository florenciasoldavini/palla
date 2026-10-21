-- Rollback-only authorization checks using the actual policy expressions.
begin;
insert into auth.users(id) select ('87000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid from generate_series(1,3)n;
insert into public.profiles(id,first_name,onboarding_completed_at)
 select id,'Presence QA',now() from auth.users where id::text like '87000000%';
insert into public.organizers(profile_id,display_name) values('87000000-0000-4000-8000-000000000001','Presence QA');
set local role authenticated;
select set_config('request.jwt.claim.sub','87000000-0000-4000-8000-000000000001',true);
select public.start_chat(auth.uid(),'87000000-0000-4000-8000-000000000002');
do $$declare receive_policy text; publish_policy text; allowed boolean;begin
 select qual into receive_policy from pg_policies where schemaname='realtime' and tablename='messages' and policyname='chat_online_receive';
 select with_check into publish_policy from pg_policies where schemaname='realtime' and tablename='messages' and policyname='chat_online_publish';
 assert receive_policy is not null and publish_policy is not null;
 perform set_config('realtime.topic',public.get_chat_online_topic(auth.uid()),true);
 execute 'select '||receive_policy||' from (values(''presence'')) as payload(extension)' into allowed; assert allowed;
 execute 'select '||publish_policy||' from (values(''presence'')) as payload(extension)' into allowed; assert allowed;
 perform set_config('realtime.topic','chat-online:87000000-0000-4000-8000-000000000002:0',true);
 execute 'select '||receive_policy||' from (values(''presence'')) as payload(extension)' into allowed; assert allowed;
 execute 'select '||publish_policy||' from (values(''presence'')) as payload(extension)' into allowed; assert not allowed;
 execute 'select '||receive_policy||' from (values(''broadcast'')) as payload(extension)' into allowed; assert not allowed;
 perform set_config('realtime.topic','chat-online:87000000-0000-4000-8000-000000000003:0',true);
 execute 'select '||receive_policy||' from (values(''presence'')) as payload(extension)' into allowed; assert not allowed;
 assert not private.chat_online_visible('malformed');
end$$;
select set_config('request.jwt.claim.sub','87000000-0000-4000-8000-000000000003',true);
do $$begin assert not private.chat_online_visible('chat-online:87000000-0000-4000-8000-000000000001:0');end$$;
reset role;
do $$begin assert not has_function_privilege('anon','private.chat_online_visible(text)','EXECUTE');end$$;
rollback;
