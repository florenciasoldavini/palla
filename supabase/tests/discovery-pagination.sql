-- All fixtures roll back. Paging must traverse more than the old 500-result cap.
begin;
insert into public.venues(id,created_by,name,address,latitude,longitude,geocoded_address,geocoded_at)
select ('de100000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'1bce2362-4dcd-47e7-a885-fa55fc7cd773','Page club '||n,'PageTestCity '||n,
 case when n=3 then null else 0 end,case when n=3 then null else n*.01 end,
 case when n=3 then null else 'PageTestCity '||n end,case when n=3 then null else now() end from generate_series(1,3)n;
insert into public.session_series(id,organizer_id,draft_input) values('de200000-0000-4000-8000-000000000001','1bce2362-4dcd-47e7-a885-fa55fc7cd773','{}');
insert into public.sessions(id,organizer_id,series_id,occurrence_date,venue_id,title,capacity,price_minor,starts_at,ends_at,status,visibility,court_coverage)
select ('de300000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'1bce2362-4dcd-47e7-a885-fa55fc7cd773','de200000-0000-4000-8000-000000000001',current_date+n,
 ('de100000-0000-4000-8000-'||lpad((1+n%3)::text,12,'0'))::uuid,'Page QA '||n,4,n%7*1000,
 now()+interval '2 days'+(n%5)*interval '1 hour',now()+interval '2 days'+(n%5)*interval '1 hour'+interval '90 minutes','published',case when n=606 then 'private' else 'public' end,case when n%2=0 then 'covered' else 'uncovered' end from generate_series(1,606)n;

-- Collect the narrow public API as anonymous, compare against independently sorted IDs.
create temporary table page_expected(kind text primary key,ids jsonb);
insert into page_expected
select kind,jsonb_agg(s.id order by case when kind='price' then s.price_minor end,
 case when kind='nearest' then v.longitude end nulls last,s.starts_at,s.id)
from public.sessions s join public.venues v on v.id=s.venue_id cross join unnest(array['soonest','price','nearest']) kind
where s.title like 'Page QA %' and s.visibility='public' group by kind;
grant select on page_expected to anon;
set local role anon;
do $$ declare sort_kind text; x jsonb; cursor jsonb; ids jsonb; pages int;begin
 foreach sort_kind in array array['soonest','price','nearest'] loop
  cursor:=null;ids:='[]'::jsonb;pages:=0;
  loop
   x:=public.discover_sessions_page(p_search=>'Page QA',p_sort=>sort_kind,p_latitude=>0,p_longitude=>0,p_after=>cursor,p_limit=>50);
   assert jsonb_array_length(x->'sessions')<=50,'Bounded page';
   assert not (x::text like '%player_id%' or x::text like '%organizer_id%'),'Public projection';
   ids:=ids||(select coalesce(jsonb_agg(r->'id'),'[]') from jsonb_array_elements(x->'sessions')r);
   pages:=pages+1;cursor:=x->'next_cursor';
   exit when not (x->>'has_more')::boolean;
   assert cursor<>'null'::jsonb and pages<20,format('Cursor advances: sort=%s page=%s cursor=%s',sort_kind,pages,cursor);
  end loop;
  assert pages=13,'Traverses beyond 500';
  assert ids=(select e.ids from page_expected e where e.kind=sort_kind),'Stable complete ordering including ties and null distances';
  assert x->'next_cursor'='null'::jsonb,'No cursor after final page';
 end loop;
 x:=public.discover_sessions_page(p_search=>'Page QA',p_limit=>1);
 cursor:=x->'next_cursor';
 begin perform public.discover_sessions_page(p_search=>'Other search',p_after=>cursor);raise exception 'Accepted different search cursor';exception when invalid_parameter_value then null;end;
 begin perform public.discover_sessions_page(p_search=>'Page QA',p_sort=>'price',p_after=>cursor);raise exception 'Accepted different sort cursor';exception when invalid_parameter_value then null;end;
 begin perform public.discover_sessions_page(p_search=>'Page QA',p_after=>'{}');raise exception 'Accepted empty cursor';exception when invalid_parameter_value then null;end;
 begin perform public.discover_sessions_page(p_limit=>0);raise exception 'Accepted bad size';exception when invalid_parameter_value then null;end;
 begin perform public.discover_sessions_page(p_limit=>101);raise exception 'Accepted unbounded page';exception when invalid_parameter_value then null;end;
 x:=public.discover_sessions_page(p_search=>'Page QA',p_limit=>100,p_bounds=>'{"west":-1,"east":1,"south":-1,"north":1}',p_coverage=>'covered',p_max_price=>1000,p_location=>'Different city');
 assert jsonb_array_length(x->'sessions')>0,'Bounds and advanced filters combine';
 assert not exists(select 1 from jsonb_array_elements(x->'sessions')r where r->>'court_coverage'<>'covered' or (r->>'price_minor')::int>1000 or r->'venue'->>'latitude' is null),'Every result respects all filters';
 assert jsonb_array_length(public.discover_sessions_in_bounds(p_search=>'Page QA')->'sessions')=500,'Old clients keep their response';
 assert jsonb_array_length(public.discover_sessions_page(p_search=>'NoSuchPageFixture')->'sessions')=0,'Empty final page';
end $$;
reset role;
-- A deleted boundary row does not invalidate the next cursor or skip the next item.
do $$ declare first jsonb; second jsonb; next_id text;begin
 first:=public.discover_sessions_page(p_search=>'Page QA',p_limit=>1);
 next_id:=(public.discover_sessions_page(p_search=>'Page QA',p_limit=>2))->'sessions'->1->>'id';
 delete from public.sessions where id=(first->'sessions'->0->>'id')::uuid;
 second:=public.discover_sessions_page(p_search=>'Page QA',p_limit=>1,p_after=>first->'next_cursor');
 assert second->'sessions'->0->>'id'=next_id,'Deletion before boundary does not skip rows';
 assert not has_function_privilege('anon','private.discover_sessions_page(text,text,date,date,integer,text,text,integer,integer,text,text,text,text[],text[],text,double precision,double precision,integer,integer,jsonb,jsonb,integer)','execute'),'Private core inaccessible';
end $$;
rollback;
