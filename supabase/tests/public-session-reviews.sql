-- No persistent QA identities, sessions, reviews, or notifications.
begin;
insert into auth.users(id) values('be000000-0000-4000-8000-000000000001'),('be000000-0000-4000-8000-000000000002');
insert into public.profiles(id,first_name,last_name,onboarding_completed_at) values('be000000-0000-4000-8000-000000000001','QA','Host',now()),('be000000-0000-4000-8000-000000000002','QA','Reviewer',now());
insert into public.organizers(profile_id,display_name) values('be000000-0000-4000-8000-000000000001','Review rollback host');
insert into public.venues(id,created_by,name,address) values('be100000-0000-4000-8000-000000000001','be000000-0000-4000-8000-000000000001','Rollback venue','Not a real venue');
insert into public.session_series(id,organizer_id,draft_input) values('be200000-0000-4000-8000-000000000001','be000000-0000-4000-8000-000000000001','{}'),('be200000-0000-4000-8000-000000000002','be000000-0000-4000-8000-000000000001','{}');
insert into public.sessions(id,organizer_id,series_id,occurrence_date,venue_id,title,capacity,price_minor,starts_at,ends_at,status,visibility,cancelled_at)
select ('be300000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'be000000-0000-4000-8000-000000000001',case when n=8 then 'be200000-0000-4000-8000-000000000002'::uuid else 'be200000-0000-4000-8000-000000000001'::uuid end,current_date-n,'be100000-0000-4000-8000-000000000001','Review rollback '||n,4,1000,case when n=9 then now()+interval '1 day' else now()-interval '1 day'*n end,case when n=9 then now()+interval '1 day 90 minutes' else now()-interval '1 day'*n+interval '90 minutes' end,case when n=7 then 'cancelled' else 'published' end,case when n=4 then 'private' else 'public' end,case when n=7 then now() else null end from generate_series(1,9)n;
insert into public.registrations(id,session_id,player_id,status,confirmed_at,cancelled_at,cancelled_by)
select ('be400000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,('be300000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'be000000-0000-4000-8000-000000000002',case when n=7 then 'cancelled' else 'confirmed' end,now(),case when n=7 then now() else null end,case when n=7 then 'be000000-0000-4000-8000-000000000002'::uuid else null end from generate_series(1,9)n;
insert into public.session_reviews(id,registration_id,session_id,organizer_id,reviewer_id,rating,comment,status,created_at)
select ('be500000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,('be400000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,('be300000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'be000000-0000-4000-8000-000000000001','be000000-0000-4000-8000-000000000002',case when n=3 then 3 else 5 end,'Rollback review',case when n=5 then 'hidden' when n=6 then 'removed' else 'published' end,'2026-10-01T12:00:00Z'::timestamptz from generate_series(1,9)n;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$declare x jsonb;y jsonb;begin
 x:=public.get_public_session_reviews('be300000-0000-4000-8000-000000000001',2);
 assert (x->>'total')::int=3,'Exclude private/hidden/removed/cancelled/other-series reviews';
 assert (x->>'average')::numeric=4.3;
 assert x->'distribution'='[2,0,1,0,0]'::jsonb;
 assert jsonb_array_length(x->'items')=2;
 assert x->'items'->0->>'reviewer_name'='QA Reviewer';
 assert not(x::text like '%registration_id%' or x::text like '%reviewer_id%' or x::text like '%player_id%' or x::text like '%checked_in%');
 y:=public.get_public_session_reviews('be300000-0000-4000-8000-000000000001',2,(x->'next_cursor'->>'created_at')::timestamptz,(x->'next_cursor'->>'id')::uuid);
 assert jsonb_array_length(y->'items')=1,'Stable keyset pagination with identical timestamps';
 assert y->'items'->0->>'id'<>x->'items'->0->>'id' and y->'items'->0->>'id'<>x->'items'->1->>'id';
 assert y->'next_cursor'='null'::jsonb;
 assert y->'distribution'=x->'distribution','Summary spans all pages';
 assert public.get_public_session_reviews('be300000-0000-4000-8000-000000000099') is null;
 assert public.get_public_session_reviews('be300000-0000-4000-8000-000000000004') is null,'Private target inaccessible';
 assert (public.get_public_session_reviews('be300000-0000-4000-8000-000000000008')->>'total')::int=1,'One-off reviews must not expand to host-wide reviews';
 begin perform public.get_public_session_reviews('be300000-0000-4000-8000-000000000001',21); raise exception 'Expected invalid limit'; exception when invalid_parameter_value then null;end;
 begin perform public.get_public_session_reviews('be300000-0000-4000-8000-000000000001',2,now(),null); raise exception 'Expected invalid cursor'; exception when invalid_parameter_value then null;end;
end$$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','be000000-0000-4000-8000-000000000002',true);
do $$begin
 assert public.get_public_session_reviews('be300000-0000-4000-8000-000000000004') is null;
 assert (public.get_public_session_reviews('be300000-0000-4000-8000-000000000009')->>'total')::int=3,'Future reviews excluded even for signed-in callers';
end$$;
select set_config('request.jwt.claim.sub','be000000-0000-4000-8000-000000000001',true);
do $$begin
 assert (public.get_public_session_reviews('be300000-0000-4000-8000-000000000004')->>'total')::int=3,'Owner private preview only exposes public series reviews';
end$$;
reset role;
rollback;
