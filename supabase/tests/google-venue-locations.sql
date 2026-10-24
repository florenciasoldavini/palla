-- Run after the Google location migration; all fixture writes roll back.
-- Uses the same two existing QA identities as venue-coordinates.sql.
begin;
create function pg_temp.google_rejected(statement text) returns void language plpgsql as $$
begin
 begin execute statement; exception when others then return; end;
 raise exception 'Expected Google location rejection: %',statement;
end $$;
-- Trusted Edge write, finite coordinates, durable place identity, bounded TTL.
do $$ declare ref uuid; v uuid; begin
 ref:=public.cache_google_place_location('1bce2362-4dcd-47e7-a885-fa55fc7cd773','qa-google-location','Google coordinate rollback address',-34.58,-58.42);
 assert exists(select 1 from private.google_place_locations where reference=ref and expires_at=fetched_at+interval '29 days'),'Google cache has bounded expiry';
 perform pg_temp.google_rejected($q$select public.cache_google_place_location('1bce2362-4dcd-47e7-a885-fa55fc7cd773','qa-invalid','Invalid',91,0)$q$);
 insert into public.venues(created_by,google_place_id,name,address) values('1bce2362-4dcd-47e7-a885-fa55fc7cd773','qa-business-place','Google coordinate rollback club','Google coordinate rollback address') returning id into v;
 perform set_config('qa.google_ref',ref::text,true); perform set_config('qa.google_venue',v::text,true);
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','1bce2362-4dcd-47e7-a885-fa55fc7cd773',true);
do $$ declare ref uuid:=current_setting('qa.google_ref')::uuid; v uuid:=current_setting('qa.google_venue')::uuid; begin
 perform pg_temp.google_rejected('select * from private.google_place_locations');
 perform pg_temp.google_rejected($q$insert into public.venues(created_by,name,address,coordinate_provider,google_address_place_id) values('1bce2362-4dcd-47e7-a885-fa55fc7cd773','Forged Google venue','Forged address','google','forged-id')$q$);
 perform pg_temp.google_rejected($q$select public.cache_google_place_location('1bce2362-4dcd-47e7-a885-fa55fc7cd773','forged','Forged',0,0)$q$);
 perform pg_temp.google_rejected($q$select public.claim_google_venue_refresh('forged')$q$);
 perform private.fill_venue_coordinates(v,jsonb_build_object('reference',ref,'latitude',0,'longitude',0));
 assert exists(select 1 from public.venues where id=v and latitude=-34.58 and longitude=-58.42 and google_address_place_id='qa-google-location' and google_place_id='qa-business-place' and coordinate_provider='google'),'Only verified provider coordinates are used';
 assert exists(select 1 from public.venues where id=v and google_place_id='qa-business-place'),'Address selection preserves the business identity used for photos';
end $$;
reset role;
-- Different clubs can share Google's address ID without sharing business identity.
do $$ declare second uuid; begin
 insert into public.venues(created_by,name,address) values('1bce2362-4dcd-47e7-a885-fa55fc7cd773','Other club at the same address','Google coordinate rollback address') returning id into second;
 perform set_config('request.jwt.claim.sub','1bce2362-4dcd-47e7-a885-fa55fc7cd773',true);
 perform private.fill_venue_coordinates(second,jsonb_build_object('reference',current_setting('qa.google_ref')));
 assert (select count(*) from public.venues where google_address_place_id='qa-google-location')=2,'A shared address must not merge clubs';
end $$;
-- The full publisher exists in Supabase; the isolated local harness deliberately
-- stubs only the schema dependencies, so this integration phase is skipped there.
select set_config('qa.google_publish_ref',public.cache_google_place_location('1bce2362-4dcd-47e7-a885-fa55fc7cd773','qa-google-publisher','Google publisher rollback address',-34.58,-58.42)::text,true);
set local role authenticated;
select set_config('request.jwt.claim.sub','1bce2362-4dcd-47e7-a885-fa55fc7cd773',true);
do $$ declare input jsonb; version timestamptz; v uuid; sid uuid; begin
 if to_regprocedure('public.save_organizer_session(uuid,jsonb,boolean,uuid,text,timestamptz)') is not null then
  input:=jsonb_build_object('title','Google publisher rollback','venueId','','venueName','Google publisher rollback club','venueAddress','Google publisher rollback address','venueAddressPlaceId','qa-google-publisher','courtLabel','','date',to_char(current_date+14,'YYYY-MM-DD'),'lastDate',to_char(current_date+14,'YYYY-MM-DD'),'startTime','19:00','endTime','20:30','repeat','once','capacity','4','price','0','description','Google coordinates QA','courtConfirmed',true,'categoryMode','all','registrationHours','2','cancellationHours','0',
   'settings',jsonb_build_object('visibility','public','allowed_categories',null,'waitlist_enabled',false,'waitlist_promotion_mode','automatic','waitlist_capacity',null,'registration_opens_minutes_before',null,'registration_closes_minutes_before',120,'cancellation_notice_minutes',0),
   'venueCoordinates',jsonb_build_object('reference',current_setting('qa.google_publish_ref')));
  perform public.save_organizer_session('cd200000-0000-4000-8000-000000000001',input,false);
  select updated_at into version from public.session_series where id='cd200000-0000-4000-8000-000000000001';
  perform public.save_organizer_session('cd200000-0000-4000-8000-000000000001',input,true,null,'one',version);
  select venue_id into v from public.session_series where id='cd200000-0000-4000-8000-000000000001';
  assert exists(select 1 from public.venues where id=v and google_address_place_id='qa-google-publisher' and latitude=-34.58 and google_place_id is null),'Publishing saves verified address coordinates without inventing business identity';
  assert (select draft_input->'venueCoordinates'->'latitude' is null from public.session_series where id='cd200000-0000-4000-8000-000000000001'),'Durable session draft does not contain Google coordinate copies';
  select id into sid from public.sessions where series_id='cd200000-0000-4000-8000-000000000001';
  assert (public.get_public_session_detail(sid)->'venue'->>'latitude')::numeric=-34.58,'Public detail exposes the published Google coordinates';
 end if;
