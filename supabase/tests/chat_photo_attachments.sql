begin;
insert into auth.users(id) select ('95100000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid from generate_series(1,3)n;
insert into public.profiles(id,first_name,onboarding_completed_at) select id,'Photo QA',now() from auth.users where id::text like '95100000%';
insert into public.organizers(profile_id,display_name) values('95100000-0000-4000-8000-000000000001','Photo QA');
create function pg_temp.reject(q text,expected text) returns void language plpgsql as $$begin execute q;raise exception 'Expected rejection';exception when others then if sqlerrm not like '%'||expected||'%' then raise;end if;end$$;
select set_config('request.jwt.claim.sub','95100000-0000-4000-8000-000000000001',true);
select public.start_chat(auth.uid(),'95100000-0000-4000-8000-000000000002');
do $$declare c uuid; prepared jsonb; m jsonb; actor uuid:='95100000-0000-4000-8000-000000000001';mid uuid:='95200000-0000-4000-8000-000000000001';begin
 select id into c from public.chat_conversations where organizer_id=actor;
 prepared:=public.prepare_chat_photo(actor,mid,c,'',repeat('a',64));
 assert prepared->>'path'=actor::text||'/'||c::text||'/'||mid::text||'.jpg';
 perform pg_temp.reject(format('select public.prepare_chat_photo(%L,%L,%L,%L,%L)',actor,mid,c,'changed',repeat('a',64)),'identity conflict');
 perform pg_temp.reject(format('select public.prepare_chat_photo(%L,%L,%L,%L,%L)',actor,mid,c,'',repeat('b',64)),'identity conflict');
 insert into storage.objects(bucket_id,name,metadata) values('chat-attachments',prepared->>'path','{"size":100,"mimetype":"image/jpeg"}');
 m:=public.finish_chat_photo(actor,mid,100,1200,900);
 assert m->>'body'='' and m->>'kind'='attachment';
 assert jsonb_array_length(m->'attachments')=1;
 assert m->'attachments'->0->>'width'='1200';
 assert public.finish_chat_photo(actor,mid,100,1200,900)->>'id'=mid::text;
 assert public.prepare_chat_photo(actor,mid,c,'',repeat('a',64))->'message'->>'id'=mid::text;
end$$;
set local role authenticated;
select set_config('request.jwt.claim.sub','95100000-0000-4000-8000-000000000002',true);
do $$begin
 assert (select count(*) from public.chat_attachments)=1;
 assert not exists(select 1 from storage.objects where bucket_id='chat-attachments');
 perform pg_temp.reject('select public.get_chat_photo_access(auth.uid(),''95200000-0000-4000-8000-000000000001'')','permission denied');
 perform pg_temp.reject('select public.prepare_chat_photo(auth.uid(),gen_random_uuid(),gen_random_uuid(),'''',repeat(''a'',64))','permission denied');
 perform pg_temp.reject('insert into public.chat_attachments(id,message_id,type,storage_path,mime_type,size_bytes) values(gen_random_uuid(),gen_random_uuid(),''image'',''spoof'',''image/jpeg'',1)','permission denied');
end$$;
select set_config('request.jwt.claim.sub','95100000-0000-4000-8000-000000000003',true);
do $$begin assert not exists(select 1 from public.chat_attachments);end$$;
reset role;
do $$declare c uuid; actor uuid:='95100000-0000-4000-8000-000000000001';mid uuid:='95200000-0000-4000-8000-000000000001';begin
 select id into c from public.chat_conversations where organizer_id=actor;
 perform pg_temp.reject(format('select public.get_chat_photo_access(%L,%L)','95100000-0000-4000-8000-000000000003',mid),'Photo unavailable');
 perform public.get_chat_photo_access('95100000-0000-4000-8000-000000000002',mid);
 perform set_config('request.jwt.claim.sub',actor::text,true);
 perform public.set_chat_block(c,true);
 perform pg_temp.reject(format('select public.prepare_chat_photo(%L,gen_random_uuid(),%L,%L,%L)',actor,c,'',repeat('a',64)),'Messaging unavailable');
 -- Blocking retains existing history, including photo access.
 perform public.get_chat_photo_access(actor,mid);
 perform public.delete_chat_message(mid,1);
 assert public.get_chat_messages(c)->0->'attachments'='[]'::jsonb;
 perform pg_temp.reject(format('select public.get_chat_photo_access(%L,%L)',actor,mid),'Photo unavailable');
 assert jsonb_array_length(public.chat_photo_cleanup_candidates(actor))=1;
end$$;
rollback;
