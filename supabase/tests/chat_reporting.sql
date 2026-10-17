-- Synthetic accounts and evidence only. All changes roll back.
begin;
insert into auth.users(id) select ('99100000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid from generate_series(1,3)n;
insert into public.profiles(id,first_name,onboarding_completed_at) select id,'Reporting QA',now() from auth.users where id::text like '99100000%';
insert into public.organizers(profile_id,display_name) values('99100000-0000-4000-8000-000000000001','Reporting QA');
set local role authenticated;
select set_config('request.jwt.claim.sub','99100000-0000-4000-8000-000000000001',true);
select public.start_chat(auth.uid(),'99100000-0000-4000-8000-000000000002');
reset role;
create temp table report_qa as select id from public.chat_conversations where organizer_id='99100000-0000-4000-8000-000000000001';
grant select on report_qa to authenticated,service_role,anon;
insert into public.chat_messages(id,conversation_id,sender_id,body)
select ('99100000-0000-4000-8001-'||lpad(n::text,12,'0'))::uuid,(select id from report_qa),'99100000-0000-4000-8000-000000000002','Evidence '||n from generate_series(1,25)n;
update public.chat_messages set deleted_at=now(),body=null where id='99100000-0000-4000-8001-000000000025';
set local role service_role;
select public.submit_chat_report('99100000-0000-4000-8002-000000000001','99100000-0000-4000-8000-000000000001',(select id from report_qa),'harassment',' Some details ',false);
do $$declare r private.chat_user_reports;begin
 select * into r from private.chat_user_reports where id='99100000-0000-4000-8002-000000000001';
 assert r.details='Some details' and r.status='pending' and not r.block_requested;
 assert r.reported_id='99100000-0000-4000-8000-000000000002';
 assert jsonb_array_length(r.messages)=20;
 assert r.messages->0->>'body'='Evidence 6';
 assert r.messages->19->>'body' is null and r.messages->19->>'deleted_at' is not null;
 assert not exists(select 1 from public.user_blocks where blocker_id=r.reporter_id);
end$$;
-- Same request is idempotent and evidence stays frozen after a later edit.
reset role;
update public.chat_messages set body='Later edit' where id='99100000-0000-4000-8001-000000000006';
set local role service_role;
select public.submit_chat_report('99100000-0000-4000-8002-000000000001','99100000-0000-4000-8000-000000000001',(select id from report_qa),'harassment','Some details',false);
do $$begin
 assert(select count(*) from private.chat_user_reports where reporter_id='99100000-0000-4000-8000-000000000001')=1;
 assert(select messages->0->>'body' from private.chat_user_reports where id='99100000-0000-4000-8002-000000000001')='Evidence 6';
 begin perform public.submit_chat_report('99100000-0000-4000-8002-000000000001','99100000-0000-4000-8000-000000000001',(select id from report_qa),'spam','',false);raise exception 'Expected conflict';exception when invalid_parameter_value then null;end;
 begin perform public.submit_chat_report(gen_random_uuid(),'99100000-0000-4000-8000-000000000003',(select id from report_qa),'spam','',false);raise exception 'Expected access denial';exception when insufficient_privilege then null;end;
 begin perform public.submit_chat_report(gen_random_uuid(),'99100000-0000-4000-8000-000000000001',(select id from report_qa),'unsupported','',false);raise exception 'Expected validation';exception when invalid_parameter_value then null;end;
 begin perform public.submit_chat_report(gen_random_uuid(),'99100000-0000-4000-8000-000000000001',(select id from report_qa),'spam',repeat('x',2001),false);raise exception 'Expected length limit';exception when invalid_parameter_value then null;end;
end$$;
-- Clear this caller's history, then report-and-block: no cleared text is copied.
set local role authenticated;
select set_config('request.jwt.claim.sub','99100000-0000-4000-8000-000000000001',true);
select public.update_chat_preferences((select id from report_qa),'delete');
set local role service_role;
select public.submit_chat_report('99100000-0000-4000-8002-000000000002','99100000-0000-4000-8000-000000000001',(select id from report_qa),'other','',true);
do $$begin
 assert(select jsonb_array_length(messages) from private.chat_user_reports where id='99100000-0000-4000-8002-000000000002')=0;
 assert exists(select 1 from public.user_blocks where blocker_id='99100000-0000-4000-8000-000000000001' and blocked_id='99100000-0000-4000-8000-000000000002');
 assert(select access_version from public.chat_conversations where id=(select id from report_qa))=1;
 -- Both directions may report despite blocking; the block is never implicitly removed.
 perform public.submit_chat_report('99100000-0000-4000-8002-000000000003','99100000-0000-4000-8000-000000000002',(select id from report_qa),'spam','',false);
 assert(select count(*) from public.user_blocks where blocker_id='99100000-0000-4000-8000-000000000001')=1;
 -- 10 reports / rolling 24h, serialized by reporter; no extra block on rejected reports.
 for n in 3..10 loop perform public.submit_chat_report(gen_random_uuid(),'99100000-0000-4000-8000-000000000001',(select id from report_qa),'spam','',false);end loop;
 begin
  perform public.submit_chat_report(gen_random_uuid(),'99100000-0000-4000-8000-000000000001',(select id from report_qa),'spam','',true);
  raise exception 'Expected rate limit';
 exception when raise_exception then if sqlerrm<>'Report limit reached' then raise;end if;end;
end$$;
set local role authenticated;
select set_config('request.jwt.claim.sub','99100000-0000-4000-8000-000000000002',true);
do $$begin
 begin perform public.submit_chat_report(gen_random_uuid(),auth.uid(),(select id from report_qa),'spam','',false);raise exception 'Expected direct RPC denial';exception when insufficient_privilege then null;end;
 begin perform private.submit_chat_report(gen_random_uuid(),auth.uid(),(select id from report_qa),'spam','',false);raise exception 'Expected private bypass denial';exception when insufficient_privilege then null;end;
 begin perform 1 from private.chat_user_reports;raise exception 'Expected private evidence denial';exception when insufficient_privilege then null;end;
end$$;
set local role anon;
do $$begin begin perform public.submit_chat_report(gen_random_uuid(),'99100000-0000-4000-8000-000000000001',(select id from report_qa),'spam','',false);raise exception 'Expected anon denial';exception when insufficient_privilege then null;end;end$$;
rollback;
