-- Rollback-only ranking/authorization and pre-limit regression tests.
begin;
insert into public.venues(id,created_by,name,address,latitude,longitude,geocoded_address,geocoded_at) values
 ('db100000-0000-4000-8000-000000000001','1bce2362-4dcd-47e7-a885-fa55fc7cd773','Far club','SortingTestCity',0,1,'SortingTestCity',now()),
 ('db100000-0000-4000-8000-000000000002','1bce2362-4dcd-47e7-a885-fa55fc7cd773','Near club','SortingTestCity',0,0.1,'SortingTestCity',now()),
 ('db100000-0000-4000-8000-000000000003','1bce2362-4dcd-47e7-a885-fa55fc7cd773','Unknown club','SortingTestCity',null,null,null,null);
insert into public.session_series(id,organizer_id,draft_input) values('db200000-0000-4000-8000-000000000001','1bce2362-4dcd-47e7-a885-fa55fc7cd773','{}');
insert into public.sessions(id,organizer_id,series_id,occurrence_date,venue_id,title,capacity,price_minor,starts_at,ends_at,status,visibility)
 select ('db300000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'1bce2362-4dcd-47e7-a885-fa55fc7cd773','db200000-0000-4000-8000-000000000001',current_date+n,
 ('db100000-0000-4000-8000-'||lpad((case when n=4 then 2 else n end)::text,12,'0'))::uuid,
 'Sort QA '||n,4,case when n=3 then 0 when n=1 then 3000 else 1000 end,now()+n*interval '1 day',now()+n*interval '1 day'+interval '90 minutes','published','public' from generate_series(1,4)n;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$ declare x jsonb; titles text[];begin
 x:=public.discover_sessions_ranked(p_location=>'SortingTestCity');
 assert x=public.discover_sessions('SortingTestCity'),'Original clients keep Soonest';
 select array_agg(item->>'title' order by n) into titles from jsonb_array_elements(x->'sessions') with ordinality t(item,n);
 assert titles=array['Sort QA 1','Sort QA 2','Sort QA 3','Sort QA 4'],'Soonest';
 x:=public.discover_sessions_ranked(p_location=>'SortingTestCity',p_sort=>'price');
 select array_agg(item->>'title' order by n) into titles from jsonb_array_elements(x->'sessions') with ordinality t(item,n);
 assert titles=array['Sort QA 3','Sort QA 2','Sort QA 4','Sort QA 1'],'Lowest price incl free and deterministic time tiebreak';
 x:=public.discover_sessions_ranked(p_location=>'SortingTestCity',p_sort=>'nearest',p_latitude=>0,p_longitude=>0);
 select array_agg(item->>'title' order by n) into titles from jsonb_array_elements(x->'sessions') with ordinality t(item,n);
 assert titles=array['Sort QA 2','Sort QA 4','Sort QA 1','Sort QA 3'],'Nearest incl zero origin, unknown last and time tie';
 assert abs((x->'sessions'->0->>'distance_m')::numeric-11119.49)<1,'Great circle distance in meters';
 assert x->'sessions'->3->'distance_m'='null'::jsonb,'Unknown distance stays null';
 assert not(x::text like '%organizer_id%' or x::text like '%player_id%' or x::text like '%draft_input%'),'No private data leakage';
 x:=public.discover_sessions_ranked(p_location=>'SortingTestCity',p_sort=>'price',p_min_price=>1000,p_max_price=>1000);
 assert jsonb_array_length(x->'sessions')=2,'Ranking respects filters';
 begin perform public.discover_sessions_ranked(p_sort=>'nearest'); raise exception 'Missing origin accepted'; exception when invalid_parameter_value then null; end;
 begin perform public.discover_sessions_ranked(p_latitude=>91,p_longitude=>0); raise exception 'Invalid latitude'; exception when invalid_parameter_value then null; end;
 begin perform public.discover_sessions_ranked(p_latitude=>0); raise exception 'Incomplete origin'; exception when invalid_parameter_value then null; end;
 begin perform public.discover_sessions_ranked(p_latitude=>'NaN',p_longitude=>0); raise exception 'NaN accepted'; exception when invalid_parameter_value then null; end;
 begin perform public.discover_sessions_ranked(p_sort=>'popular'); raise exception 'Invalid sort'; exception when invalid_parameter_value then null; end;
end $$;
reset role;
-- More than one page: the cheapest/nearest occurrence must not be truncated first.
insert into public.sessions(organizer_id,series_id,occurrence_date,venue_id,title,capacity,price_minor,starts_at,ends_at,status,visibility)
 select '1bce2362-4dcd-47e7-a885-fa55fc7cd773','db200000-0000-4000-8000-000000000001',current_date+10+n,
 ('db100000-0000-4000-8000-'||lpad((case when n=502 then 2 else 1 end)::text,12,'0'))::uuid,
 'Sort limit '||n,4,case when n=502 then 0 else 5000 end,now()+(10+n)*interval '1 day',now()+(10+n)*interval '1 day'+interval '90 minutes','published','public' from generate_series(1,502)n;
set local role anon;
do $$ declare x jsonb;begin
 x:=public.discover_sessions_ranked(p_location=>'SortingTestCity',p_search=>'Sort limit',p_sort=>'price');
 assert x->'sessions'->0->>'title'='Sort limit 502','Price ranks before LIMIT';
 assert jsonb_array_length(x->'sessions')=500 and (x->>'has_more')::boolean,'Bounded ranked page';
 x:=public.discover_sessions_ranked(p_location=>'SortingTestCity',p_search=>'Sort limit',p_sort=>'nearest',p_latitude=>0,p_longitude=>0);
 assert x->'sessions'->0->>'title'='Sort limit 502','Distance ranks before LIMIT';
end $$;
reset role;
do $$ begin
 assert not has_function_privilege('anon','private.discover_sessions_ranked(text,text,date,date,integer,text,text,integer,integer,text,text,text,text[],text[],text,double precision,double precision)','execute'),'Private core inaccessible';
end $$;
rollback;
