begin;
create function pg_temp.join_rejected(statement text, expected text) returns void language plpgsql as $$
begin
  begin execute statement; exception when others then
    if position(expected in sqlerrm)>0 then return; end if;
    raise exception 'Unexpected rejection: %',sqlerrm;
  end;
  raise exception 'Expected rejection: %',expected;
end $$;
insert into auth.users(id) select ('bf300000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid from generate_series(1,6)n;
insert into public.profiles(id,first_name,onboarding_completed_at,category_status,playing_category)
select id,'Join QA',case when right(id::text,1)<>'6' then now() end,
 case when right(id::text,1)='5' then 'unknown' else 'known' end,
 case when right(id::text,1)='5' then null when right(id::text,1)='3' then 4 else 6 end
from auth.users where id::text like 'bf300000-%';
insert into public.organizers(profile_id,display_name) values('bf300000-0000-4000-8000-000000000001','Join rollback host');
select set_config('request.jwt.claim.sub','bf300000-0000-4000-8000-000000000001',true);
select public.save_organizer_session('bf310000-0000-4000-8000-000000000001',jsonb_build_object(
 'title','Join rollback','venueId','','venueName','Join rollback club','venueAddress','Test address 321',
 'date',to_char(current_date+14,'YYYY-MM-DD'),'lastDate',to_char(current_date+21,'YYYY-MM-DD'),
 'startTime','19:00','endTime','20:30','repeat','weekly','capacity','1','price','0','courtConfirmed',true,
 'settings',jsonb_build_object('visibility','public','allowed_categories',array[6],'strict_category_enforcement',true,
 'participant_gender_policy','all','waitlist_enabled',true,'waitlist_promotion_mode','automatic','waitlist_capacity',null,
 'registration_opens_minutes_before',null,'registration_closes_minutes_before',null,'cancellation_notice_minutes',null)),true);

do $$
declare s uuid; r uuid; first_id uuid; target jsonb; jobs jsonb;
 host uuid:='bf300000-0000-4000-8000-000000000001';
 player uuid:='bf300000-0000-4000-8000-000000000002';
begin
 select id into s from public.sessions where series_id='bf310000-0000-4000-8000-000000000001' order by starts_at limit 1;
 insert into private.chat_push_devices(installation_id,profile_id,expo_token,enabled,platform)
 values('bf990000-0000-4000-8000-000000000001',host,'ExpoPushToken[rollback-registration]',true,'ios');
 perform set_config('request.jwt.claim.sub',player::text,true);
 assert not exists(select 1 from jsonb_array_elements(public.get_notification_settings('player')) x where x->>'key' in ('new_registrations','player_cancellations'));
 perform pg_temp.join_rejected('select public.set_notification_preference(''new_registrations'',false)','Organizer');
 r:=(public.join_session(s)->>'registration_id')::uuid;
 perform public.join_session(s);
 assert (select count(*) from private.app_notifications where registration_id=r)=1,'Idempotent join';
 select id into first_id from private.app_notifications where registration_id=r;
 assert private.registration_notification_deliverable(first_id);
 perform set_config('request.jwt.claim.sub',host::text,true);
 assert (public.get_push_subscription_state()->>'new_registrations')::boolean;
 assert (public.get_push_subscription_state()->>'player_cancellations')::boolean;
 assert (select count(*) from jsonb_array_elements(public.get_notification_settings('organizer')) x where x->>'key' in ('new_registrations','player_cancellations'))=2;
 target:=public.get_notification_target(first_id);
 assert target->>'session_id'=s::text and target->>'mode'='organizer' and target->>'notification_type'='new_registrations';
 assert jsonb_array_length(public.get_notification_inbox('player'))=0,'Host events do not leak to player inbox';
 jobs:=public.claim_review_notification_push_jobs();
 assert jsonb_array_length(jobs)=1 and jobs->0->>'kind'='new_registrations','Join queues push';
 perform public.set_notification_preference('new_registrations',false);
 assert not private.registration_notification_deliverable(first_id);
 assert (select state='skipped' from private.notification_push_jobs where notification_id=first_id),'Disabling cancels queued sends';
 perform set_config('request.jwt.claim.sub',player::text,true);
 perform pg_temp.join_rejected(format('select public.get_notification_target(%L)',first_id),'unavailable');
 perform public.cancel_session_registration(s);
 perform public.cancel_session_registration(s);
 assert (select count(*) from private.app_notifications where registration_id=r)=2,'Idempotent cancellation';
 assert (select count(*) from private.notification_push_jobs j join private.app_notifications n on n.id=j.notification_id where n.registration_id=r and n.notification_type='player_cancellations')=1,'Independent cancellation preference';
 perform public.join_session(s);
 assert (select count(*) from private.app_notifications where registration_id=r)=3,'Rejoin is a new event';
 assert (select count(*) from private.notification_push_jobs j join private.app_notifications n on n.id=j.notification_id where n.registration_id=r)=2,'Muted joins still create inbox without push';
 -- Host roster edits and automatic promotions do not generate player events.
 insert into public.registrations(session_id,player_id,status,waitlist_sequence)
 values(s,'bf300000-0000-4000-8000-000000000004','waitlisted',1);
 perform set_config('request.jwt.claim.sub',host::text,true);
 update public.registrations set status='cancelled',cancelled_by=host,cancelled_at=clock_timestamp() where id=r;
 assert (select count(*) from private.app_notifications where registration_id=r)=3,'Host removal excluded';
 assert (select count(*) from private.app_notifications n join public.registrations rr on rr.id=n.registration_id where rr.player_id='bf300000-0000-4000-8000-000000000004' and n.recipient_id=host)=0,'Promotion excludes host join notification';
 assert jsonb_array_length(public.get_notification_inbox('organizer'))=3;
 assert not has_function_privilege('authenticated','private.notify_registration_host(uuid,text)','execute');
 assert not has_table_privilege('authenticated','private.app_notifications','insert');
end $$;
rollback;
