-- Narrow read API for one occurrence. Keep base tables and organizer roster private.
-- Definer privileges are needed only to project these explicitly public fields
-- across owner-only tables. No writes, attendance, contact details, or draft data.
create or replace function public.get_public_session_detail(p_session_id uuid)
returns jsonb
language sql stable security definer
set search_path = ''
as $$
  select jsonb_build_object(
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
    'venue', jsonb_build_object('name', v.name, 'address', v.address,
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
