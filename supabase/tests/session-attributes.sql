-- Auth/product fixtures and any side effects are rolled back in full.
begin;
create function pg_temp.attribute_rejected(statement text) returns void language plpgsql as $$
begin
 begin execute statement; exception when others then return; end;
 raise exception 'Expected rejection: %',statement;
end $$;
insert into auth.users(id) values('bf000000-0000-4000-8000-000000000001'),('bf000000-0000-4000-8000-000000000002'),('bf000000-0000-4000-8000-000000000003');
insert into public.profiles(id,first_name,onboarding_completed_at) select id,'Attribute QA',now() from auth.users where id::text like 'bf000000-%';
insert into public.organizers(profile_id,display_name) values('bf000000-0000-4000-8000-000000000001','Attribute host A'),('bf000000-0000-4000-8000-000000000002','Attribute host B');
set local role authenticated;
select set_config('request.jwt.claim.sub','bf000000-0000-4000-8000-000000000001',true);
do $$
declare input jsonb; series uuid:='bf100000-0000-4000-8000-000000000001'; sid uuid; later uuid; version timestamptz; v uuid; response jsonb; stamp timestamptz;
begin
 input:=jsonb_build_object('title','Attribute rollback A','venueId','','venueName','Attribute rollback shared club','venueAddress','Rollback only address','courtLabel','','date',to_char(current_date+14,'YYYY-MM-DD'),'lastDate',to_char(current_date+28,'YYYY-MM-DD'),'startTime','19:00','endTime','20:30','repeat','weekly','capacity','4','price','0','description','Attributes QA','courtConfirmed',true,'categoryMode','all','registrationHours','2','cancellationHours','0',
   'sessionAttributes',jsonb_build_array('new_balls','balls_provided','snacks'), 'venueAttributes',jsonb_build_array('free_parking','showers'),'venueAttributesBaseline','[]'::jsonb,'venueAttributesEdited',true);
 perform public.save_organizer_session(series,input,false);
 assert (select count(*) from public.session_series_attributes where series_id=series)=2,'Draft attributes are normalized';
 assert not exists(select 1 from public.organizer_venue_attributes),'Draft saves do not modify venue claims';
 assert (select draft_input->'sessionAttributes' from public.session_series where id=series)='["new_balls","snacks"]'::jsonb;
 select updated_at into version from public.session_series where id=series;
 input:=input||jsonb_build_object('settings',jsonb_build_object('visibility','public','allowed_categories',null,'waitlist_enabled',false,'waitlist_promotion_mode','automatic','waitlist_capacity',null,'registration_opens_minutes_before',null,'registration_closes_minutes_before',null,'cancellation_notice_minutes',null));
 perform public.save_organizer_session(series,input,true,null,'one',version);
 assert (select count(*) from public.sessions where series_id=series)=3;
 assert (select count(*) from public.session_attributes a join public.sessions s on s.id=a.session_id where s.series_id=series)=6,'Every occurrence receives its own copy';
 select id,updated_at,venue_id into sid,version,v from public.sessions where series_id=series order by starts_at limit 1;
 select id into later from public.sessions where series_id=series order by starts_at offset 1 limit 1;
 response:=public.get_public_session_detail(sid);
 assert response->'attributes'='["new_balls","snacks"]'::jsonb;
 assert response->'venue'->'attributes'='["free_parking","showers"]'::jsonb;
 assert not(response::text like '%venueAttributesBaseline%' or response::text like '%organizer_id%');
 -- Lost-response publish retry must not clear selections or repeat writes.
 perform public.save_organizer_session(series,input||jsonb_build_object('sessionAttributes','[]'::jsonb),true);
 assert (select count(*) from public.session_attributes where session_id=sid)=2;
 input:=input||jsonb_build_object('venueId',v,'sessionAttributes',jsonb_build_array('coaching'),'venueAttributesEdited',false);
 perform public.save_organizer_session(series,input,true,sid,'one',version);
 assert (select array_agg(attribute_code order by attribute_code) from public.session_attributes where session_id=sid)=array['coaching'];
 assert (select count(*) from public.session_attributes where session_id=later)=2,'One occurrence does not alter future dates';
 assert (select count(*) from public.session_series_attributes where series_id=series)=2,'One occurrence does not alter series defaults';
 select updated_at into version from public.sessions where id=later;
 input:=jsonb_set(input,'{date}',to_jsonb(to_char(current_date+21,'YYYY-MM-DD')));
 input:=jsonb_set(input,'{sessionAttributes}',jsonb_build_array('drinks'));
 perform public.save_organizer_session(series,input,true,later,'future',version);
 assert (select count(*) from public.session_attributes a join public.sessions s on s.id=a.session_id where s.series_id=series and a.attribute_code='drinks')=2;
 assert (select array_agg(attribute_code) from public.session_series_attributes where series_id=series)=array['drinks'];
 assert (select attribute_code from public.session_attributes where session_id=sid)='coaching';
 select updated_at into version from public.sessions where id=later;
 -- Stale venue edits roll back session changes in the same transaction.
 input:=input||jsonb_build_object('title','Must roll back','venueAttributesEdited',true,'venueAttributesBaseline','[]'::jsonb);
 perform pg_temp.attribute_rejected(format('select public.save_organizer_session(%L,%L,true,%L,''one'',%L)',series,input,later,version));
 assert (select title from public.sessions where id=later)='Attribute rollback A';
 assert (select updated_at from public.sessions where id=later)=version;
 input:=input||jsonb_build_object('title','Attribute rollback A','venueAttributesEdited',false,'sessionAttributes','[]'::jsonb);
 perform public.save_organizer_session(series,input,true,later,'one',version);
 assert not exists(select 1 from public.session_attributes where session_id=later),'Empty selection clears the chosen occurrence';
 -- Legacy clients omit fields, preserving current selections.
 select updated_at into version from public.sessions where id=sid;
 input:=input||jsonb_build_object('date',to_char(current_date+14,'YYYY-MM-DD'));
 input:=input-'sessionAttributes'-'venueAttributes'-'venueAttributesBaseline'-'venueAttributesEdited';
 perform public.save_organizer_session(series,input,true,sid,'one',version);
 assert (select attribute_code from public.session_attributes where session_id=sid)='coaching';
 perform pg_temp.attribute_rejected(format('select public.save_organizer_session(%L,%L,false)','bf100000-0000-4000-8000-000000000099',input||'{"sessionAttributes":["showers"]}'::jsonb));
 perform pg_temp.attribute_rejected(format('select public.save_organizer_session(%L,%L,false)','bf100000-0000-4000-8000-000000000099',input||'{"sessionAttributes":["unknown"]}'::jsonb));
 perform pg_temp.attribute_rejected(format('select public.save_organizer_session(%L,%L,false)','bf100000-0000-4000-8000-000000000099',input||'{"sessionAttributes":["snacks","snacks"]}'::jsonb));
 perform pg_temp.attribute_rejected(format('insert into public.session_attributes(session_id,attribute_code) values(%L,''showers'')',sid));
 assert not exists(select 1 from public.session_series where id='bf100000-0000-4000-8000-000000000099'),'Invalid selections leave no partial draft';
