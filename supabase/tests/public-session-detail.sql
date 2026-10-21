-- All product/Auth fixtures are rolled back. No notifications or account changes persist.
begin;
insert into auth.users(id) values('ad000000-0000-4000-8000-000000000001'),('ad000000-0000-4000-8000-000000000002');
insert into public.profiles(id,first_name,last_name,onboarding_completed_at) values('ad000000-0000-4000-8000-000000000001','QA','Host',now()),('ad000000-0000-4000-8000-000000000002','QA','Player',now());
insert into public.organizers(profile_id,display_name) values('ad000000-0000-4000-8000-000000000001','QA public host');
insert into public.venues(id,created_by,name,address) values('ad100000-0000-4000-8000-000000000001','ad000000-0000-4000-8000-000000000001','Rollback venue','Not a real venue');
insert into public.session_series(id,organizer_id,draft_input) values('ad200000-0000-4000-8000-000000000001','ad000000-0000-4000-8000-000000000001','{}');
insert into public.sessions(id,organizer_id,series_id,occurrence_date,venue_id,title,capacity,price_minor,starts_at,ends_at,status,visibility)
select ('ad300000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'ad000000-0000-4000-8000-000000000001','ad200000-0000-4000-8000-000000000001',current_date+n,'ad100000-0000-4000-8000-000000000001','Public detail rollback '||n,4,1000,case when n=5 then now()-interval '2 hours' else now()+interval '1 day'*n end,case when n=5 then now()-interval '30 minutes' else now()+interval '1 day'*n+interval '90 minutes' end,'published',case when n=2 then 'private' else 'public' end from generate_series(1,5)n where n<>3;
update public.sessions set status='cancelled',cancelled_at=now() where id='ad300000-0000-4000-8000-000000000004';
update public.sessions set status='completed',completed_at=now() where id='ad300000-0000-4000-8000-000000000005';
insert into public.registrations(session_id,player_id,status,confirmed_at) values('ad300000-0000-4000-8000-000000000001','ad000000-0000-4000-8000-000000000002','confirmed',now());
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$declare x jsonb;begin
 x:=public.get_public_session_detail('ad300000-0000-4000-8000-000000000001');
 assert x->>'title'='Public detail rollback 1';
 assert (x->>'confirmed_count')::int=1;
 assert jsonb_array_length(x->'players')=0,'Anonymous roster identities must be hidden';
 assert not(x?'organizer_id' or x?'series_id' or x?'venue_id' or x?'draft_input');
 assert not(x::text like '%phone_number%' or x::text like '%checked_in%' or x::text like '%player_id%');
 assert public.get_public_session_detail('ad300000-0000-4000-8000-000000000002') is null,'Private occurrence must be hidden';
 assert public.get_public_session_detail('ad200000-0000-4000-8000-000000000001') is null,'A draft series must not resolve as an occurrence';
 assert public.get_public_session_detail('ad300000-0000-4000-8000-000000000004')->>'status'='cancelled';
 assert public.get_public_session_detail('ad300000-0000-4000-8000-000000000005')->>'status'='completed';
 assert public.get_public_session_detail('ad300000-0000-4000-8000-000000000099') is null;
 assert not has_table_privilege('anon','public.registrations','select');
 assert not has_table_privilege('anon','public.profiles','select');
end$$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','ad000000-0000-4000-8000-000000000002',true);
do $$declare x jsonb;begin
 x:=public.get_public_session_detail('ad300000-0000-4000-8000-000000000001');
 assert x->>'viewer_registration'='confirmed';
 assert x->'players'->0->>'name'='QA P.';
 assert not(x->'players'->0?'id' or x->'players'->0?'checked_in_at');
 assert public.get_public_session_detail('ad300000-0000-4000-8000-000000000002') is null;
end$$;
select set_config('request.jwt.claim.sub','ad000000-0000-4000-8000-000000000001',true);
do $$begin
 assert (public.get_public_session_detail('ad300000-0000-4000-8000-000000000002')->>'viewer_is_host')::boolean;
 assert public.get_public_session_detail('ad200000-0000-4000-8000-000000000001') is null;
end$$;
reset role;
rollback;
