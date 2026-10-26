-- All account, venue and session fixture writes roll back.
begin;
-- Isolated identities generated for this transaction; never reuse real accounts.
select set_config('qa.host_id',gen_random_uuid()::text,true);
select set_config('qa.guest_id',gen_random_uuid()::text,true);
create function pg_temp.qa_host() returns uuid language sql stable as $$ select current_setting('qa.host_id')::uuid $$;
create function pg_temp.qa_guest() returns uuid language sql stable as $$ select current_setting('qa.guest_id')::uuid $$;
insert into auth.users(id) values(pg_temp.qa_host()),(pg_temp.qa_guest());
insert into public.profiles(id,first_name,onboarding_completed_at,category_status,playing_category)
values(pg_temp.qa_host(),'Rollback host',now(),'known',6),(pg_temp.qa_guest(),'Rollback guest',now(),'known',6);
insert into public.organizers(profile_id,display_name) values(pg_temp.qa_host(),'Rollback host');
create function pg_temp.coordinate_rejected(statement text) returns void language plpgsql as $$
begin
 begin execute statement; exception when others then return; end;
 raise exception 'Expected coordinate rejection: %',statement;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub',pg_temp.qa_host()::text,true);
do $$
declare input jsonb; v uuid; result jsonb; sid uuid; version timestamptz;
begin
 input:=jsonb_build_object('title','Coordinate rollback','venueId','','venueName','Coordinate rollback club','venueAddress','Avenida Santa Fe 4000, CoordinateRollbackCity','courtLabel','','date',to_char(current_date+14,'YYYY-MM-DD'),'lastDate',to_char(current_date+14,'YYYY-MM-DD'),'startTime','19:00','endTime','20:30','repeat','once','capacity','4','price','0','description','Coordinates QA','courtConfirmed',true,'categoryMode','all','registrationHours','2','cancellationHours','0',
 'settings',jsonb_build_object('visibility','public','allowed_categories',null,'waitlist_enabled',false,'waitlist_promotion_mode','automatic','waitlist_capacity',null,'registration_opens_minutes_before',null,'registration_closes_minutes_before',120,'cancellation_notice_minutes',0),
 'venueCoordinates',jsonb_build_object('latitude',-34.58,'longitude',-58.42,'address','Avenida Santa Fe 4000, CoordinateRollbackCity'));
 perform public.save_organizer_session('cd100000-0000-4000-8000-000000000001',input,false);
 select updated_at into version from public.session_series where id='cd100000-0000-4000-8000-000000000001';
 perform public.save_organizer_session('cd100000-0000-4000-8000-000000000001',input,true,null,'one',version);
 select venue_id into v from public.session_series where id='cd100000-0000-4000-8000-000000000001';
 assert exists(select 1 from public.venues where id=v and latitude=-34.58 and longitude=-58.42 and geocoded_address=address and geocoded_at is not null),'Publish stores matched coordinates';
 select id into sid from public.sessions where series_id='cd100000-0000-4000-8000-000000000001';
 result:=public.get_public_session_detail(sid);
 assert (result->'venue'->>'latitude')::numeric=-34.58,'Public detail exposes coordinates';
 result:=public.discover_sessions('CoordinateRollbackCity');
 assert (result->'sessions'->0->'venue'->>'longitude')::numeric=-58.42,'Discovery exposes coordinates';
 perform pg_temp.coordinate_rejected(format('update public.venues set latitude=0 where id=%L',v));
 perform private.fill_venue_coordinates(v,jsonb_build_object('latitude',0,'longitude',0,'address','Avenida Santa Fe 4000, CoordinateRollbackCity'));
 assert exists(select 1 from public.venues where id=v and latitude=-34.58),'Existing coordinates cannot be overwritten';
 perform pg_temp.coordinate_rejected(format('select private.fill_venue_coordinates(%L,%L::jsonb)',v,'{"latitude":91,"longitude":0,"address":"x"}'));

 -- An identical venue reused by another organizer cannot have its pin overwritten.
end $$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub',pg_temp.qa_guest()::text,true);
do $$ begin
 perform pg_temp.coordinate_rejected('update public.venues set latitude=0,longitude=0');
end $$;
reset role;
-- Check database constraints and address invalidation without broadening client grants.
do $$ declare v uuid; begin
 select venue_id into v from public.session_series where id='cd100000-0000-4000-8000-000000000001';
 perform pg_temp.coordinate_rejected(format('update public.venues set latitude=91 where id=%L',v));
 perform pg_temp.coordinate_rejected('insert into public.venues(created_by,google_place_id,latitude,longitude,geocoded_address,geocoded_at) values (pg_temp.qa_host(),''coordinate-null-address'',0,0,''Snapshot'',now())');
 perform pg_temp.coordinate_rejected(format('update public.venues set longitude=''NaN''::float8 where id=%L',v));
 perform pg_temp.coordinate_rejected(format('update public.venues set longitude=null where id=%L',v));
 update public.venues set address='Changed address' where id=v;
 assert exists(select 1 from public.venues where id=v and latitude is null and longitude is null and geocoded_address is null and geocoded_at is null),'Address edits clear stale coordinates';
end $$;
-- Give the isolated guest organizer access to test ownership.
insert into public.organizers(profile_id,display_name) values(pg_temp.qa_guest(),'Coordinate rollback host B') on conflict(profile_id) do nothing;
set local role authenticated;
select set_config('request.jwt.claim.sub',pg_temp.qa_guest()::text,true);
do $$ declare v uuid;begin
 select venue_id into v from public.session_series where id='cd100000-0000-4000-8000-000000000001';
 -- The second organizer cannot read the first organizer's series. Obtain the public venue by its test name.
 select id into v from public.venues where name='Coordinate rollback club';
 perform private.fill_venue_coordinates(v,jsonb_build_object('latitude',0,'longitude',0,'address','Changed address'));
 assert exists(select 1 from public.venues where id=v and latitude is null),'Another organizer cannot fill this venue';
end $$;
reset role;
set local role anon;
do $$ declare response jsonb;begin
 response:=public.discover_sessions('Coordinate rollback club');
 assert response->'sessions'->0->'venue'->'latitude'='null'::jsonb,'Anonymous projection supports missing coordinates';
 perform pg_temp.coordinate_rejected('update public.venues set latitude=0');
end $$;
reset role;
rollback;
