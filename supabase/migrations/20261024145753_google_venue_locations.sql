-- Google locations are verified server-side and cached for fewer than 30 days.
create table private.google_place_locations (
  reference uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  place_id text not null check (length(place_id) between 1 and 512 and place_id ~ '^[a-zA-Z0-9_-]+$'),
  address text not null check (length(address) between 1 and 300),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null default now()+interval '29 days',
  unique(owner_id,place_id,address),
  check(expires_at<=fetched_at+interval '29 days')
);
alter table private.google_place_locations enable row level security;
revoke all on private.google_place_locations from public,anon,authenticated;
create index google_place_locations_expiry on private.google_place_locations(expires_at);
alter table public.venues
  add column google_address_place_id text,
  add column coordinate_provider text check(coordinate_provider in ('google','legacy')),
  add column coordinates_expires_at timestamptz,
  add column coordinates_refresh_after timestamptz;
-- Ordinary client INSERT must not manufacture Google source/refresh metadata.
-- Preserve the pre-existing column permissions used by the invoker publisher.
revoke insert on public.venues from authenticated;
do $$ declare columns text; begin
 select string_agg(quote_ident(column_name),',' order by ordinal_position) into columns
 from information_schema.columns where table_schema='public' and table_name='venues'
 and column_name not in ('google_address_place_id','coordinate_provider','coordinates_expires_at','coordinates_refresh_after');
 execute 'grant insert ('||columns||') on public.venues to authenticated';
end $$;
update public.venues set coordinate_provider='legacy' where latitude is not null;
alter table public.venues add constraint venues_google_coordinates_expiry check(
  coordinate_provider is distinct from 'google' or
  (google_address_place_id is not null and
    (latitude is null or (coordinates_expires_at is not null and coordinates_expires_at<=geocoded_at+interval '29 days')))
);
create index venues_google_refresh on public.venues(coordinates_refresh_after)
  where is_active and coordinate_provider='google';

create function public.cache_google_place_location(p_owner uuid,p_place_id text,p_address text,p_latitude double precision,p_longitude double precision)
returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
  if not exists(select 1 from public.organizers where profile_id=p_owner and status='active') then
    raise exception 'Organizer access required' using errcode='42501'; end if;
  insert into private.google_place_locations(owner_id,place_id,address,latitude,longitude)
  values(p_owner,p_place_id,p_address,p_latitude,p_longitude)
  on conflict(owner_id,place_id,address) do update set latitude=excluded.latitude,longitude=excluded.longitude,fetched_at=now(),expires_at=now()+interval '29 days'
  returning reference into result;
  return result;
end $$;
revoke all on function public.cache_google_place_location(uuid,text,text,double precision,double precision) from public,anon,authenticated;
grant execute on function public.cache_google_place_location(uuid,text,text,double precision,double precision) to service_role;

-- Keep old app versions' independent coordinates working. New clients send only
-- a reference; arbitrary client-supplied coordinates cannot be marked as Google.
do $$ declare definition text; begin
 definition:=pg_get_functiondef('private.fill_venue_coordinates(uuid,jsonb)'::regprocedure);
 execute replace(definition,'CREATE OR REPLACE FUNCTION private.fill_venue_coordinates(', 'CREATE OR REPLACE FUNCTION private.fill_legacy_venue_coordinates(');
end $$;
revoke all on function private.fill_legacy_venue_coordinates(uuid,jsonb) from public,anon,authenticated;
create or replace function private.fill_venue_coordinates(p_venue_id uuid,p_coordinates jsonb)
returns void language plpgsql security definer set search_path='' as $$
declare location private.google_place_locations;
begin
  if auth.uid() is null or not exists(select 1 from public.organizers where profile_id=auth.uid() and status='active') then
    raise exception 'Organizer access required' using errcode='42501'; end if;
  if p_coordinates ? 'reference' then
    select * into location from private.google_place_locations
      where reference=(p_coordinates->>'reference')::uuid and owner_id=auth.uid() and expires_at>now();
    if not found then raise exception 'Venue location expired; choose the address again' using errcode='22023'; end if;
    update public.venues set latitude=location.latitude,longitude=location.longitude,
      google_address_place_id=location.place_id,geocoded_address=address,geocoded_at=location.fetched_at,
      coordinate_provider='google',coordinates_expires_at=location.expires_at,
      coordinates_refresh_after=location.fetched_at+interval '20 days'
    where id=p_venue_id and created_by=auth.uid() and is_active and address=location.address;
  else
    if exists(select 1 from public.venues where id=p_venue_id and coordinate_provider='google') then return; end if;
    perform private.fill_legacy_venue_coordinates(p_venue_id,p_coordinates);
    update public.venues set coordinate_provider='legacy'
      where id=p_venue_id and created_by=auth.uid() and latitude is not null and coordinate_provider is null;
  end if;
