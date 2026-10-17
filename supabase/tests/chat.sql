begin;
insert into auth.users(id) select ('80000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid from generate_series(1,5)n;
insert into public.profiles(id,first_name,onboarding_completed_at) select id,'Chat QA',now() from auth.users where id::text like '80000000%';
insert into public.organizers(profile_id,display_name) values('80000000-0000-4000-8000-000000000001','Organizer'),('80000000-0000-4000-8000-000000000004','Other organizer');
create function pg_temp.reject(q text,expected text) returns void language plpgsql as $$begin execute q;raise exception 'Expected rejection';exception when others then if sqlerrm not like '%'||expected||'%' then raise;end if;end$$;
set local role authenticated;
select set_config('request.jwt.claim.sub','80000000-0000-4000-8000-000000000001',true);
-- No registration exists: starting a chat is deliberately allowed.
select public.start_chat('80000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000002');
do $$declare c uuid; first jsonb; again jsonb; seq bigint;begin
 select id into c from public.chat_conversations;
 assert public.start_chat('80000000-0000-4000-8000-000000000001','80000000-0000-4000-8000-000000000002')->>'id'=c::text;
 first:=public.send_chat_message('81000000-0000-4000-8000-000000000001',c,' Hello player ');
 again:=public.send_chat_message('81000000-0000-4000-8000-000000000001',c,'Hello player');assert first=again;
 assert first->>'sender_id'=auth.uid()::text;
 assert jsonb_typeof(first->'sequence')='string';
 assert jsonb_array_length(public.get_chat_messages(c))=1;
 perform pg_temp.reject(format('select public.send_chat_message(''81000000-0000-4000-8000-000000000001'',%L,''different'')',c),'Message retry does not match');
 perform pg_temp.reject(format('insert into public.chat_messages(id,conversation_id,sender_id,body) values(gen_random_uuid(),%L,auth.uid(),''spoof'')',c),'permission denied');
 perform pg_temp.reject(format('select public.send_chat_message(gen_random_uuid(),%L,''  '')',c),'Invalid message');
 perform pg_temp.reject(format('select public.mark_chat_read(%L,9999999999)',c),'Read position unavailable');
end$$;
-- A sender cannot acknowledge their own outgoing message.
do $$begin
 perform pg_temp.reject('select public.acknowledge_chat_deliveries(array[''81000000-0000-4000-8000-000000000001''::uuid])','Delivery access denied');
 assert (public.get_chat_messages((select id from public.chat_conversations))->0->>'delivered_at') is null;
end$$;
select set_config('request.jwt.claim.sub','80000000-0000-4000-8000-000000000002',true);
do $$declare c uuid; seq bigint; first jsonb;second jsonb;begin
 select id into c from public.chat_conversations;
 perform public.acknowledge_chat_deliveries(array['81000000-0000-4000-8000-000000000001'::uuid]);
 perform public.acknowledge_chat_deliveries(array['81000000-0000-4000-8000-000000000001'::uuid]);
 assert (select count(*) from public.chat_deliveries)=1;
 assert (public.get_chat_messages(c)->0->>'delivered_at') is not null;
 assert private.chat_typing_allowed('chat-typing:'||c::text||':0');
 assert not private.chat_typing_allowed('chat-typing:not-a-conversation');
 perform pg_temp.reject('select public.acknowledge_chat_deliveries(array[]::uuid[])','Delivery access denied');
 perform pg_temp.reject('update public.chat_deliveries set delivered_at=now()','permission denied');
 assert (public.list_chat_conversations()->0->>'unread_count')::int=1;
 select sequence into seq from public.chat_messages limit 1;
 perform public.mark_chat_read(c,seq);
 assert (public.list_chat_conversations()->0->>'unread_count')::int=0;
 -- Players can start a conversation through the API, although UI initiation is organizer-only.
 assert public.start_chat('80000000-0000-4000-8000-000000000001',auth.uid())->>'id'=c::text;
 first:=public.send_chat_message('81000000-0000-4000-8000-000000000002',c,'Hello organizer');
 second:=public.send_chat_message('81000000-0000-4000-8000-000000000003',c,'Another message');
 assert jsonb_array_length(public.get_chat_messages(c,(second->>'sequence')::bigint))=2;
 perform public.mark_chat_read(c,(second->>'sequence')::bigint);
 perform public.mark_chat_read(c,seq);
 assert (select through_sequence from public.chat_reads where profile_id=auth.uid())=(second->>'sequence')::bigint;
end$$;
-- Initial context can be added later but never replaced by another session.
select set_config('request.jwt.claim.sub','80000000-0000-4000-8000-000000000001',true);
do $$declare c uuid; series uuid; first_session uuid; second_session uuid; input jsonb;begin
 select id into c from public.chat_conversations;
 input:=jsonb_build_object('title','Chat context QA','venueId','','venueName','QA club','venueAddress','QA address','date',to_char(current_date+14,'YYYY-MM-DD'),'lastDate',to_char(current_date+21,'YYYY-MM-DD'),'startTime','19:00','endTime','20:30','repeat','weekly','capacity','4','price','0','description','','courtConfirmed',true,'settings',jsonb_build_object('visibility','public','allowed_categories',null,'waitlist_enabled',true,'waitlist_promotion_mode','manual','waitlist_capacity',null,'registration_opens_minutes_before',null,'registration_closes_minutes_before',null,'cancellation_notice_minutes',null));
 series:=public.save_organizer_session('82000000-0000-4000-8000-000000000001',input,true);
 select id into first_session from public.sessions where series_id=series order by starts_at limit 1;
 select id into second_session from public.sessions where series_id=series order by starts_at offset 1 limit 1;
 assert (public.start_chat(auth.uid(),'80000000-0000-4000-8000-000000000002',first_session)->>'source_session_id')=first_session::text;
 assert (public.start_chat(auth.uid(),'80000000-0000-4000-8000-000000000002',second_session)->>'source_session_id')=first_session::text;
 assert public.list_chat_conversations(c)->0->'source_session'='null'::jsonb; -- no shared registration; origin is not display context
 assert private.chat_typing_allowed('chat-typing:'||c::text||':0');
end$$;
select set_config('request.jwt.claim.sub','80000000-0000-4000-8000-000000000002',true);
do $$declare c uuid;begin
 select id into c from public.chat_conversations;
 assert public.list_chat_conversations(c)->0->'source_session'='null'::jsonb; -- no shared registration; origin is not display context
 perform pg_temp.reject(format('select public.start_chat(''80000000-0000-4000-8000-000000000001'',auth.uid(),%L)',(select source_session_id from public.chat_conversations where id=c)),'Session context unavailable');
end$$;
-- Each participant can see only this thread's receipt, never set the peer's cursor.
select set_config('request.jwt.claim.sub','80000000-0000-4000-8000-000000000001',true);
do $$declare c uuid; last_sequence bigint;begin
 select id into c from public.chat_conversations;
 select max(sequence) into last_sequence from public.chat_messages where conversation_id=c;
 perform public.mark_chat_read(c,last_sequence);
 assert (select count(*) from public.chat_reads where conversation_id=c)=2;
 perform pg_temp.reject(format('update public.chat_reads set through_sequence=%s where profile_id=''80000000-0000-4000-8000-000000000002''',last_sequence),'permission denied');
end$$;
select set_config('request.jwt.claim.sub','80000000-0000-4000-8000-000000000002',true);
do $$declare receipt text;begin
 receipt:=public.list_chat_conversations()->0->>'other_read_sequence';
 assert receipt=(select max(sequence)::text from public.chat_messages);
end$$;
select set_config('request.jwt.claim.sub','80000000-0000-4000-8000-000000000003',true);
do $$begin
 assert (select count(*) from public.chat_messages)=0;
 assert (select count(*) from public.chat_conversations)=0;
 assert (select count(*) from public.chat_deliveries)=0;
 assert not private.chat_typing_allowed('chat-typing:'||(select '00000000-0000-4000-8000-000000000001'));
 perform pg_temp.reject('select public.acknowledge_chat_deliveries(array[''81000000-0000-4000-8000-000000000001''::uuid])','Delivery access denied');
 assert (select count(*) from public.chat_reads)=0;
 assert public.list_chat_conversations()='[]'::jsonb;
 perform pg_temp.reject('select public.start_chat(''80000000-0000-4000-8000-000000000001'',''80000000-0000-4000-8000-000000000002'')','Chat access denied');
end$$;
reset role;
do $$declare c uuid;begin
 select id into c from public.chat_conversations where organizer_id='80000000-0000-4000-8000-000000000001';
 perform set_config('request.jwt.claim.sub','80000000-0000-4000-8000-000000000003',true);
 execute 'set local role authenticated';
 assert not private.chat_typing_allowed('chat-typing:'||c::text||':0');
 perform pg_temp.reject(format('select public.get_chat_messages(%L)',c),'Chat access denied');
 perform pg_temp.reject(format('select public.send_chat_message(gen_random_uuid(),%L,''intruder'')',c),'Chat access denied');
 execute 'reset role';
 update public.organizers set status='suspended' where profile_id='80000000-0000-4000-8000-000000000001';
 perform set_config('request.jwt.claim.sub','80000000-0000-4000-8000-000000000002',true);
 execute 'set local role authenticated';
 perform pg_temp.reject(format('select public.send_chat_message(gen_random_uuid(),%L,''suspended'')',c),'Conversation unavailable');
 execute 'reset role';
 update public.organizers set status='active' where profile_id='80000000-0000-4000-8000-000000000001';
end$$;
select set_config('request.jwt.claim.sub','80000000-0000-4000-8000-000000000001',true);
set local role authenticated;
do $$declare c uuid; n int;begin
 select id into c from public.chat_conversations;
 for n in 1..29 loop perform public.send_chat_message(gen_random_uuid(),c,'Rate test');end loop;
 perform pg_temp.reject(format('select public.send_chat_message(gen_random_uuid(),%L,''limited'')',c),'Message rate limit reached');
end$$;
reset role;
set local role anon;
do $$begin perform pg_temp.reject('select public.list_chat_conversations()','permission denied');perform pg_temp.reject('select * from public.chat_messages','permission denied');end$$;
reset role;
-- Exercise the full page boundary, not just a cursor over a short thread.
insert into public.chat_messages(id,conversation_id,sender_id,body)
select gen_random_uuid(),c.id,c.player_id,'Paging fixture '||n from public.chat_conversations c cross join generate_series(1,55)n;
set local role authenticated;
select set_config('request.jwt.claim.sub','80000000-0000-4000-8000-000000000002',true);
do $$declare c uuid; newest jsonb; older jsonb; total int;begin
 select id into c from public.chat_conversations;
 newest:=public.get_chat_messages(c);
 assert jsonb_array_length(newest)=50;
 older:=public.get_chat_messages(c,(newest->0->>'sequence')::bigint);
 select count(*) into total from public.chat_messages where conversation_id=c;
 assert jsonb_array_length(older)=total-50;
 assert (older->-1->>'sequence')::bigint<(newest->0->>'sequence')::bigint;
end$$;
reset role;
rollback;