end $$;
select set_config('request.jwt.claim.sub','bf000000-0000-4000-8000-000000000002',true);
do $$declare v uuid; input jsonb;sid uuid;begin
 assert not exists(select 1 from public.organizer_venue_attributes),'Other hosts cannot read claims';
 assert not exists(select 1 from public.session_attributes),'Other hosts cannot read occurrence attributes';
 assert not exists(select 1 from public.session_series_attributes);
 select id into v from public.venues where name='Attribute rollback shared club';
 perform pg_temp.attribute_rejected(format('insert into public.organizer_venue_attributes(organizer_id,venue_id,attribute_code) values(''bf000000-0000-4000-8000-000000000001'',%L,''lockers'')',v));
 input:=jsonb_build_object('title','Attribute rollback B','venueId',v,'venueName','Attribute rollback shared club','venueAddress','Rollback only address','date',to_char(current_date+14,'YYYY-MM-DD'),'lastDate',to_char(current_date+14,'YYYY-MM-DD'),'startTime','19:00','endTime','20:30','repeat','once','capacity','4','price','0','courtConfirmed',true,'categoryMode','all','registrationHours','2','cancellationHours','0',
 'sessionAttributes',jsonb_build_array('spare_rackets'),'venueAttributes',jsonb_build_array('paid_parking','water_dispenser'),'venueAttributesBaseline','[]'::jsonb,'venueAttributesEdited',true);
 perform public.save_organizer_session('bf100000-0000-4000-8000-000000000002',input,true);
 select id into sid from public.sessions where series_id='bf100000-0000-4000-8000-000000000002';
 assert (select array_agg(attribute_code order by attribute_code) from public.organizer_venue_attributes)=array['paid_parking','water_dispenser'];
end$$;
select set_config('request.jwt.claim.sub','bf000000-0000-4000-8000-000000000003',true);
do $$begin
 assert not exists(select 1 from public.organizer_venue_attributes);
 perform pg_temp.attribute_rejected($s$insert into public.attribute_definitions(code,scope) values('fake','session')$s$);
end$$;
reset role;
-- Simulate a past occurrence without bypassing any client write policy.
insert into public.sessions(id,organizer_id,series_id,occurrence_date,venue_id,title,capacity,price_minor,starts_at,ends_at,status,visibility)
select 'bf200000-0000-4000-8000-000000000001','bf000000-0000-4000-8000-000000000001','bf100000-0000-4000-8000-000000000001',current_date-1,id,'Past QA',4,0,now()-interval '3 hours',now()-interval '1 hour','published','public' from public.venues where name='Attribute rollback shared club';
set local role authenticated;
select set_config('request.jwt.claim.sub','bf000000-0000-4000-8000-000000000001',true);
select pg_temp.attribute_rejected($s$insert into public.session_attributes(session_id,attribute_code) values('bf200000-0000-4000-8000-000000000001','snacks')$s$);
reset role;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$declare x jsonb;sid uuid;begin
 assert not has_table_privilege('anon','public.organizer_venue_attributes','select');
 assert not has_table_privilege('anon','public.session_attributes','select');
 -- IDs cannot be discovered from private tables; the fixture knows its target.
 x:=public.get_public_session_detail('bf200000-0000-4000-8000-000000000001');
 assert x->'venue'->'attributes'='["free_parking","showers"]'::jsonb,'Host B did not overwrite host A venue claims';
 assert x->'attributes'='[]'::jsonb,'Empty occurrence has no fabricated inclusions';
end$$;
reset role;
rollback;
