-- Isolated fixtures: verify reading the caller's saved position under native RLS.
begin;
insert into auth.users(id) select ('97100000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid from generate_series(1,3)n;
insert into public.profiles(id,first_name,onboarding_completed_at) select id,'Unread QA',now() from auth.users where id::text like '97100000%';
insert into public.organizers(profile_id,display_name) values('97100000-0000-4000-8000-000000000001','Unread QA');
set local role authenticated;
select set_config('request.jwt.claim.sub','97100000-0000-4000-8000-000000000001',true);
select public.start_chat(auth.uid(),'97100000-0000-4000-8000-000000000002');
do $$declare c uuid;begin
 select id into c from public.chat_conversations where organizer_id=auth.uid();
 perform public.send_chat_message('97200000-0000-4000-8000-000000000001',c,'Previously read');
end$$;
select set_config('request.jwt.claim.sub','97100000-0000-4000-8000-000000000002',true);
do $$declare c uuid; through bigint;begin
 select id into c from public.chat_conversations where player_id=auth.uid();
 assert not exists(select 1 from public.chat_reads where conversation_id=c and profile_id=auth.uid());
 select max(sequence) into through from public.chat_messages where conversation_id=c;
 perform public.mark_chat_read(c,through);
end$$;
select set_config('request.jwt.claim.sub','97100000-0000-4000-8000-000000000001',true);
do $$declare c uuid;begin
 select id into c from public.chat_conversations where organizer_id=auth.uid();
 perform public.send_chat_message('97200000-0000-4000-8000-000000000002',c,'Unread incoming');
end$$;
select set_config('request.jwt.claim.sub','97100000-0000-4000-8000-000000000002',true);
do $$declare c uuid; cursor_text text; latest bigint;begin
 select id into c from public.chat_conversations where player_id=auth.uid();
 select through_sequence::text into cursor_text from public.chat_reads where conversation_id=c and profile_id=auth.uid();
 select max(sequence) into latest from public.chat_messages where conversation_id=c;
 assert cursor_text is not null and cursor_text::bigint < latest;
 assert public.list_chat_conversations(c)->0->>'unread_count'='1';
 perform public.update_chat_preferences(c,'mark_unread');
 assert (select through_sequence::text from public.chat_reads where conversation_id=c and profile_id=auth.uid())=cursor_text;
 perform public.mark_chat_read(c,latest);
 assert (select through_sequence::text from public.chat_reads where conversation_id=c and profile_id=auth.uid())=latest::text;
 assert public.list_chat_conversations(c)->0->>'unread_count'='0';
end$$;
select set_config('request.jwt.claim.sub','97100000-0000-4000-8000-000000000003',true);
do $$begin
 assert not exists(select 1 from public.chat_reads where profile_id='97100000-0000-4000-8000-000000000002');
end$$;
rollback;
