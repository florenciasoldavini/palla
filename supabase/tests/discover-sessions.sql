-- Rollback-only discovery eligibility, filters and authorization regression.
begin;
insert into public.venues(id,created_by,name,address) values('df100000-0000-4000-8000-000000000001','1bce2362-4dcd-47e7-a885-fa55fc7cd773','Discover SQL QA','DiscoverTestCity');
insert into public.session_series(id,organizer_id,draft_input) values('df200000-0000-4000-8000-000000000001','1bce2362-4dcd-47e7-a885-fa55fc7cd773','{}');
insert into public.sessions(id,organizer_id,series_id,occurrence_date,venue_id,title,capacity,price_minor,starts_at,ends_at,status,visibility,waitlist_enabled,waitlist_capacity,allowed_categories,cancelled_at,completed_at)
select ('df300000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'1bce2362-4dcd-47e7-a885-fa55fc7cd773','df200000-0000-4000-8000-000000000001',current_date+n,'df100000-0000-4000-8000-000000000001','Discovery QA '||n,1,1000,case when n=8 then now()-interval '1 hour' else now()+n*interval '1 day' end,case when n=8 then now()+interval '30 minutes' else now()+n*interval '1 day'+interval '90 minutes' end,case when n=7 then 'cancelled' when n=9 then 'completed' else 'published' end,case when n=2 then 'private' else 'public' end,n in (4,5),1,array[6,7],case when n=7 then now() end,case when n=9 then now() end from generate_series(1,10)n;
update public.sessions set registration_closes_at=now() where id='df300000-0000-4000-8000-000000000003';
update public.sessions set registration_opens_at=now()+interval '1 day' where id='df300000-0000-4000-8000-000000000006';
insert into public.registrations(session_id,player_id,status,confirmed_at) select id,'f8cba57d-ee0a-46a6-b3c5-f1aca57c9c26','confirmed',now() from public.sessions where id in ('df300000-0000-4000-8000-000000000004','df300000-0000-4000-8000-000000000005','df300000-0000-4000-8000-000000000010');
insert into public.registrations(session_id,player_id,status) values('df300000-0000-4000-8000-000000000005','1bce2362-4dcd-47e7-a885-fa55fc7cd773','waitlisted');
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$ declare x jsonb; begin
 x:=public.discover_sessions('DiscoverTestCity');
 assert jsonb_array_length(x->'sessions')=2,'Only open session and available waitlist should be discoverable';
 assert x->'sessions'->0->>'title'='Discovery QA 1','Chronological order';
 assert x->'sessions'->1->>'title'='Discovery QA 4','Waitlist space is joinable';
 assert not(x::text like '%player_id%' or x::text like '%organizer_id%' or x::text like '%draft_input%'),'Private fields must not leak';
 assert (x->'sessions'->0->'viewer_registration')='null'::jsonb;
 assert jsonb_array_length(public.discover_sessions('DiscoverTestCity','QA 1')->'sessions')=1,'Literal title search';
 assert jsonb_array_length(public.discover_sessions('DiscoverTestCity','',null,null,2)->'sessions')=0,'Category filter';
 assert jsonb_array_length(public.discover_sessions('DiscoverTestCity','',null,null,6,'any','spots')->'sessions')=1,'Spots filter';
 assert jsonb_array_length(public.discover_sessions('DiscoverTestCity','',null,null,null,'any','waitlist')->'sessions')=1,'Waitlist filter';
 assert jsonb_array_length(public.discover_sessions('DiscoverTestCity','',null,null,null,'any','all')->'sessions')=4,'All includes full sessions';
 assert jsonb_array_length(public.discover_sessions('DiscoverTestCity','',((now() at time zone 'America/Argentina/Buenos_Aires')::date+2),((now() at time zone 'America/Argentina/Buenos_Aires')::date+4))->'sessions')=1,'Inclusive occurrence-local date range';
 assert jsonb_array_length(public.discover_sessions('DiscoverTestCity','%')->'sessions')=0,'Search treats percent literally';
 assert not has_schema_privilege('anon','private','usage'),'Private schema remains closed';
 assert not has_table_privilege('anon','public.registrations','select'),'No base roster access';
end $$;

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','f8cba57d-ee0a-46a6-b3c5-f1aca57c9c26',true);
do $$ declare x jsonb; begin
 x:=public.discover_sessions('DiscoverTestCity');
 assert jsonb_array_length(x->'sessions')=4,'Own confirmed full sessions remain visible';
 assert x->'sessions'->1->>'viewer_registration'='confirmed','Only viewer status';
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','1bce2362-4dcd-47e7-a885-fa55fc7cd773',true);
do $$ declare x jsonb; begin
 x:=public.discover_sessions('DiscoverTestCity');
 assert jsonb_array_length(x->'sessions')=4,'Host sees own full public sessions but not private or closed';
 assert (x->'sessions'->0->>'viewer_is_host')::boolean;
end $$;
reset role;
rollback;
