-- Radius fixtures are rolled back; no registrations or notifications are written.
begin;
insert into public.venues(id,created_by,name,address,latitude,longitude,geocoded_address,geocoded_at)
select ('dc100000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'1bce2362-4dcd-47e7-a885-fa55fc7cd773','Radius club '||n,
 case when n=1 then 'OutsideSavedCity' else 'RadiusTestCity' end,
 case when n=7 then null else 0 end,
 case when n=7 then null else degrees((case n when 1 then 4999.99 when 2 then 5000.01 when 3 then 9999.99 when 4 then 10000.01 when 5 then 24999.99 else 25000.01 end)/6371000.0) end,
 case when n=7 then null when n=1 then 'OutsideSavedCity' else 'RadiusTestCity' end,
 case when n=7 then null else now() end from generate_series(1,7)n;
insert into public.session_series(id,organizer_id,draft_input) values('dc200000-0000-4000-8000-000000000001','1bce2362-4dcd-47e7-a885-fa55fc7cd773','{}');
insert into public.sessions(id,organizer_id,series_id,occurrence_date,venue_id,title,capacity,price_minor,starts_at,ends_at,status,visibility,court_coverage)
select ('dc300000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'1bce2362-4dcd-47e7-a885-fa55fc7cd773','dc200000-0000-4000-8000-000000000001',current_date+n,
 ('dc100000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'Radius QA '||n,4,8000-n*1000,now()+n*interval '1 day',now()+n*interval '1 day'+interval '90 minutes','published','public',case when n=1 then 'covered' else 'uncovered' end from generate_series(1,7)n;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$ declare x jsonb;begin
 x:=public.discover_sessions_nearby(p_search=>'Radius QA',p_location=>'RadiusTestCity');
 assert jsonb_array_length(x->'sessions')=6,'Without radius, saved city and unknown coordinates still work';
 assert x=public.discover_sessions('RadiusTestCity','Radius QA'),'Old client defaults preserved';
 x:=public.discover_sessions_nearby(p_search=>'Radius QA',p_location=>'RadiusTestCity',p_radius_km=>5,p_latitude=>0,p_longitude=>0);
 assert jsonb_array_length(x->'sessions')=1 and x->'sessions'->0->>'title'='Radius QA 1','5 km boundary and radius replaces saved city';
 assert (x->'sessions'->0->>'distance_m')::double precision between 4999.98 and 5000,'Distance projected for Soonest with radius';
 x:=public.discover_sessions_nearby(p_search=>'Radius QA',p_radius_km=>10,p_latitude=>0,p_longitude=>0,p_sort=>'price');
 assert jsonb_array_length(x->'sessions')=3 and x->'sessions'->0->>'title'='Radius QA 3','10 km boundary and price sorting';
 x:=public.discover_sessions_nearby(p_search=>'Radius QA',p_radius_km=>25,p_latitude=>0,p_longitude=>0,p_sort=>'nearest');
 assert jsonb_array_length(x->'sessions')=5 and x->'sessions'->0->>'title'='Radius QA 1','25 km boundary, nearest and unknown coordinates excluded';
 x:=public.discover_sessions_nearby(p_search=>'Radius QA',p_radius_km=>25,p_latitude=>0,p_longitude=>0,p_coverage=>'covered');
 assert jsonb_array_length(x->'sessions')=1,'Radius combines with coverage';
 assert not(x::text like '%organizer_id%' or x::text like '%player_id%' or x::text like '%draft_input%'),'No private fields';
 begin perform public.discover_sessions_nearby(p_radius_km=>0,p_latitude=>0,p_longitude=>0); raise exception 'Zero radius accepted'; exception when invalid_parameter_value then null; end;
 begin perform public.discover_sessions_nearby(p_radius_km=>50,p_latitude=>0,p_longitude=>0); raise exception 'Unsupported radius accepted'; exception when invalid_parameter_value then null; end;
 begin perform public.discover_sessions_nearby(p_radius_km=>5); raise exception 'Missing origin accepted'; exception when invalid_parameter_value then null; end;
 begin perform public.discover_sessions_nearby(p_radius_km=>5,p_latitude=>0); raise exception 'Incomplete origin accepted'; exception when invalid_parameter_value then null; end;
end $$;
reset role;
-- 501 earlier, outside-radius sessions cannot hide a later matching occurrence.
insert into public.sessions(organizer_id,series_id,occurrence_date,venue_id,title,capacity,price_minor,starts_at,ends_at,status,visibility)
select '1bce2362-4dcd-47e7-a885-fa55fc7cd773','dc200000-0000-4000-8000-000000000001',current_date+10+n,
 ('dc100000-0000-4000-8000-'||lpad((case when n=502 then 1 else 6 end)::text,12,'0'))::uuid,
 'Radius limit '||n,4,1000,now()+(10+n)*interval '1 day',now()+(10+n)*interval '1 day'+interval '90 minutes','published','public' from generate_series(1,502)n;
set local role anon;
do $$ declare x jsonb;begin
 x:=public.discover_sessions_nearby(p_search=>'Radius limit',p_radius_km=>5,p_latitude=>0,p_longitude=>0);
 assert jsonb_array_length(x->'sessions')=1 and x->'sessions'->0->>'title'='Radius limit 502','Radius filters before LIMIT';
 assert not (x->>'has_more')::boolean,'has_more counts only radius matches';
end $$;
reset role;
do $$ begin
 assert not has_function_privilege('anon','private.discover_sessions_in_radius(text,text,date,date,integer,text,text,integer,integer,text,text,text,text[],text[],text,double precision,double precision,integer)','execute'),'Private core inaccessible';
end $$;
rollback;
