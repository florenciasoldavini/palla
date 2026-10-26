begin;
-- Isolated fixtures: no real accounts, notifications, or registrations remain.
insert into auth.users(id) select ('be400000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid from generate_series(1,6)n;
insert into public.profiles(id,first_name,onboarding_completed_at,category_status,playing_category)
select id,'Priority QA',now(),'known',6 from auth.users where id::text like 'be400000-%';
insert into public.organizers(profile_id,display_name) values('be400000-0000-4000-8000-000000000001','Priority QA host');
insert into public.venues(id,created_by,name,address) values('be410000-0000-4000-8000-000000000001','be400000-0000-4000-8000-000000000001','Priority QA venue','Priority QA address');
insert into public.session_series(id,organizer_id,draft_input) values('be420000-0000-4000-8000-000000000001','be400000-0000-4000-8000-000000000001','{}');
insert into public.sessions(id,organizer_id,series_id,occurrence_date,venue_id,title,capacity,price_minor,starts_at,ends_at,visibility,waitlist_enabled,waitlist_promotion_mode,strict_category_enforcement,allowed_categories)
select ('be430000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'be400000-0000-4000-8000-000000000001','be420000-0000-4000-8000-000000000001',current_date+10+n,'be410000-0000-4000-8000-000000000001','Priority QA '||n,1,0,now()+interval '10 days',now()+interval '10 days 2 hours','public',true,case when n=1 then 'manual' else 'automatic' end,true,array[6]::smallint[] from generate_series(1,4)n;

do $$declare
 s uuid:='be430000-0000-4000-8000-000000000001';
 automatic uuid:='be430000-0000-4000-8000-000000000002';
 rejoin uuid:='be430000-0000-4000-8000-000000000003';
 empty_queue uuid:='be430000-0000-4000-8000-000000000004';
 host uuid:='be400000-0000-4000-8000-000000000001';
 p2 uuid:='be400000-0000-4000-8000-000000000002';
 p3 uuid:='be400000-0000-4000-8000-000000000003';
 p4 uuid:='be400000-0000-4000-8000-000000000004';
 p5 uuid:='be400000-0000-4000-8000-000000000005';
 result jsonb; previous_id text;
begin
 perform set_config('request.jwt.claim.sub',p2::text,true);
 assert public.join_session(s)->>'status'='confirmed';
 perform set_config('request.jwt.claim.sub',p3::text,true);
 assert public.join_session(s)->>'status'='waitlisted';
 perform set_config('request.jwt.claim.sub',p2::text,true);
 perform public.cancel_session_registration(s);
 perform set_config('request.jwt.claim.sub',p4::text,true);
 result:=public.join_session(s);
 assert result->>'status'='waitlisted','Newcomer cannot take manual vacancy';
 previous_id:=result->>'registration_id';
 assert public.join_session(s)->>'registration_id'=previous_id,'Retry preserves queue identity';
 assert (select waitlist_sequence from public.registrations where session_id=s and player_id=p3)<(select waitlist_sequence from public.registrations where session_id=s and player_id=p4),'Newcomer joins behind existing player';
 assert (select count(*) from public.registrations where session_id=s and status='confirmed')=0;
 assert jsonb_array_length(public.discover_sessions_page(p_search=>'Priority QA 1',p_availability=>'spots')->'sessions')=0,'Reserved vacancy is not an open spot';
 assert jsonb_array_length(public.discover_sessions_page(p_search=>'Priority QA 1',p_availability=>'waitlist')->'sessions')=1;
 update public.sessions set waitlist_capacity=2 where id=s;
 perform set_config('request.jwt.claim.sub',p5::text,true);
 begin perform public.join_session(s);raise exception 'Full queue bypassed';exception when others then if sqlerrm<>'JOIN_WAITLIST_FULL' then raise;end if;end;
 assert jsonb_array_length(public.discover_sessions_page(p_search=>'Priority QA 1',p_availability=>'joinable')->'sessions')=0;
 update public.sessions set waitlist_enabled=false where id=s;
 begin perform public.join_session(s);raise exception 'Closed queue bypassed';exception when others then if sqlerrm<>'JOIN_WAITLIST_CLOSED' then raise;end if;end;
 update public.sessions set waitlist_enabled=true where id=s;
 perform set_config('request.jwt.claim.sub',host::text,true);
 perform public.manage_organizer_waitlist((select id from public.registrations where session_id=s and player_id=p3),'promote',(select updated_at from public.registrations where session_id=s and player_id=p3));
 assert (select status from public.registrations where session_id=s and player_id=p3)='confirmed','Host still controls manual promotion';

 perform set_config('request.jwt.claim.sub',p2::text,true);perform public.join_session(automatic);
 perform set_config('request.jwt.claim.sub',p3::text,true);perform public.join_session(automatic);
 perform set_config('request.jwt.claim.sub',p2::text,true);result:=public.cancel_session_registration(automatic);
 assert (result->>'confirmed_count')::int=1,'Cancellation includes automatic promotion';
 assert (select status from public.registrations where session_id=automatic and player_id=p3)='confirmed';

 perform set_config('request.jwt.claim.sub',p2::text,true);perform public.join_session(rejoin);
 perform set_config('request.jwt.claim.sub',p3::text,true);perform public.join_session(rejoin);
 perform set_config('request.jwt.claim.sub',p4::text,true);perform public.join_session(rejoin);perform public.cancel_session_registration(rejoin);
 update public.profiles set category_status='unknown',playing_category=null where id=p3;
 perform set_config('request.jwt.claim.sub',p2::text,true);perform public.cancel_session_registration(rejoin);
 perform set_config('request.jwt.claim.sub',p4::text,true);
 assert public.join_session(rejoin)->>'status'='confirmed','Rejoining uses first-eligible automatic fill in the same transaction';
 assert (select status from public.registrations where session_id=rejoin and player_id=p3)='waitlisted','Ineligible earlier entry is not promoted';
 perform set_config('request.jwt.claim.sub',p5::text,true);
 assert public.join_session(empty_queue)->>'status'='confirmed','Empty queue still allows direct joining';
end$$;
rollback;
