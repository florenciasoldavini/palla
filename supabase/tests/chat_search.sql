-- Rollback-only fixtures: no persistent accounts, messages, jobs or preferences.
begin;
insert into auth.users(id) select ('95000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid from generate_series(1,3)n;
insert into public.profiles(id,first_name,onboarding_completed_at) select id,'Search QA',now() from auth.users where id::text like '95000000%';
insert into public.organizers(profile_id,display_name) values('95000000-0000-4000-8000-000000000001','Search QA');
insert into public.chat_conversations(id,organizer_id,player_id) values('95000000-0000-4000-8000-000000000004','95000000-0000-4000-8000-000000000001','95000000-0000-4000-8000-000000000002');
insert into public.chat_messages(id,conversation_id,sender_id,body)
 select ('95000000-0000-4000-8001-'||lpad(n::text,12,'0'))::uuid,'95000000-0000-4000-8000-000000000004','95000000-0000-4000-8000-000000000001',
 case when n in (5,61,119) then 'Court booking '||n when n=15 then '100%_ ready [2] café 🎾' else 'Session update '||n end from generate_series(1,120)n;
create function pg_temp.reject(q text,expected text) returns void language plpgsql as $$begin execute q;raise exception 'Expected rejection';exception when others then if sqlerrm not like '%'||expected||'%' then raise;end if;end$$;
set local role authenticated;
select set_config('request.jwt.claim.sub','95000000-0000-4000-8000-000000000001',true);
do $$declare p jsonb; cid uuid:='95000000-0000-4000-8000-000000000004';begin
 p:=public.search_chat_messages(cid,'  cOuRt  ',0);
 assert (p->>'total')::int=3 and p->>'selected_id'='95000000-0000-4000-8001-000000000119';
 assert jsonb_array_length(p->'messages')<=25;
 p:=public.search_chat_messages(cid,'court',2);
 assert p->>'selected_id'='95000000-0000-4000-8001-000000000005';
 assert p->>'index'='2'; -- outside initial 50-message page
 assert public.search_chat_messages(cid,'court',99)->>'index'='2';
 assert public.search_chat_messages(cid,'%_',0)->>'total'='1';
 assert public.search_chat_messages(cid,'[2]',0)->>'total'='1';
 assert public.search_chat_messages(cid,'CAFÉ',0)->>'total'='1';
 assert public.search_chat_messages(cid,'🎾',0)->>'total'='1';
 assert public.search_chat_messages(cid,'absent',0)->'messages'='[]'::jsonb;
 assert public.search_chat_messages(cid,'absent',0)->>'selected_id' is null;
 perform pg_temp.reject(format('select public.search_chat_messages(%L,'''',0)',cid),'Invalid search');
 perform pg_temp.reject(format('select public.search_chat_messages(%L,''court'',-1)',cid),'Invalid search');
 perform pg_temp.reject(format('select public.search_chat_messages(%L,%L,0)',cid,repeat('x',201)),'Invalid search');
 perform public.edit_chat_message('95000000-0000-4000-8001-000000000061','Changed wording',1);
 assert public.search_chat_messages(cid,'court',0)->>'total'='2';
 perform public.delete_chat_message('95000000-0000-4000-8001-000000000119',1);
 assert public.search_chat_messages(cid,'court',0)->>'total'='1';
 assert not exists(select 1 from public.chat_reads where conversation_id=cid); -- search doesn't mark historical context read
 perform public.update_chat_preferences(cid,'delete');
 assert public.search_chat_messages(cid,'court',0)->>'total'='0';
end$$;
select set_config('request.jwt.claim.sub','95000000-0000-4000-8000-000000000002',true);
do $$begin
 assert public.search_chat_messages('95000000-0000-4000-8000-000000000004','court',0)->>'total'='1';
end$$;
select set_config('request.jwt.claim.sub','95000000-0000-4000-8000-000000000003',true);
do $$begin
 perform pg_temp.reject('select public.search_chat_messages(''95000000-0000-4000-8000-000000000004'',''court'',0)','Chat access denied');
end$$;
set local role anon;
do $$begin
 perform pg_temp.reject('select public.search_chat_messages(''95000000-0000-4000-8000-000000000004'',''court'',0)','permission denied');
end$$;
rollback;
