-- Coordinates are authored alongside a venue, never resolved by public browsing.
alter table public.venues
  add column latitude double precision,
  add column longitude double precision,
  add column geocoded_address text,
  add column geocoded_at timestamptz,
  add constraint venues_coordinates_valid check (
    (latitude is null and longitude is null and geocoded_address is null and geocoded_at is null)
    or (latitude is not null and longitude is not null and latitude between -90 and 90
      and longitude between -180 and 180 and geocoded_address is not null
      and geocoded_address = address and geocoded_at is not null)
  );

create function private.clear_changed_venue_coordinates() returns trigger
language plpgsql set search_path='' as $$
begin
  if new.address is distinct from old.address then
    new.latitude:=null; new.longitude:=null; new.geocoded_address:=null; new.geocoded_at:=null;
  end if;
  return new;
end $$;
revoke all on function private.clear_changed_venue_coordinates() from public,anon,authenticated;
create trigger venues_clear_changed_coordinates before update of address on public.venues
for each row execute function private.clear_changed_venue_coordinates();

-- Preserve the existing publish authorization, concurrency, attributes and covers.
-- Only the venue creator can fill missing coordinates during a successful publish.
do $$
declare definition text; needle text;
begin
  definition:=pg_get_functiondef('private.save_organizer_session_without_covers(uuid,jsonb,boolean,uuid,text,timestamptz)'::regprocedure);
  needle:='if not exists (select 1 from public.venues where id = venue and is_active) then raise exception ''Choose an available venue''; end if;';
  if position(needle in definition)=0 then raise exception 'Unexpected session publisher definition'; end if;
  definition:=replace(definition,needle,needle || $insert$
  if p_input->'venueCoordinates' is not null and p_input->'venueCoordinates' <> 'null'::jsonb then
    if jsonb_typeof(p_input->'venueCoordinates') <> 'object'
      or jsonb_typeof(p_input->'venueCoordinates'->'latitude') is distinct from 'number'
      or jsonb_typeof(p_input->'venueCoordinates'->'longitude') is distinct from 'number'
      or jsonb_typeof(p_input->'venueCoordinates'->'address') is distinct from 'string'
      or not ((p_input->'venueCoordinates'->>'latitude')::double precision between -90 and 90)
      or not ((p_input->'venueCoordinates'->>'longitude')::double precision between -180 and 180)
    then raise exception 'Invalid venue coordinates' using errcode='22023'; end if;
    update public.venues set latitude=(p_input->'venueCoordinates'->>'latitude')::double precision,
      longitude=(p_input->'venueCoordinates'->>'longitude')::double precision,
      geocoded_address=address,geocoded_at=now()
    where id=venue and created_by=auth.uid() and latitude is null
      and address=p_input->'venueCoordinates'->>'address';
  end if;
$insert$);
  execute definition;

  definition:=pg_get_functiondef('private.discover_sessions(text,text,date,date,integer,text,text)'::regprocedure);
  needle:='v.name venue_name,v.address venue_address,';
  if position(needle in definition)=0 then raise exception 'Unexpected discovery definition'; end if;
  definition:=replace(definition,needle,needle || 'v.latitude venue_latitude,v.longitude venue_longitude,');
  definition:=replace(definition,'''address'',venue_address)', '''address'',venue_address,''latitude'',venue_latitude,''longitude'',venue_longitude)');
  execute definition;

  definition:=pg_get_functiondef('public.get_public_session_detail(uuid)'::regprocedure);
  needle:='''google_place_id'', v.google_place_id';
  if position(needle in definition)=0 then raise exception 'Unexpected public session definition'; end if;
  definition:=replace(definition,needle,'''latitude'',v.latitude,''longitude'',v.longitude,' || needle);
  execute definition;
end $$;
