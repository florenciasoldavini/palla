-- No fixture persists; backend bounds must apply before the result limit.
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
do $$ declare x jsonb; bad jsonb;begin
 x:=public.discover_sessions_in_bounds(p_bounds=>'{"west":-0.05,"east":0.05,"south":-0.05,"north":0.05}',p_search=>'Radius QA',p_location=>'Different city',p_city_id=>3435910);
 assert jsonb_array_length(x->'sessions')=2,'Bounds override city and text area, unknown coordinates excluded';
 x:=public.discover_sessions_in_bounds(p_bounds=>'{"west":-0.05,"east":0.05,"south":-0.05,"north":0.05}',p_search=>'Radius QA',p_sort=>'price',p_coverage=>'covered');
 assert jsonb_array_length(x->'sessions')=1 and x->'sessions'->0->>'title'='Radius QA 1','Bounds combine with filters and sorting';
 assert not (x::text like '%organizer_id%' or x::text like '%player_id%'),'Public projection only';
 assert public.discover_sessions_in_bounds(p_search=>'Radius QA')=public.discover_sessions_by_city(p_search=>'Radius QA'),'Null bounds preserve list behavior';
 foreach bad in array array['[]'::jsonb,'{}'::jsonb,'{"west":0,"east":1,"south":null,"north":1}'::jsonb,'{"west":0,"east":1,"south":3,"north":1}'::jsonb,'{"west":-181,"east":1,"south":0,"north":1}'::jsonb,'{"west":0,"east":0,"south":0,"north":1}'::jsonb] loop
  begin perform public.discover_sessions_in_bounds(p_bounds=>bad);raise exception 'Accepted invalid bounds: %',bad;exception when invalid_parameter_value then null;end;
 end loop;
end $$;
reset role;
-- 501 earlier, outside-radius sessions cannot hide a later matching occurrence.
insert into public.sessions(organizer_id,series_id,occurrence_date,venue_id,title,capacity,price_minor,starts_at,ends_at,status,visibility)
select '1bce2362-4dcd-47e7-a885-fa55fc7cd773','dc200000-0000-4000-8000-000000000001',current_date+10+n,
 ('dc100000-0000-4000-8000-'||lpad((case when n=502 then 1 else 6 end)::text,12,'0'))::uuid,
 'Radius limit '||n,4,1000,now()+(10+n)*interval '1 day',now()+(10+n)*interval '1 day'+interval '90 minutes','published','public' from generate_series(1,502)n;

set local role anon;
do $$ declare x jsonb;begin
 x:=public.discover_sessions_in_bounds(p_search=>'Radius limit',p_bounds=>'{"west":-0.05,"east":0.05,"south":-0.05,"north":0.05}');
 assert jsonb_array_length(x->'sessions')=1 and x->'sessions'->0->>'title'='Radius limit 502','Map bounds filter before 500 limit';
 assert not (x->>'has_more')::boolean,'Only viewport matches count toward limit';
end $$;
reset role;
update public.venues set longitude=case when name='Radius club 1' then 179.8 else -179.8 end where name in ('Radius club 1','Radius club 2');
set local role anon;
do $$ declare x jsonb;begin
 x:=public.discover_sessions_in_bounds(p_search=>'Radius QA',p_bounds=>'{"west":170,"east":-170,"south":-1,"north":1}');
 assert jsonb_array_length(x->'sessions')=2,'Antimeridian matches both sides';
end $$;
reset role;
update public.sessions set visibility='private' where title='Radius QA 1';
set local role anon;
do $$ declare x jsonb;begin
 x:=public.discover_sessions_in_bounds(p_search=>'Radius QA',p_bounds=>'{"west":170,"east":-170,"south":-1,"north":1}');
 assert jsonb_array_length(x->'sessions')=1 and x->'sessions'->0->>'title'='Radius QA 2','Private sessions stay private';
end $$;
reset role;
do $$ begin
 assert not has_function_privilege('anon','private.discover_sessions_in_bounds(text,text,date,date,integer,text,text,integer,integer,text,text,text,text[],text[],text,double precision,double precision,integer,integer,jsonb)','execute'),'Private core inaccessible';
end $$;
rollback;