end $$;
revoke all on function private.fill_venue_coordinates(uuid,jsonb) from public,anon;
grant execute on function private.fill_venue_coordinates(uuid,jsonb) to authenticated;

create or replace function private.clear_changed_venue_coordinates()
returns trigger language plpgsql set search_path='' as $$
begin
  if new.address is distinct from old.address then
    new.latitude:=null; new.longitude:=null; new.geocoded_address:=null; new.geocoded_at:=null;
    new.google_place_id:=null; new.google_address_place_id:=null; new.coordinate_provider:=null;
    new.coordinates_expires_at:=null; new.coordinates_refresh_after:=null;
  end if;
  return new;
end $$;

-- Use a dedicated, unexposed worker secret; never reuse a messaging credential.
do $$ begin
 if not exists(select 1 from vault.secrets where name='venue_locations_worker_secret') then
   perform vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),'venue_locations_worker_secret');
 end if;
end $$;
create function public.claim_google_venue_refresh(p_secret text)
returns table(id uuid,place_id text) language plpgsql security definer set search_path='' as $$
declare month_key date:=date_trunc('month',now() at time zone 'America/Los_Angeles')::date; remaining integer;
begin
 if p_secret is null or not exists(select 1 from vault.decrypted_secrets where name='venue_locations_worker_secret' and decrypted_secret=p_secret) then
   raise exception 'Worker access required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(74141,1);
 insert into private.places_monthly_usage(billing_month) values(month_key) on conflict do nothing;
 select greatest(0,least(50,9000-request_count)) into remaining from private.places_monthly_usage where billing_month=month_key for update;
 return query with due as (
   select v.id from public.venues v where v.is_active and v.coordinate_provider='google' and v.google_address_place_id is not null and v.coordinates_refresh_after<=now()
   order by v.coordinates_refresh_after,v.id limit remaining for update skip locked
 ), claimed as (
   update public.venues v set coordinates_refresh_after=now()+interval '1 day'
   from due where v.id=due.id returning v.id,v.google_address_place_id
 ) select claimed.id,claimed.google_address_place_id from claimed;
 get diagnostics remaining=row_count;
 update private.places_monthly_usage set request_count=request_count+remaining where billing_month=month_key;
end $$;
revoke all on function public.claim_google_venue_refresh(text) from public,anon,authenticated;
grant execute on function public.claim_google_venue_refresh(text) to service_role;
create function public.refresh_google_venue_location(p_id uuid,p_place_id text,p_latitude double precision,p_longitude double precision)
returns void language sql security definer set search_path='' as $$
 update public.venues set latitude=p_latitude,longitude=p_longitude,geocoded_address=address,geocoded_at=now(),
   coordinates_expires_at=now()+interval '29 days',coordinates_refresh_after=now()+interval '20 days'
 where id=p_id and is_active and coordinate_provider='google' and google_address_place_id=p_place_id;
$$;
revoke all on function public.refresh_google_venue_location(uuid,text,double precision,double precision) from public,anon,authenticated;
grant execute on function public.refresh_google_venue_location(uuid,text,double precision,double precision) to service_role;
select cron.schedule('palla-google-locations-expiry','19 * * * *',$job$
 delete from private.google_place_locations where expires_at<=now();
 update public.venues set latitude=null,longitude=null,geocoded_address=null,geocoded_at=null,coordinates_expires_at=null
   where coordinate_provider='google' and coordinates_expires_at<=now();
$job$);
-- The URL follows the already provisioned worker URL for this project, avoiding
-- project-specific hosts or credentials in the migration.
select cron.schedule('palla-google-locations-refresh','31 3 * * *',$job$
 select net.http_post(
   url:=regexp_replace((select decrypted_secret from vault.decrypted_secrets where name='chat_push_function_url'),'/chat-push$','/venue-locations-refresh'),
   headers:=jsonb_build_object('Content-Type','application/json','x-worker-secret',(select decrypted_secret from vault.decrypted_secrets where name='venue_locations_worker_secret')),
   body:='{}'::jsonb,timeout_milliseconds:=120000);
$job$);
