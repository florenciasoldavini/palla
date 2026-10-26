begin;
insert into auth.users(id) values('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002');
insert into public.profiles(id,first_name,onboarding_completed_at) values('00000000-0000-4000-8000-000000000001','Photo Player',now()),('00000000-0000-4000-8000-000000000002','Photo Host',now());
insert into public.organizers(profile_id,display_name) values('00000000-0000-4000-8000-000000000002','Photo Host');
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
select public.start_chat(auth.uid(),'00000000-0000-4000-8000-000000000001');
do $$begin
 if has_function_privilege('authenticated','public.authorize_chat_photo_processing(uuid,uuid)','EXECUTE') or has_function_privilege('anon','public.authorize_chat_photo_processing(uuid,uuid)','EXECUTE') then raise exception 'Public privilege leak';end if;
 begin perform public.authorize_chat_photo_processing('00000000-0000-4000-8000-000000000099',(select id from public.chat_conversations where player_id='00000000-0000-4000-8000-000000000001' and organizer_id='00000000-0000-4000-8000-000000000002'));raise exception 'Unauthorized accepted';exception when insufficient_privilege then null;end;
 for i in 1..10 loop perform public.authorize_chat_photo_processing('00000000-0000-4000-8000-000000000001',(select id from public.chat_conversations where player_id='00000000-0000-4000-8000-000000000001' and organizer_id='00000000-0000-4000-8000-000000000002'));end loop;
 begin perform public.authorize_chat_photo_processing('00000000-0000-4000-8000-000000000001',(select id from public.chat_conversations where player_id='00000000-0000-4000-8000-000000000001' and organizer_id='00000000-0000-4000-8000-000000000002'));raise exception 'Rate limit bypassed';exception when program_limit_exceeded then null;end;
 update private.chat_photo_processing_usage set minute_start=now()-interval '2 minutes';
 perform public.authorize_chat_photo_processing('00000000-0000-4000-8000-000000000001',(select id from public.chat_conversations where player_id='00000000-0000-4000-8000-000000000001' and organizer_id='00000000-0000-4000-8000-000000000002'));
 update private.chat_photo_processing_usage set day_count=150;
 begin perform public.authorize_chat_photo_processing('00000000-0000-4000-8000-000000000001',(select id from public.chat_conversations where player_id='00000000-0000-4000-8000-000000000001' and organizer_id='00000000-0000-4000-8000-000000000002'));raise exception 'Daily limit bypassed';exception when program_limit_exceeded then null;end;
end$$;

rollback;
