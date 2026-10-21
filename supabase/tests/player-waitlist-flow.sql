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
declare s uuid; r uuid; a jsonb; n uuid; old_seq bigint;
 host uuid:='bf300000-0000-4000-8000-000000000001';
 p2 uuid:='bf300000-0000-4000-8000-000000000002';
 p3 uuid:='bf300000-0000-4000-8000-000000000003';
 p4 uuid:='bf300000-0000-4000-8000-000000000004';
begin
 select id into s from public.sessions where series_id='bf310000-0000-4000-8000-000000000001' order by starts_at limit 1;
 update public.sessions set waitlist_capacity=1 where id=s;
 insert into private.chat_push_devices(installation_id,profile_id,expo_token,platform,enabled)
 values('bf990000-0000-4000-8000-000000000003',p3,'ExpoPushToken[rollback-promotion]','ios',true);
 perform set_config('request.jwt.claim.sub',p2::text,true);
 assert public.join_session(s)->>'status'='confirmed';
 perform set_config('request.jwt.claim.sub',p4::text,true);
 a:=public.join_session(s); r:=(a->>'registration_id')::uuid;
 assert a->>'status'='waitlisted' and (a->>'waitlisted_count')::int=1;
 assert public.join_session(s)=a,'Join retry is idempotent';
 assert (select count(*) from private.app_notifications where registration_id=r and notification_type='waitlist_joins')=1;
 select waitlist_sequence into old_seq from public.registrations where id=r;
 perform set_config('request.jwt.claim.sub',p3::text,true);
 perform pg_temp.join_rejected(format('select public.join_session(%L)',s),'JOIN_CATEGORY');
 update public.profiles set playing_category=6 where id=p3;
 perform pg_temp.join_rejected(format('select public.join_session(%L)',s),'JOIN_WAITLIST_FULL');
 update public.sessions set waitlist_enabled=false where id=s;
 perform pg_temp.join_rejected(format('select public.join_session(%L)',s),'JOIN_FULL');
 update public.sessions set waitlist_enabled=true,registration_closes_at=clock_timestamp()-interval '1 minute',
 cancellation_deadline_at=clock_timestamp()-interval '1 minute' where id=s;
 perform set_config('request.jwt.claim.sub',p4::text,true);
 assert public.cancel_session_registration(s)->>'status'='cancelled','Queue departure ignores confirmed cancellation cutoff and registration closure';
 perform public.cancel_session_registration(s);
 assert (select count(*) from private.app_notifications where registration_id=r and notification_type='waitlist_departures')=1;
 update public.sessions set registration_closes_at=null,cancellation_deadline_at=null,waitlist_capacity=2 where id=s;
 perform set_config('request.jwt.claim.sub',p3::text,true);
 perform public.join_session(s);
 perform set_config('request.jwt.claim.sub',p4::text,true);
 assert public.join_session(s)->>'status'='waitlisted';
 assert (select waitlist_sequence>old_seq from public.registrations where id=r),'Rejoin goes to back';
 assert (select count(*) from private.app_notifications where registration_id=r and notification_type='waitlist_joins')=2;
 perform set_config('request.jwt.claim.sub',p2::text,true);
 perform public.cancel_session_registration(s);
 assert (select status='confirmed' from public.registrations where session_id=s and player_id=p3),'Automatic promotion is first eligible';
 select nn.id into n from private.app_notifications nn join public.registrations rr on rr.id=nn.registration_id where rr.session_id=s and rr.player_id=p3 and notification_type='waitlist_promotions';
 assert n is not null,'Automatic promotion emits player notification';
 assert private.waitlist_notification_deliverable(n),'Promotion is deliverable after transition';
 assert (select count(*) from private.notification_push_jobs where notification_id=n)=1,'Promotion queued push';
 perform set_config('request.jwt.claim.sub',p3::text,true);
 assert public.get_notification_target(n)->>'mode'='player';
 assert (public.get_push_subscription_state()->>'waitlist_promotions')::boolean;
 perform public.set_notification_preference('waitlist_promotions',false);
 assert not private.waitlist_notification_deliverable(n),'Player opt-out suppresses promotion push';
 assert jsonb_array_length(public.get_notification_inbox('player'))=1,'Opt-out retains inbox';
 perform public.set_notification_preference('waitlist_promotions',true);
 assert not exists(select 1 from jsonb_array_elements(public.claim_review_notification_push_jobs()) x where x->>'notification_id'=n::text),'Skipped push not replayed';
 perform public.cancel_session_registration(s);
 assert not private.waitlist_notification_deliverable(n),'Old promotion is stale after departure';
 -- Freeze queue for manual promotion; the cancelled promoted player does not invent a new host registration.
 update public.sessions set waitlist_promotion_mode='manual',capacity=2 where id=s;
 -- Automatic cancellation above may already have promoted p4; return it to the queue solely as a rollback fixture.
 update public.registrations set status='waitlisted',confirmed_at=null where id=r;
 perform set_config('request.jwt.claim.sub',host::text,true);
 a:=public.manage_organizer_waitlist(r,'promote',(select updated_at from public.registrations where id=r));
 assert a->>'status'='confirmed';
 perform public.manage_organizer_waitlist(r,'promote',(select updated_at from public.registrations where id=r));
 assert (select count(*) from private.app_notifications where registration_id=r and notification_type='waitlist_promotions')=2,'Automatic and manual cycles each notify once, retry does not';
 assert (select count(*) from private.app_notifications where registration_id=r and notification_type='new_registrations')=0,'Promotion does not fabricate player join';
 assert (select count(*) from jsonb_array_elements(public.get_notification_settings('organizer')) x where x->>'key' in ('waitlist_joins','waitlist_departures'))=2;
 assert not exists(select 1 from jsonb_array_elements(public.get_notification_settings('organizer')) x where x->>'key'='waitlist_promotions');
 perform set_config('request.jwt.claim.sub',p4::text,true);
 assert public.get_public_session_detail(s)->>'viewer_registration'='confirmed';
 assert public.get_public_session_detail(s)->>'waitlist_enabled'='true';
 perform set_config('request.jwt.claim.sub','',true);
 perform pg_temp.join_rejected(format('select public.join_session(%L)',s),'JOIN_SIGN_IN_REQUIRED');
 assert not has_table_privilege('authenticated','public.registrations','insert');
 assert not has_function_privilege('authenticated','private.notify_waitlist_promotion()','execute');
end $$;
rollback;
