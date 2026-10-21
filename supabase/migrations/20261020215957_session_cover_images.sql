-- Uploaded covers are private objects. Public access is scoped to a visible occurrence.
alter table public.session_series add column cover_image_path text;
alter table public.sessions add column cover_image_path text;
alter table public.sessions add column inherited_cover_image_path text;
alter table public.session_series add constraint series_cover_owned check (cover_image_path is null or cover_image_path ~ ('^'||organizer_id::text||'/[0-9a-f-]{36}\.jpg$'));
alter table public.sessions add constraint session_cover_owned check (cover_image_path is null or cover_image_path ~ ('^'||organizer_id::text||'/[0-9a-f-]{36}\.jpg$'));
alter table public.sessions add constraint inherited_cover_owned check (inherited_cover_image_path is null or inherited_cover_image_path ~ ('^'||organizer_id::text||'/[0-9a-f-]{36}\.jpg$'));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('session-covers','session-covers',false,4194304,array['image/jpeg']);
create policy "Read own session covers" on storage.objects for select to authenticated
using(bucket_id='session-covers' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "Upload own session covers" on storage.objects for insert to authenticated
with check(bucket_id='session-covers' and name ~ ('^'||(select auth.uid())::text||'/[0-9a-f-]{36}\.jpg$')
 and exists(select 1 from public.organizers where profile_id=(select auth.uid()) and status='active'));
create policy "Delete unused own session covers" on storage.objects for delete to authenticated
using(bucket_id='session-covers' and (storage.foldername(name))[1]=(select auth.uid())::text
 and not exists(select 1 from public.sessions s where s.cover_image_path=name or s.inherited_cover_image_path=name)
 and not exists(select 1 from public.session_series s where s.cover_image_path=name or s.draft_input->>'coverImagePath'=name));

-- Preserve the complete existing save workflow and its locks/RLS in this transaction.
alter function public.save_organizer_session(uuid,jsonb,boolean,uuid,text,timestamptz) set schema private;
alter function private.save_organizer_session(uuid,jsonb,boolean,uuid,text,timestamptz) rename to save_organizer_session_without_covers;
create function public.save_organizer_session(p_id uuid,p_input jsonb,p_publish boolean,p_session_id uuid default null,p_scope text default 'one',p_expected_version timestamptz default null)
returns uuid language plpgsql security invoker set search_path='' as $$
declare result uuid; path text; occurrence_ids uuid[];
begin
 if p_input ? 'coverImagePath' and (p_session_id is null or coalesce((p_input->>'coverEdited')::boolean,false)) then
  if jsonb_typeof(p_input->'coverImagePath') not in ('string','null') then raise exception 'Invalid session cover'; end if;
  path:=p_input->>'coverImagePath';
  if path is not null and (path !~ ('^'||auth.uid()::text||'/[0-9a-f-]{36}\.jpg$') or not exists(select 1 from storage.objects where bucket_id='session-covers' and name=path)) then raise exception 'Invalid session cover'; end if;
 end if;
 -- A repeated completed publish cannot rewrite covers or create more dates.
 if p_session_id is null and p_publish and p_expected_version is null and exists(select 1 from public.session_series where id=p_id and status<>'draft' and organizer_id=auth.uid()) then return p_id; end if;
 result:=private.save_organizer_session_without_covers(p_id,p_input,p_publish,p_session_id,p_scope,p_expected_version);
 if p_input ? 'coverImagePath' and (p_session_id is null or coalesce((p_input->>'coverEdited')::boolean,false)) then
  if p_session_id is null then
   update public.session_series set cover_image_path=path where id=result;
   if p_publish then update public.sessions set inherited_cover_image_path=path where series_id=result; end if;
  else
   if p_scope='one' then
    update public.sessions set cover_image_path=path where id=p_session_id and series_id=result;
   else
    update public.session_series set cover_image_path=path where id=result;
    update public.sessions set cover_image_path=null,inherited_cover_image_path=path where series_id=result and status='published' and starts_at>now()
      and (id=p_session_id or occurrence_date>=(select occurrence_date from public.sessions where id=p_session_id));
   end if;
  end if;
 end if;
 return result;
end; $$;
revoke all on function public.save_organizer_session(uuid,jsonb,boolean,uuid,text,timestamptz) from public,anon;
grant execute on function public.save_organizer_session(uuid,jsonb,boolean,uuid,text,timestamptz) to authenticated;

-- A bounded budget shared with existing Places requests; no provider content is stored.
create table private.cover_photo_usage(slot text not null,bucket timestamptz not null,request_count integer not null,primary key(slot,bucket));
alter table private.cover_photo_usage enable row level security;
revoke all on private.cover_photo_usage from public,anon,authenticated;
create function private.reserve_cover_photo_request(p_client_hash text) returns boolean
language plpgsql security definer set search_path='' as $$
declare month_key date:=date_trunc('month',now() at time zone 'America/Los_Angeles')::date; minute_key timestamptz:=date_trunc('minute',now()); day_key timestamptz:=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC'; used integer;
begin
 if p_client_hash !~ '^[0-9a-f]{64}$' then return false; end if;
 perform pg_advisory_xact_lock(74141,1);
 insert into private.places_monthly_usage(billing_month) values(month_key) on conflict do nothing;
 select request_count into used from private.places_monthly_usage where billing_month=month_key;
 if used>8997 or coalesce((select request_count from private.cover_photo_usage where slot='day' and bucket=day_key),0)>=300
 or coalesce((select request_count from private.cover_photo_usage where slot=p_client_hash and bucket=minute_key),0)>=10 then return false; end if;
 delete from private.cover_photo_usage where bucket<now()-interval '2 days';
 insert into private.cover_photo_usage values('day',day_key,1),(p_client_hash,minute_key,1)
 on conflict(slot,bucket) do update set request_count=private.cover_photo_usage.request_count+1;
 update private.places_monthly_usage set request_count=request_count+3 where billing_month=month_key;
 return true;
end; $$;
revoke all on function private.reserve_cover_photo_request(text) from public,anon,authenticated;
grant execute on function private.reserve_cover_photo_request(text) to service_role;
create function public.reserve_cover_photo_request(p_client_hash text) returns boolean language sql security invoker set search_path='' as $$select private.reserve_cover_photo_request(p_client_hash)$$;
revoke all on function public.reserve_cover_photo_request(text) from public,anon,authenticated;
grant execute on function public.reserve_cover_photo_request(text) to service_role;
create or replace function public.get_public_session_detail(p_session_id uuid)
returns jsonb
language sql stable security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'has_cover_image', coalesce(s.cover_image_path,s.inherited_cover_image_path) is not null,
    'attributes', coalesce((select jsonb_agg(a.attribute_code order by a.attribute_code) from public.session_attributes a where a.session_id=s.id),'[]'::jsonb),
    'id', s.id, 'title', s.title, 'description', s.description,
    'court_label', s.court_label, 'starts_at', s.starts_at, 'ends_at', s.ends_at,
    'timezone', coalesce(ss.timezone, 'America/Argentina/Buenos_Aires'),
    'status', s.status, 'visibility', s.visibility, 'capacity', s.capacity,
    'confirmed_count', (select count(*) from public.registrations r where r.session_id=s.id and r.status='confirmed'),
    'allowed_categories', s.allowed_categories,
    'participant_gender_policy', s.participant_gender_policy,
    'price_minor', s.price_minor, 'currency', s.currency,
    'registration_opens_at', s.registration_opens_at,
    'registration_closes_at', s.registration_closes_at,
    'cancellation_deadline_at', s.cancellation_deadline_at,
    'payment_instructions', s.payment_instructions,
    'weekly', coalesce(ss.recurrence='weekly', false),
    'venue', jsonb_build_object('attributes', coalesce((select jsonb_agg(a.attribute_code order by a.attribute_code) from public.organizer_venue_attributes a where a.organizer_id=s.organizer_id and a.venue_id=s.venue_id),'[]'::jsonb), 'name', v.name, 'address', v.address,
      'google_place_id', v.google_place_id, 'arrival_instructions', v.arrival_instructions),
    'host', jsonb_build_object('name', coalesce(nullif(concat_ws(' ',hp.first_name,hp.last_name),''),'Session host'), 'avatar_url', hp.avatar_url),
    'players', case when exists(select 1 from public.profiles vp where vp.id=(select auth.uid()) and vp.onboarding_completed_at is not null)
      then coalesce((select jsonb_agg(p.player order by p.confirmed_at, p.id) from (
        select r.confirmed_at, r.id, jsonb_build_object(
          'name', coalesce(nullif(concat_ws(' ', pp.first_name, case when nullif(pp.last_name,'') is not null then left(pp.last_name,1)||'.' end),''),'Player'),
          'avatar_url', pp.avatar_url, 'category', pp.playing_category) player
        from public.registrations r join public.profiles pp on pp.id=r.player_id
        where r.session_id=s.id and r.status='confirmed'
        order by r.confirmed_at, r.id limit 12
      ) p),'[]'::jsonb) else '[]'::jsonb end,
    'viewer_registration', (select r.status from public.registrations r where r.session_id=s.id and r.player_id=(select auth.uid()) and r.status in ('confirmed','waitlisted')),
    'viewer_is_host', coalesce(s.organizer_id=(select auth.uid()),false)
  )
  from public.sessions s
  join public.venues v on v.id=s.venue_id and v.is_active
  join public.profiles hp on hp.id=s.organizer_id
  join public.organizers o on o.profile_id=s.organizer_id and o.status='active'
  left join public.session_series ss on ss.id=s.series_id
  where s.id=p_session_id and s.status in ('published','cancelled','completed')
    and (s.visibility='public' or s.organizer_id=(select auth.uid()));
$$;
revoke all on function public.get_public_session_detail(uuid) from public, anon, authenticated;
grant execute on function public.get_public_session_detail(uuid) to anon, authenticated;
comment on function public.get_public_session_detail(uuid) is 'Read-only public occurrence projection. Private occurrences are owner-only; drafts never returned. Anonymous callers receive no participant identities.';
