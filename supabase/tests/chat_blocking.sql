-- Rolled-back accounts only; no persistent blocks, messages or notifications.
begin;
insert into auth.users(id) select ('99000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid from generate_series(1,3)n;
insert into public.profiles(id,first_name,onboarding_completed_at) select id,'Blocking QA',now() from auth.users where id::text like '99000000%';
insert into public.organizers(profile_id,display_name) values('99000000-0000-4000-8000-000000000001','Blocking QA');
insert into private.chat_push_devices(installation_id,profile_id,expo_token,platform) values('99000000-0000-4000-8003-000000000001','99000000-0000-4000-8000-000000000002','ExpoPushToken[blocking_qa]','ios');
set local role authenticated;
select set_config('request.jwt.claim.sub','99000000-0000-4000-8000-000000000001',true);
select public.start_chat(auth.uid(),'99000000-0000-4000-8000-000000000002');
reset role;
create temporary table block_qa as select id from public.chat_conversations where organizer_id='99000000-0000-4000-8000-000000000001';
grant select on block_qa to authenticated;
set local role authenticated;
select public.send_chat_message('99000000-0000-4000-8001-000000000001',(select id from block_qa),'Before block');
select set_config('request.jwt.claim.sub','99000000-0000-4000-8000-000000000002',true);
select public.send_chat_message('99000000-0000-4000-8001-000000000002',(select id from block_qa),'Reply before block');
select set_config('request.jwt.claim.sub','99000000-0000-4000-8000-000000000001',true);
select public.set_chat_block((select id from block_qa),true);
do $$declare s jsonb;begin
 s:=public.list_chat_conversations((select id from block_qa))->0;
 assert (s->>'blocked_by_me')::boolean and not (s->>'messaging_available')::boolean;
 assert (select count(*) from public.user_blocks)=1;
 assert not private.chat_online_visible('chat-online:99000000-0000-4000-8000-000000000002:0');
 assert public.get_chat_online_topic(auth.uid()) like '%:1';
 assert not private.chat_typing_allowed('chat-typing:'||(select id::text from block_qa)||':0');
 begin perform public.send_chat_message('99000000-0000-4000-8001-000000000003',(select id from block_qa),'Blocked send');raise exception 'Expected denial';exception when insufficient_privilege then null;end;
 begin perform public.set_chat_reaction('99000000-0000-4000-8001-000000000002','🎾');raise exception 'Expected denial';exception when insufficient_privilege then null;end;
 begin perform public.edit_chat_message('99000000-0000-4000-8001-000000000001','Blocked edit',1);raise exception 'Expected denial';exception when insufficient_privilege then null;end;
 begin perform private.send_chat_message_before_blocking('99000000-0000-4000-8001-000000000003',(select id from block_qa),'Bypass',null);raise exception 'Expected denial';exception when insufficient_privilege then null;end;
 assert jsonb_array_length(public.get_chat_messages((select id from block_qa)))=2;
end$$;
select public.set_chat_block((select id from block_qa),true); -- idempotent
select public.update_chat_preferences((select id from block_qa),'delete');
do $$begin assert jsonb_array_length(public.list_chat_inbox_filtered()->'conversations')=1;assert jsonb_array_length(public.get_chat_messages((select id from block_qa)))=0;end$$;
reset role;
do $$begin assert(select access_version from public.chat_conversations where id=(select id from block_qa))=1;assert(select state from private.chat_push_jobs where message_id='99000000-0000-4000-8001-000000000001')='skipped';end$$;
set local role authenticated;
select set_config('request.jwt.claim.sub','99000000-0000-4000-8000-000000000002',true);
do $$declare s jsonb;begin
 s:=public.list_chat_conversations((select id from block_qa))->0;
 assert not(s->>'blocked_by_me')::boolean and not(s->>'messaging_available')::boolean;
 assert(select count(*) from public.user_blocks)=0; -- other person's block stays private
 begin perform public.send_chat_message('99000000-0000-4000-8001-000000000004',(select id from block_qa),'Recipient send');raise exception 'Expected denial';exception when insufficient_privilege then null;end;
 begin perform public.start_chat('99000000-0000-4000-8000-000000000001',auth.uid());raise exception 'Expected denial';exception when insufficient_privilege then null;end;
 begin perform public.get_chat_online_topic('99000000-0000-4000-8000-000000000001');raise exception 'Expected denial';exception when insufficient_privilege then null;end;
 begin perform public.get_chat_typing_topic((select id from block_qa));raise exception 'Expected denial';exception when insufficient_privilege then null;end;
 perform public.acknowledge_chat_deliveries(array['99000000-0000-4000-8001-000000000001'::uuid]);
 perform public.mark_chat_read((select id from block_qa),(select sequence from public.chat_messages where id='99000000-0000-4000-8001-000000000001'));
end$$;
select public.set_chat_block((select id from block_qa),false); -- cannot clear the other person's block
do $$begin assert not private.chat_can_message((select id from block_qa));end$$;
select public.set_chat_block((select id from block_qa),true);
select set_config('request.jwt.claim.sub','99000000-0000-4000-8000-000000000001',true);
select public.set_chat_block((select id from block_qa),false);
do $$begin assert not private.chat_can_message((select id from block_qa));end$$;
select set_config('request.jwt.claim.sub','99000000-0000-4000-8000-000000000002',true);
select public.set_chat_block((select id from block_qa),false);
do $$begin assert private.chat_can_message((select id from block_qa));assert public.get_chat_typing_topic((select id from block_qa)) like '%:4';end$$;
select public.send_chat_message('99000000-0000-4000-8001-000000000005',(select id from block_qa),'After unblock');
select set_config('request.jwt.claim.sub','99000000-0000-4000-8000-000000000003',true);
do $$begin
 begin perform public.set_chat_block((select id from block_qa),true);raise exception 'Expected denial';exception when insufficient_privilege then null;end;
 begin insert into public.user_blocks values(auth.uid(),'99000000-0000-4000-8000-000000000001',now());raise exception 'Expected denial';exception when insufficient_privilege then null;end;
end$$;
reset role;
do $$begin assert not exists(select 1 from public.chat_deliveries where message_id='99000000-0000-4000-8001-000000000001');assert not exists(select 1 from public.chat_reads where conversation_id=(select id from block_qa) and profile_id='99000000-0000-4000-8000-000000000002');end$$;
set local role anon;
do $$begin begin perform public.set_chat_block('99000000-0000-4000-8000-000000000001',true);raise exception 'Expected denial';exception when insufficient_privilege then null;end;end$$;
rollback;