end $$;
reset role;
-- A reference from another organizer is unusable, even if the UUID is known.
insert into public.organizers(profile_id,display_name) values('f8cba57d-ee0a-46a6-b3c5-f1aca57c9c26','Google coordinate rollback B') on conflict(profile_id) do nothing;
set local role authenticated;
select set_config('request.jwt.claim.sub','f8cba57d-ee0a-46a6-b3c5-f1aca57c9c26',true);
do $$ begin
 perform pg_temp.google_rejected(format('select private.fill_venue_coordinates(%L,%L::jsonb)',current_setting('qa.google_venue'),jsonb_build_object('reference',current_setting('qa.google_ref'))::text));
end $$;
reset role;
-- Refresh claims must verify the Vault secret and reserve the global monthly cap.
do $$ declare secret text; rows integer; used_before integer; month_key date:=date_trunc('month',now() at time zone 'America/Los_Angeles')::date; begin
 update public.venues set coordinates_refresh_after=now()-interval '1 day' where id=current_setting('qa.google_venue')::uuid;
 perform pg_temp.google_rejected($q$select public.claim_google_venue_refresh('forged')$q$);
 insert into private.places_monthly_usage(billing_month,request_count) values(month_key,0) on conflict(billing_month) do update set request_count=0;
 select decrypted_secret into secret from vault.decrypted_secrets where name='venue_locations_worker_secret';
 select count(*) into rows from public.claim_google_venue_refresh(secret);
 assert rows>=1,'A due Google venue can be claimed';
 select request_count into used_before from private.places_monthly_usage where billing_month=month_key;
 assert used_before>=rows,'Paid refresh calls reserve the shared monthly budget';
 perform public.refresh_google_venue_location(current_setting('qa.google_venue')::uuid,'wrong-place',0,0);
 assert exists(select 1 from public.venues where id=current_setting('qa.google_venue')::uuid and latitude=-34.58),'Refresh cannot update a changed place identity';
 perform public.refresh_google_venue_location(current_setting('qa.google_venue')::uuid,'qa-google-location',-34.59,-58.43);
 assert exists(select 1 from public.venues where id=current_setting('qa.google_venue')::uuid and latitude=-34.59 and coordinates_refresh_after>now()+interval '19 days'),'Verified refresh extends bounded cache';
 update private.places_monthly_usage set request_count=9000 where billing_month=month_key;
 update public.venues set coordinates_refresh_after=now()-interval '1 day' where id=current_setting('qa.google_venue')::uuid;
 select count(*) into rows from public.claim_google_venue_refresh(secret);
 assert rows=0,'Monthly cap prevents more refresh claims';
 -- Expired caches cannot be published and are removed by the scheduled cleanup.
 update private.google_place_locations set fetched_at=now()-interval '30 days',expires_at=now()-interval '1 day' where reference=current_setting('qa.google_ref')::uuid;
 update public.venues set geocoded_at=now()-interval '30 days',coordinates_expires_at=now()-interval '1 day' where id=current_setting('qa.google_venue')::uuid;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','1bce2362-4dcd-47e7-a885-fa55fc7cd773',true);
do $$ begin
 perform pg_temp.google_rejected(format('select private.fill_venue_coordinates(%L,%L::jsonb)',current_setting('qa.google_venue'),jsonb_build_object('reference',current_setting('qa.google_ref'))::text));
end $$;
reset role;
do $$ declare cleanup text; begin
 select command into cleanup from cron.job where jobname='palla-google-locations-expiry';
 execute cleanup;
 assert not exists(select 1 from private.google_place_locations where reference=current_setting('qa.google_ref')::uuid),'Expired private coordinates are deleted';
 assert exists(select 1 from public.venues where id=current_setting('qa.google_venue')::uuid and latitude is null and longitude is null and geocoded_at is null and google_address_place_id='qa-google-location' and google_place_id='qa-business-place'),'Expired map coordinates are deleted; place ID survives';
end $$;
rollback;
