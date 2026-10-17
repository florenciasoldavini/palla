-- Isolated database only; all synthetic accounts and messages roll back.
begin;
insert into auth.users(id) select ('94000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid from generate_series(1,67)n;
insert into public.profiles(id,first_name,onboarding_completed_at)
 select id,case when right(id::text,12)::bigint=6 then 'Percent%' else 'Person '||lpad((right(id::text,12)::bigint-1)::text,3,'0') end,now()
 from auth.users where id::text like '94000000%';
insert into public.organizers(profile_id,display_name) values('94000000-0000-4000-8000-000000000001','Inbox QA');
insert into public.chat_conversations(id,organizer_id,player_id,created_at)
 select ('95000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'94000000-0000-4000-8000-000000000001',('94000000-0000-4000-8000-'||lpad((n+1)::text,12,'0'))::uuid,'2026-10-01T10:00:00Z' from generate_series(1,65)n;
insert into public.chat_preferences(conversation_id,profile_id,pinned_at,marked_unread,hidden)
 select id,organizer_id,case when right(id::text,1)='1' then '2026-10-01T11:00:00Z'::timestamptz end,right(id::text,1)='2',right(id::text,1)='4'
 from public.chat_conversations where id in ('95000000-0000-4000-8000-000000000001','95000000-0000-4000-8000-000000000002','95000000-0000-4000-8000-000000000004');
insert into public.chat_messages(id,conversation_id,sender_id,body,created_at)
 values('96000000-0000-4000-8000-000000000001','95000000-0000-4000-8000-000000000003','94000000-0000-4000-8000-000000000004','Needle message','2026-10-01T10:00:00Z');
create function pg_temp.reject(q text) returns void language plpgsql as $$begin execute q;raise exception 'Expected rejection';exception when insufficient_privilege or invalid_parameter_value then null;end$$;
set local role authenticated;
select set_config('request.jwt.claim.sub','94000000-0000-4000-8000-000000000001',true);
do $$declare a jsonb; b jsonb; c jsonb; ids text[];begin
 a:=public.list_chat_inbox();
 assert jsonb_array_length(a->'conversations')=30;
 assert a->'counts'=jsonb_build_object('all',64,'unread',2,'total_unread',2,'badge',2);
 assert a->'conversations'->0->'conversation'->>'id'='95000000-0000-4000-8000-000000000001';
 b:=public.list_chat_inbox('',false,a->'next_cursor');
 c:=public.list_chat_inbox('',false,b->'next_cursor');
 assert jsonb_array_length(b->'conversations')=30 and jsonb_array_length(c->'conversations')=4 and c->'next_cursor'='null'::jsonb;
 select array_agg(x->'conversation'->>'id') into ids from jsonb_array_elements((a->'conversations')||(b->'conversations')||(c->'conversations'))x;
 assert cardinality(ids)=64 and (select count(distinct x) from unnest(ids)x)=64;
 assert not ('95000000-0000-4000-8000-000000000004'=any(ids));
 a:=public.list_chat_inbox('Person 002');
 assert jsonb_array_length(a->'conversations')=1 and (a->'counts'->>'unread')::int=1;
 assert a->'conversations'->0->'conversation'->>'id'='95000000-0000-4000-8000-000000000002';
 assert jsonb_array_length(public.list_chat_inbox('Needle message')->'conversations')=1;
 assert jsonb_array_length(public.list_chat_inbox('%')->'conversations')=1;
 assert jsonb_array_length(public.list_chat_inbox('',true)->'conversations')=2;
 assert jsonb_array_length(public.list_chat_inbox('no match')->'conversations')=0;
 perform pg_temp.reject('select public.list_chat_inbox('''',false,null,0)');
 perform pg_temp.reject('select public.list_chat_inbox('''',false,''{}''::jsonb)');
end$$;
select set_config('request.jwt.claim.sub','94000000-0000-4000-8000-000000000067',true);
do $$begin assert public.list_chat_inbox()->'conversations'='[]'::jsonb; assert (public.list_chat_inbox()->'counts'->>'all')::int=0;end$$;
select set_config('request.jwt.claim.sub','94000000-0000-4000-8000-000000000002',true);
do $$begin assert jsonb_array_length(public.list_chat_inbox()->'conversations')=1;assert public.list_chat_inbox()->'conversations'->0->>'pinned_at' is null;end$$;
select set_config('request.jwt.claim.sub','',true);
select pg_temp.reject('select public.list_chat_inbox()');
set local role anon;
select pg_temp.reject('select public.list_chat_inbox()');
rollback;
