-- Hosted/local rollback-only fixtures. No persistent account or session changes.
begin;
insert into auth.users(id) select ('97000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid from generate_series(1,6)n;
insert into public.profiles(id,first_name,onboarding_completed_at) select id,case right(id::text,1) when '2' then 'Carlos' when '3' then 'Elena' when '4' then 'David' when '5' then 'Sofia' else 'Context QA' end,now() from auth.users where id::text like '97000000%';
insert into public.organizers(profile_id,display_name) values('97000000-0000-4000-8000-000000000001','Context QA'),('97000000-0000-4000-8000-000000000006','Other QA');
set local role authenticated;
select set_config('request.jwt.claim.sub','97000000-0000-4000-8000-000000000001',true);
select public.save_organizer_session('97000000-0000-4000-8000-000000000010',jsonb_build_object('title','Context QA','venueId','','venueName','Context QA Club','venueAddress','QA Context Address','courtLabel','','date',(current_date+7)::text,'lastDate',(current_date+28)::text,'startTime','19:00','endTime','20:30','repeat','weekly','categoryMode','all','capacity','8','price','0','description','','courtConfirmed',true,'settings',jsonb_build_object('allowed_categories',null,'waitlist_enabled',true,'waitlist_promotion_mode','manual','visibility','private')),true);
reset role;
create temporary table qa_dates as select id,row_number()over(order by starts_at) as n from public.sessions where series_id='97000000-0000-4000-8000-000000000010';
-- Insert historical fixture directly; production correctly forbids moving a session into the past.
insert into public.sessions select (jsonb_populate_record(null::public.sessions,to_jsonb(s)||jsonb_build_object('id','97000000-0000-4000-8002-000000000001','starts_at',now()-interval '2 days','ends_at',now()-interval '2 days'+interval '90 minutes','occurrence_date',current_date-2,'registration_closes_at',null,'registration_opens_at',null,'cancellation_deadline_at',null))).* from public.sessions s where id=(select id from qa_dates where n=1);
update qa_dates set id='97000000-0000-4000-8002-000000000001' where n=1;
insert into public.registrations(session_id,player_id,status,confirmed_at)
 select id,'97000000-0000-4000-8000-000000000002','confirmed',now() from qa_dates where n in(1,2);
insert into public.registrations(session_id,player_id,status) select id,'97000000-0000-4000-8000-000000000002','waitlisted' from qa_dates where n=3;
insert into public.registrations(session_id,player_id,status,confirmed_at) select id,'97000000-0000-4000-8000-000000000003','confirmed',now() from qa_dates where n=4;
insert into public.registrations(session_id,player_id,status,confirmed_at) select id,'97000000-0000-4000-8000-000000000004','confirmed',now() from qa_dates where n=1;

insert into public.chat_conversations(id,organizer_id,player_id,source_session_id)
 select ('97000000-0000-4000-8001-'||lpad(n::text,12,'0'))::uuid,'97000000-0000-4000-8000-000000000001',('97000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,(select id from qa_dates where n=1) from generate_series(2,5)n;
insert into public.chat_preferences(conversation_id,profile_id,marked_unread) values('97000000-0000-4000-8001-000000000005','97000000-0000-4000-8000-000000000001',true);
grant select on qa_dates to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub','97000000-0000-4000-8000-000000000001',true);
do $$declare p jsonb;c uuid:='97000000-0000-4000-8001-000000000002';begin
 p:=public.list_chat_conversations(c)->0;
 assert p->'session_context'->>'upcoming_count'='2';
 assert p->'session_context'->>'past_count'='1';
 assert p->'session_context'->'next_session'->>'id'=(select id::text from qa_dates where n=2);
 assert p->'conversation'->>'source_session_id'=(select id::text from qa_dates where n=1);
 assert p->'source_session'->>'id'=(select id::text from qa_dates where n=2);
 p:=public.list_chat_inbox_filtered();
 assert p->'counts'->>'all'='4' and p->'counts'->>'unread'='1' and p->'counts'->>'upcoming'='2' and p->'counts'->>'past'='1';
 assert jsonb_array_length(public.list_chat_inbox_filtered('','upcoming')->'conversations')=2;
 assert jsonb_array_length(public.list_chat_inbox_filtered('','past')->'conversations')=1;
 assert jsonb_array_length(public.list_chat_inbox_filtered('Sofia','upcoming')->'conversations')=0;
 assert public.list_chat_inbox_filtered('Carlos')->'counts'->>'upcoming'='1';
 p:=public.list_chat_inbox_filtered('','upcoming',null,1);
 assert p->'next_cursor'<>'null'::jsonb;
 assert jsonb_array_length(public.list_chat_inbox_filtered('','upcoming',p->'next_cursor',1)->'conversations')=1;
 begin perform public.list_chat_inbox_filtered('','invalid');raise exception 'Expected rejection';exception when invalid_parameter_value then null;end;
end$$;
reset role;
-- Rescheduling changes the nearest date without modifying the conversation origin.
update public.sessions set starts_at=now()+interval '40 days',ends_at=now()+interval '40 days 90 minutes',registration_closes_at=null,cancellation_deadline_at=null where id=(select id from qa_dates where n=2);
set local role authenticated;
do $$begin assert private.chat_session_context('97000000-0000-4000-8001-000000000002')->'next_session'->>'id'=(select id::text from qa_dates where n=3);end$$;
reset role;
-- A cancelled registration is excluded; a cancelled session is excluded too.
update public.registrations set status='cancelled',cancelled_at=now(),cancelled_by='97000000-0000-4000-8000-000000000001' where player_id='97000000-0000-4000-8000-000000000002' and session_id=(select id from qa_dates where n=2);
update public.sessions set status='cancelled',cancelled_at=now() where id=(select id from qa_dates where n=3);
set local role authenticated;
do $$declare p jsonb;begin
 p:=private.chat_session_context('97000000-0000-4000-8001-000000000002');
 assert p->>'upcoming_count'='0' and p->'next_session'='null'::jsonb;
 assert public.list_chat_inbox_filtered()->'counts'->>'past'='2';
 assert public.list_chat_conversations('97000000-0000-4000-8001-000000000002')->0->'source_session'='null'::jsonb;
end$$;
reset role;
-- An occurrence currently in progress still belongs in Upcoming, ahead of later dates.
insert into public.sessions select (jsonb_populate_record(null::public.sessions,to_jsonb(s)||jsonb_build_object('id','97000000-0000-4000-8002-000000000003','starts_at',now()-interval '10 minutes','ends_at',now()+interval '80 minutes','occurrence_date',current_date,'registration_closes_at',null,'registration_opens_at',null,'cancellation_deadline_at',null))).* from public.sessions s where id=(select id from qa_dates where n=4);
insert into public.registrations(session_id,player_id,status,confirmed_at) values('97000000-0000-4000-8002-000000000003','97000000-0000-4000-8000-000000000003','confirmed',now());
set local role authenticated;
do $$begin
 assert private.chat_session_context('97000000-0000-4000-8001-000000000003')->'next_session'->>'id'='97000000-0000-4000-8002-000000000003';
 assert private.chat_session_context('97000000-0000-4000-8001-000000000003')->>'upcoming_count'='2';
end$$;
select set_config('request.jwt.claim.sub','97000000-0000-4000-8000-000000000002',true);
do $$begin
 assert public.list_chat_conversations('97000000-0000-4000-8001-000000000002')->0->'session_context'->>'past_count'='1';
 assert jsonb_array_length(public.list_chat_inbox_filtered('','past')->'conversations')=1;
end$$;
select set_config('request.jwt.claim.sub','97000000-0000-4000-8000-000000000006',true);
do $$begin
 assert private.chat_session_context('97000000-0000-4000-8001-000000000002') is null;
 assert jsonb_array_length(public.list_chat_inbox_filtered()->'conversations')=0;
end$$;
set local role anon;
do $$begin
 begin perform public.list_chat_inbox_filtered();raise exception 'Expected rejection';exception when insufficient_privilege then null;end;
end$$;
rollback;
