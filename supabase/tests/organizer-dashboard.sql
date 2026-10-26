-- Isolated rollback fixtures: no accounts, session records or notifications survive.
begin;
create function pg_temp.expect_error(statement text,pattern text) returns void language plpgsql as $$begin
 execute statement;raise exception 'Expected rejection did not happen';
exception when others then if sqlerrm not like '%'||pattern||'%' then raise;end if;end$$;
do $$declare b jsonb;begin
 b:=private.organizer_dashboard_period('this_month','2024-03-31T15:00:00Z');
 assert b->>'previous_end_date'='2024-02-29','Leap-month comparison clamps to February';
 assert b->>'start_date'='2024-03-01';
 b:=private.organizer_dashboard_period('this_month','2026-11-01T01:00:00Z');
 assert b->>'start_date'='2026-10-01','Period follows Buenos Aires, not UTC';
 b:=private.organizer_dashboard_period('last_month','2026-03-20T15:00:00Z');
 assert b->>'start_date'='2026-02-01' and b->>'end_date'='2026-02-28';
 assert b->>'previous_start_date'='2026-01-01' and b->>'previous_end_date'='2026-01-31';
end$$;
insert into auth.users(id) select ('da000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid from generate_series(1,5)n;
insert into public.profiles(id,first_name,onboarding_completed_at) select id,'Dashboard QA',now() from auth.users where id::text like 'da000000-%';
insert into public.organizers(profile_id,display_name) values('da000000-0000-4000-8000-000000000001','Dashboard host'),('da000000-0000-4000-8000-000000000005','Other host');
insert into public.venues(id,created_by,name,address) values('da100000-0000-4000-8000-000000000001','da000000-0000-4000-8000-000000000001','Dashboard rollback venue','No real place');
insert into public.session_series(id,organizer_id,draft_input) values('da200000-0000-4000-8000-000000000001','da000000-0000-4000-8000-000000000001','{}');
insert into public.session_series(id,organizer_id,draft_input) values('da200000-0000-4000-8000-000000000005','da000000-0000-4000-8000-000000000005','{}');
with b as (select private.organizer_dashboard_period('this_month') as value), times as (
 select (value->>'start_at')::timestamptz+(now()-(value->>'start_at')::timestamptz)*0.5 as current_start,
  (value->>'previous_start_at')::timestamptz+((value->>'previous_end_at')::timestamptz-(value->>'previous_start_at')::timestamptz)*0.5 as previous_time from b
)
insert into public.sessions(id,organizer_id,series_id,occurrence_date,venue_id,title,capacity,price_minor,starts_at,ends_at,status,waitlist_enabled,waitlist_promotion_mode)
select ('da300000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
 case when n=7 then 'da000000-0000-4000-8000-000000000005'::uuid else 'da000000-0000-4000-8000-000000000001'::uuid end,
 case when n=7 then 'da200000-0000-4000-8000-000000000005'::uuid else 'da200000-0000-4000-8000-000000000001'::uuid end,
 (now() at time zone 'America/Argentina/Buenos_Aires')::date-n,
 'da100000-0000-4000-8000-000000000001','Dashboard QA '||n,case when n=2 then 4 when n=6 then 10 else 8 end,0,
 case when n=4 then now()+interval '1 day' when n=6 then previous_time else current_start end,
 case when n=4 then now()+interval '25 hours' when n=6 then previous_time+(now()-previous_time)*0.01 else current_start+(now()-current_start)*0.01 end,
 'published',true,'manual' from times cross join generate_series(1,7)n;
insert into public.registrations(id,session_id,player_id,status,confirmed_at)
select ('da400000-0000-4000-8000-'||lpad((s*10+p)::text,12,'0'))::uuid,('da300000-0000-4000-8000-'||lpad(s::text,12,'0'))::uuid,
 ('da000000-0000-4000-8000-'||lpad(p::text,12,'0'))::uuid,'confirmed',now()
from generate_series(1,7)s cross join generate_series(2,3)p where s<>4 or p=2;
insert into public.registrations(session_id,player_id,status,confirmed_at) values('da300000-0000-4000-8000-000000000001','da000000-0000-4000-8000-000000000001','confirmed',now());
insert into public.registrations(session_id,player_id,status,waitlist_sequence) values('da300000-0000-4000-8000-000000000001','da000000-0000-4000-8000-000000000004','waitlisted',1);
update public.sessions set status='completed' where id in ('da300000-0000-4000-8000-000000000001','da300000-0000-4000-8000-000000000002','da300000-0000-4000-8000-000000000006','da300000-0000-4000-8000-000000000007');
-- Cancellation triggers snapshot recipients but no QA device exists; everything rolls back.
update public.sessions set status='cancelled',cancelled_at=now() where id='da300000-0000-4000-8000-000000000003';
insert into public.session_reviews(id,registration_id,session_id,organizer_id,reviewer_id,rating,comment,status,created_at)
select ('da500000-0000-4000-8000-'||lpad((s*10+p)::text,12,'0'))::uuid,
 ('da400000-0000-4000-8000-'||lpad((s*10+p)::text,12,'0'))::uuid,
 ('da300000-0000-4000-8000-'||lpad(s::text,12,'0'))::uuid,
 case when s=7 then 'da000000-0000-4000-8000-000000000005'::uuid else 'da000000-0000-4000-8000-000000000001'::uuid end,
 ('da000000-0000-4000-8000-'||lpad(p::text,12,'0'))::uuid,
 case when s=1 and p=2 then 5 when s=2 and p=2 then 3 else 1 end,'Review submitted after the session',
 case when p=2 then 'published' when s=1 then 'hidden' else 'removed' end,now()
from (values(1),(2),(6),(7))sessions(s) cross join generate_series(2,3)p;
set local role authenticated;
select set_config('request.jwt.claim.sub','da000000-0000-4000-8000-000000000002',true);
select pg_temp.expect_error($s$select public.get_organizer_dashboard()$s$,'Organizer access required');
select pg_temp.expect_error($s$select public.get_organizer_dashboard_reviews()$s$,'Organizer access required');
select set_config('request.jwt.claim.sub','da000000-0000-4000-8000-000000000001',true);
do $$declare d jsonb;p jsonb;q jsonb;begin
 d:=public.get_organizer_dashboard('this_month');
 assert (d->'current'->>'sessions')::int=2,'Only own completed occurrences, not ended/published, upcoming, cancelled or foreign';
 assert (d->'current'->>'bookings')::int=4,'Exclude host and waitlisted registrations';
 assert (d->'current'->>'capacity')::int=12;
 assert (d->'current'->>'fill_rate')::numeric=33.3,'Weighted capacity, not mean of percentages';
 assert (d->'current'->>'average_rating')::numeric=4 and (d->'current'->>'review_count')::int=2,'Repeated player counts once per occurrence; hidden/removed excluded';
 assert (d->'previous'->>'sessions')::int=1 and (d->'previous'->>'bookings')::int=2;
 assert (d->'chart'->-1->>'current')::int=4 and (d->'chart'->-1->>'previous')::int=2,'Chart totals match cards';
 assert jsonb_array_length(d->'recent_reviews')=2,'Later review publication uses original session period';
 assert jsonb_array_length(d->'attention')=1 and d->'attention'->0->>'id'='da300000-0000-4000-8000-000000000004';
 assert d->'next_session'->>'id'='da300000-0000-4000-8000-000000000004';
 p:=public.get_organizer_dashboard_reviews('this_month',null,1);
 assert jsonb_array_length(p->'items')=1 and p->'next_cursor'<>'null'::jsonb;
 q:=public.get_organizer_dashboard_reviews('this_month',p->'next_cursor',1);
 assert jsonb_array_length(q->'items')=1 and q->'next_cursor'='null'::jsonb;
 assert p->'items'->0->>'id'<>q->'items'->0->>'id','Stable cursor handles identical publication times';
 perform pg_temp.expect_error($s$select public.get_organizer_dashboard('all_time')$s$,'Invalid dashboard period');
 perform pg_temp.expect_error($s$select public.get_organizer_dashboard_reviews('this_month',null,50)$s$,'Invalid review limit');
 perform pg_temp.expect_error($s$select public.get_organizer_dashboard_reviews('this_month','{}',1)$s$,'Invalid review cursor');
end$$;
select set_config('request.jwt.claim.sub','da000000-0000-4000-8000-000000000005',true);
do $$declare d jsonb;begin d:=public.get_organizer_dashboard();
 assert (d->'current'->>'sessions')::int=1 and jsonb_array_length(d->'recent_reviews')=1,'Each host sees only their own analytics';
end$$;
reset role;
insert into public.organizers(profile_id,display_name) values('da000000-0000-4000-8000-000000000004','Empty host');
set local role authenticated;
select set_config('request.jwt.claim.sub','da000000-0000-4000-8000-000000000004',true);
do $$declare d jsonb;begin d:=public.get_organizer_dashboard();
 assert (d->'current'->>'sessions')::int=0 and d->'current'->>'fill_rate' is null and d->'current'->>'average_rating' is null;
 assert d->'next_session'='null'::jsonb and jsonb_array_length(d->'attention')=0 and jsonb_array_length(d->'recent_reviews')=0;
end$$;
reset role;
set local role anon;
select pg_temp.expect_error($s$select public.get_organizer_dashboard()$s$,'permission denied');
select pg_temp.expect_error($s$select public.get_organizer_dashboard_reviews()$s$,'permission denied');
reset role;
rollback;
