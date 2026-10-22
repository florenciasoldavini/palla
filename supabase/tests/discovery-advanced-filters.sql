-- Rollback-only tests. No real notifications/registrations are created.
begin;
insert into public.venues(id,created_by,name,address,court_coverage) values
 ('da100000-0000-4000-8000-000000000001','1bce2362-4dcd-47e7-a885-fa55fc7cd773','Advanced Filter QA','AdvancedFilterCity',array['covered','uncovered']);
insert into public.session_series(id,organizer_id,draft_input) values
 ('da200000-0000-4000-8000-000000000001','1bce2362-4dcd-47e7-a885-fa55fc7cd773','{}');
insert into public.sessions(id,organizer_id,series_id,occurrence_date,venue_id,title,capacity,price_minor,currency,starts_at,ends_at,status,visibility,court_coverage,participant_gender_policy)
 select ('da300000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'1bce2362-4dcd-47e7-a885-fa55fc7cd773','da200000-0000-4000-8000-000000000001',current_date+n,'da100000-0000-4000-8000-000000000001','Filter QA '||n,4,
 case n when 1 then 0 when 2 then 1000 when 3 then 2000 else 3000 end,'ARS',
 now()+n*interval '1 day',now()+n*interval '1 day'+interval '90 minutes','published','public',
 case n when 1 then 'covered' when 2 then 'uncovered' else null end,
 case n when 1 then 'women_only' when 2 then 'men_only' else 'all' end from generate_series(1,4)n;
insert into public.session_attributes(session_id,attribute_code) values
 ('da300000-0000-4000-8000-000000000001','new_balls'),('da300000-0000-4000-8000-000000000001','coaching'),
 ('da300000-0000-4000-8000-000000000002','balls_provided');
-- Another host's amenities must not count for this host.
insert into public.organizer_venue_attributes(organizer_id,venue_id,attribute_code) values
 ('1bce2362-4dcd-47e7-a885-fa55fc7cd773','da100000-0000-4000-8000-000000000001','showers'),
 ('f8cba57d-ee0a-46a6-b3c5-f1aca57c9c26','da100000-0000-4000-8000-000000000001','free_parking');
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$ declare x jsonb; begin
 assert jsonb_array_length(public.discover_sessions_filtered('AdvancedFilterCity')->'sessions')=4,'Default includes all currencies/unknown coverage';
 assert public.discover_sessions_filtered('AdvancedFilterCity')=public.discover_sessions('AdvancedFilterCity'),'Legacy RPC stays compatible';
 assert jsonb_array_length(public.discover_sessions_filtered(p_location=>'AdvancedFilterCity',p_max_price=>0)->'sessions')=1,'Zero means free';
 x:=public.discover_sessions_filtered(p_location=>'AdvancedFilterCity',p_min_price=>1000,p_max_price=>2000);
 assert jsonb_array_length(x->'sessions')=2,'Inclusive price bounds';
 assert jsonb_array_length(public.discover_sessions_filtered(p_location=>'AdvancedFilterCity',p_min_price=>0,p_currency=>'USD')->'sessions')=0,'Price never mixes currencies';
 assert jsonb_array_length(public.discover_sessions_filtered(p_location=>'AdvancedFilterCity',p_coverage=>'covered')->'sessions')=1,'Uses occurrence roof, not mixed venue';
 assert jsonb_array_length(public.discover_sessions_filtered(p_location=>'AdvancedFilterCity',p_coverage=>'uncovered')->'sessions')=1,'Unknown roof excluded';
 assert jsonb_array_length(public.discover_sessions_filtered(p_location=>'AdvancedFilterCity',p_gender=>'all')->'sessions')=2,'All genders is exact policy';
 assert jsonb_array_length(public.discover_sessions_filtered(p_location=>'AdvancedFilterCity',p_gender=>'men_only')->'sessions')=1,'Men only';
 assert jsonb_array_length(public.discover_sessions_filtered(p_location=>'AdvancedFilterCity',p_session_attributes=>array['balls_provided'])->'sessions')=2,'New balls imply balls provided';
 assert jsonb_array_length(public.discover_sessions_filtered(p_location=>'AdvancedFilterCity',p_session_attributes=>array['balls_provided','coaching'])->'sessions')=1,'All selected session attributes';
 assert jsonb_array_length(public.discover_sessions_filtered(p_location=>'AdvancedFilterCity',p_venue_attributes=>array['showers'])->'sessions')=4,'Host venue facilities';
 assert jsonb_array_length(public.discover_sessions_filtered(p_location=>'AdvancedFilterCity',p_venue_attributes=>array['showers','free_parking'])->'sessions')=0,'No other host amenities';
 assert jsonb_array_length(public.discover_sessions_filtered(p_location=>'AdvancedFilterCity',p_max_price=>0,p_coverage=>'covered',p_gender=>'women_only',p_session_attributes=>array['new_balls','coaching'],p_venue_attributes=>array['showers'])->'sessions')=1,'All filter groups combine';
 begin perform public.discover_sessions_filtered(p_min_price=>20,p_max_price=>10); raise exception 'Accepted reversed price'; exception when invalid_parameter_value then null; end;
 begin perform public.discover_sessions_filtered(p_session_attributes=>array['showers']); raise exception 'Accepted wrong scope'; exception when invalid_parameter_value then null; end;
 begin perform public.discover_sessions_filtered(p_coverage=>'indoor'); raise exception 'Accepted unknown roof'; exception when invalid_parameter_value then null; end;
end $$;
reset role;
do $$ begin
 assert not has_function_privilege('anon','private.discover_sessions_filtered(text,text,date,date,integer,text,text,integer,integer,text,text,text,text[],text[])','execute'),'Core not exposed';
end $$;
-- Only the last of 502 sessions matches: catches accidental filtering after LIMIT.
insert into public.sessions(organizer_id,series_id,occurrence_date,venue_id,title,capacity,price_minor,starts_at,ends_at,status,visibility,court_coverage)
 select '1bce2362-4dcd-47e7-a885-fa55fc7cd773','da200000-0000-4000-8000-000000000001',current_date+10+n,'da100000-0000-4000-8000-000000000001','Limit QA',4,0,now()+(10+n)*interval '1 day',now()+(10+n)*interval '1 day'+interval '90 minutes','published','public',case when n=502 then 'covered' else 'uncovered' end from generate_series(1,502)n;
set local role anon;
do $$ declare x jsonb; begin
 x:=public.discover_sessions_filtered(p_location=>'AdvancedFilterCity',p_search=>'Limit QA',p_coverage=>'covered');
 assert jsonb_array_length(x->'sessions')=1,'Advanced filters run before result limit';
 assert not (x->>'has_more')::boolean,'has_more counts matches';
 x:=public.discover_sessions_filtered(p_location=>'AdvancedFilterCity',p_search=>'Limit QA');
 assert jsonb_array_length(x->'sessions')=500 and (x->>'has_more')::boolean,'Unfiltered page bounded';
end $$;
reset role;
rollback;
