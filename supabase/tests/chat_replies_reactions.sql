-- Rollback-only checks; use an isolated database, never a production seed.
begin;
insert into auth.users(id) select ('85000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid from generate_series(1,4)n;
insert into public.profiles(id,first_name,onboarding_completed_at) select id,'Replies QA',now() from auth.users where id::text like '85000000%';
insert into public.organizers(profile_id,display_name) values('85000000-0000-4000-8000-000000000001','QA');
create function pg_temp.reject(q text,expected text) returns void language plpgsql as $$begin execute q;raise exception 'Expected rejection';exception when others then if sqlerrm not like '%'||expected||'%' then raise;end if;end$$;
set local role authenticated;
select set_config('request.jwt.claim.sub','85000000-0000-4000-8000-000000000001',true);
do $$declare c uuid; d uuid; m jsonb;begin
 c:=(public.start_chat(auth.uid(),'85000000-0000-4000-8000-000000000002')->>'id')::uuid;
 d:=(public.start_chat(auth.uid(),'85000000-0000-4000-8000-000000000003')->>'id')::uuid;
 perform public.send_chat_message('86000000-0000-4000-8000-000000000001',c,'Original');
 m:=public.send_chat_message('86000000-0000-4000-8000-000000000002',c,'Reply','86000000-0000-4000-8000-000000000001');
 assert m->'reply'->>'body'='Original';
 assert public.get_chat_message('86000000-0000-4000-8000-000000000001')->>'body'='Original';
 assert public.send_chat_message('86000000-0000-4000-8000-000000000002',c,'Reply','86000000-0000-4000-8000-000000000001')=m;
 perform pg_temp.reject(format('select public.send_chat_message(%L,%L,''Wrong'',%L)',gen_random_uuid(),d,'86000000-0000-4000-8000-000000000001'),'Reply message unavailable');
 perform pg_temp.reject(format('select public.send_chat_message(%L,%L,''Reply'')','86000000-0000-4000-8000-000000000002',c),'Message retry does not match');
 m:=public.set_chat_reaction('86000000-0000-4000-8000-000000000001','🎾');
 assert jsonb_array_length(m->'reactions')=1;
 assert public.set_chat_reaction('86000000-0000-4000-8000-000000000001','🎾')=m;
 m:=public.set_chat_reaction('86000000-0000-4000-8000-000000000001','🔥');
 assert jsonb_array_length(m->'reactions')=1 and m->'reactions'->0->>'emoji'='🔥';
 perform pg_temp.reject('select public.set_chat_reaction(''86000000-0000-4000-8000-000000000001'',''🦄'')','Invalid reaction');
 perform pg_temp.reject('update public.chat_reactions set profile_id=gen_random_uuid()','permission denied');
end$$;
select set_config('request.jwt.claim.sub','85000000-0000-4000-8000-000000000002',true);
do $$declare m jsonb;begin
 m:=public.set_chat_reaction('86000000-0000-4000-8000-000000000001','👏');
 assert jsonb_array_length(m->'reactions')=2;
 m:=public.set_chat_reaction('86000000-0000-4000-8000-000000000001',null);
 assert jsonb_array_length(m->'reactions')=1;
end$$;
select set_config('request.jwt.claim.sub','85000000-0000-4000-8000-000000000004',true);
do $$begin
 assert (select count(*) from public.chat_reactions)=0;
 assert public.get_chat_message('86000000-0000-4000-8000-000000000001') is null;
 perform pg_temp.reject('select public.set_chat_reaction(''86000000-0000-4000-8000-000000000001'',''🎾'')','Message unavailable');
end$$;
select set_config('request.jwt.claim.sub','85000000-0000-4000-8000-000000000001',true);
do $$declare c uuid; m jsonb;begin
 select id into c from public.chat_conversations where player_id='85000000-0000-4000-8000-000000000002';
 perform public.edit_chat_message('86000000-0000-4000-8000-000000000001','Edited original',1);
 m:=public.get_chat_messages(c)->1;
 assert m->'reply'->>'body'='Edited original';
 perform public.delete_chat_message('86000000-0000-4000-8000-000000000001',2);
 m:=public.get_chat_messages(c)->1;
 assert m->'reply'->>'body' is null and m->'reply'->>'deleted_at' is not null;
 assert public.get_chat_messages(c)->0->'reactions'='[]'::jsonb;
 perform pg_temp.reject('select public.set_chat_reaction(''86000000-0000-4000-8000-000000000001'',''🎾'')','Message unavailable');
 perform public.update_chat_preferences(c,'delete');
 perform pg_temp.reject(format('select public.send_chat_message(%L,%L,''Hidden quote'',%L)',gen_random_uuid(),c,'86000000-0000-4000-8000-000000000002'),'Reply message unavailable');
end$$;
select set_config('request.jwt.claim.sub','85000000-0000-4000-8000-000000000002',true);
do $$declare c uuid;begin
 select id into c from public.chat_conversations;
 perform public.send_chat_message('86000000-0000-4000-8000-000000000003',c,'Reply to hidden original','86000000-0000-4000-8000-000000000002');
end$$;
select set_config('request.jwt.claim.sub','85000000-0000-4000-8000-000000000001',true);
do $$declare c uuid; m jsonb;begin
 select id into c from public.chat_conversations where player_id='85000000-0000-4000-8000-000000000002';
 m:=public.get_chat_messages(c)->0;
 assert m->'reply'->>'body' is null and not (m->'reply'->>'available')::boolean;
 assert m->'reply'->>'sender_id' is null and m->'reply'->>'sequence' is null;
end$$;
set local role anon;
do $$begin
 perform pg_temp.reject('select * from public.chat_reactions','permission denied');
 perform pg_temp.reject('select public.set_chat_reaction(gen_random_uuid(),''🎾'')','permission denied');
end$$;
reset role;
rollback;
