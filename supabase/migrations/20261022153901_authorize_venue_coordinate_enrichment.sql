-- Keep general venue UPDATE unavailable to clients. This private helper can only
-- fill a missing coordinate pair for an active organizer's own unchanged address.
create function private.fill_venue_coordinates(p_venue_id uuid,p_coordinates jsonb)
returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or not exists(select 1 from public.organizers where profile_id=auth.uid() and status='active') then
    raise exception 'Organizer access required' using errcode='42501';
  end if;
  if jsonb_typeof(p_coordinates) is distinct from 'object'
    or jsonb_typeof(p_coordinates->'latitude') is distinct from 'number'
    or jsonb_typeof(p_coordinates->'longitude') is distinct from 'number'
    or jsonb_typeof(p_coordinates->'address') is distinct from 'string'
    or not ((p_coordinates->>'latitude')::double precision between -90 and 90)
    or not ((p_coordinates->>'longitude')::double precision between -180 and 180)
  then raise exception 'Invalid venue coordinates' using errcode='22023'; end if;
  update public.venues set latitude=(p_coordinates->>'latitude')::double precision,
    longitude=(p_coordinates->>'longitude')::double precision,
    geocoded_address=address,geocoded_at=now()
  where id=p_venue_id and created_by=auth.uid() and is_active and latitude is null
    and address=p_coordinates->>'address';
end $$;
revoke all on function private.fill_venue_coordinates(uuid,jsonb) from public,anon,authenticated;
grant execute on function private.fill_venue_coordinates(uuid,jsonb) to authenticated;

do $$ declare definition text; first_pos integer; last_pos integer;begin
 definition:=pg_get_functiondef('private.save_organizer_session_without_covers(uuid,jsonb,boolean,uuid,text,timestamptz)'::regprocedure);
 first_pos:=position('  if p_input->''venueCoordinates'' is not null' in definition);
 last_pos:=position('  if p_session_id is null then' in substring(definition from first_pos));
 if first_pos=0 or last_pos=0 then raise exception 'Unexpected publisher coordinate block'; end if;
 definition:=substring(definition for first_pos-1) || $replacement$
  if p_input->'venueCoordinates' is not null and p_input->'venueCoordinates' <> 'null'::jsonb then
    perform private.fill_venue_coordinates(venue,p_input->'venueCoordinates');
  end if;
$replacement$ || substring(definition from first_pos+last_pos-1);
 execute definition;
end $$;
