-- Player queue entry/exit and notifications reuse registrations and the private outbox.
insert into private.notification_types(key,audience,default_push_enabled,sort_order)
values ('waitlist_joins','organizer',true,8),('waitlist_departures','organizer',true,9),('waitlist_promotions','player',true,10);
alter table private.app_notifications drop constraint app_notifications_notification_type_check,
add constraint app_notifications_notification_type_check check(notification_type in
('review_reminders','new_reviews','session_announcements','session_cancellations','new_registrations','player_cancellations','waitlist_joins','waitlist_departures','waitlist_promotions'));
CREATE OR REPLACE FUNCTION private.notify_registration_host(p_registration uuid, p_type text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r public.registrations; s public.sessions; version timestamptz; actor_name text;
begin
 select * into r from public.registrations where id=p_registration;
 select * into s from public.sessions where id=r.session_id;
 if auth.uid() is null or r.player_id is distinct from auth.uid() or s.organizer_id=r.player_id
 then raise exception 'Registration notification access denied' using errcode='42501'; end if;
 if p_type='new_registrations' and r.status='confirmed' then version:=r.confirmed_at;
 elsif p_type='waitlist_joins' and r.status='waitlisted' then version:=r.joined_at;
 elsif p_type in ('player_cancellations','waitlist_departures') and r.status='cancelled' and r.cancelled_by=r.player_id
 then version:=r.cancelled_at;
 else raise exception 'Invalid registration event'; end if;
 select btrim(concat_ws(' ',first_name,last_name)) into actor_name from public.profiles where id=r.player_id;
 insert into private.app_notifications(recipient_id,notification_type,registration_id,actor_name,deduplication_key)
 values(s.organizer_id,p_type,r.id,actor_name,p_type||':'||r.id||':'||version::text)
 on conflict(deduplication_key) do nothing;
end $function$;

CREATE OR REPLACE FUNCTION private.join_session(p_session_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  actor uuid := auth.uid();
  s public.sessions;
  p public.profiles;
  r public.registrations;
  instant timestamptz;
  next_status text;
begin
  if actor is null then raise exception 'JOIN_SIGN_IN_REQUIRED'; end if;
  if p_session_id is null then raise exception 'JOIN_UNAVAILABLE'; end if;
  select * into s from public.sessions where id=p_session_id for update;
  if s.id is null or s.visibility<>'public' or s.status<>'published'
    or not exists(select 1 from public.organizers where profile_id=s.organizer_id and status='active')
    or not exists(select 1 from public.venues where id=s.venue_id and is_active)
    then raise exception 'JOIN_UNAVAILABLE'; end if;
  if s.organizer_id=actor then raise exception 'JOIN_HOST'; end if;
  select * into p from public.profiles where id=actor for share;
  if p.id is null or p.onboarding_completed_at is null then raise exception 'JOIN_PROFILE_REQUIRED'; end if;
  select * into r from public.registrations where session_id=s.id and player_id=actor for update;
  -- A retry after a lost response must neither reserve twice nor promote a queued player.
  if r.status in ('confirmed','waitlisted') then
    return jsonb_build_object('registration_id',r.id,'status',r.status,
      'confirmed_count',(select count(*) from public.registrations where session_id=s.id and status='confirmed'),
      'waitlisted_count',(select count(*) from public.registrations where session_id=s.id and status='waitlisted'));
  end if;
  if r.status='cancelled' and r.cancelled_by is distinct from actor then raise exception 'JOIN_REMOVED'; end if;
  instant:=clock_timestamp();
  if s.starts_at<=instant or (s.registration_closes_at is not null and s.registration_closes_at<=instant)
    then raise exception 'JOIN_CLOSED'; end if;
  if s.registration_opens_at is not null and s.registration_opens_at>instant then raise exception 'JOIN_NOT_OPEN'; end if;
  if s.strict_category_enforcement and s.allowed_categories is not null
    and (p.category_status<>'known' or p.playing_category is null or not(p.playing_category=any(s.allowed_categories)))
    then raise exception 'JOIN_CATEGORY'; end if;
  next_status:='confirmed';
  if (select count(*) from public.registrations where session_id=s.id and status='confirmed')>=s.capacity then
    if not s.waitlist_enabled then raise exception 'JOIN_FULL'; end if;
    if s.waitlist_capacity is not null and (select count(*) from public.registrations where session_id=s.id and status='waitlisted')>=s.waitlist_capacity then raise exception 'JOIN_WAITLIST_FULL'; end if;
    next_status:='waitlisted';
  end if;
  if r.id is null then
    insert into public.registrations(session_id,player_id,status,confirmed_at)
      values(s.id,actor,next_status,case when next_status='confirmed' then instant end) returning * into r;
  else
    update public.registrations set status=next_status,joined_at=instant,confirmed_at=case when next_status='confirmed' then instant end,
      waitlist_sequence=null,cancelled_at=null,cancelled_by=null,cancellation_reason=null,
      checked_in_at=null,checked_in_by=null where id=r.id returning * into r;
  end if;
  -- AFTER triggers may have promoted a queued entry; report authoritative status.
  select * into r from public.registrations where id=r.id;
  perform private.notify_registration_host(r.id,case when r.status='waitlisted' then 'waitlist_joins' else 'new_registrations' end);
  return jsonb_build_object('registration_id',r.id,'status',r.status,
    'confirmed_count',(select count(*) from public.registrations where session_id=s.id and status='confirmed'),
      'waitlisted_count',(select count(*) from public.registrations where session_id=s.id and status='waitlisted'));
end; $function$;

CREATE OR REPLACE FUNCTION private.cancel_session_registration(p_session_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare actor uuid:=auth.uid(); s public.sessions; r public.registrations; instant timestamptz;
begin
 if actor is null then raise exception 'CANCEL_SIGN_IN_REQUIRED'; end if;
 select * into s from public.sessions where id=p_session_id for update;
 if s.id is null then raise exception 'CANCEL_NOT_REGISTERED'; end if;
 select * into r from public.registrations where session_id=s.id and player_id=actor for update;
 if r.id is null then raise exception 'CANCEL_NOT_REGISTERED'; end if;
 if r.status='cancelled' then
   return jsonb_build_object('status','cancelled','confirmed_count',(select count(*) from public.registrations where session_id=s.id and status='confirmed'),
      'waitlisted_count',(select count(*) from public.registrations where session_id=s.id and status='waitlisted'));
 end if;
 if r.status not in ('confirmed','waitlisted') then raise exception 'CANCEL_NOT_REGISTERED'; end if;
 instant:=clock_timestamp();
 if s.status<>'published' or s.starts_at<=instant then raise exception 'CANCEL_UNAVAILABLE'; end if;
 if r.status='confirmed' and s.cancellation_deadline_at is not null and s.cancellation_deadline_at<=instant then raise exception 'CANCEL_DEADLINE'; end if;
 update public.registrations set status='cancelled',cancelled_at=instant,cancelled_by=actor,
   cancellation_reason=null,checked_in_at=null,checked_in_by=null where id=r.id;
 perform private.notify_registration_host(r.id,case when r.status='waitlisted' then 'waitlist_departures' else 'player_cancellations' end);
 -- The existing trigger promotes eligible queued players in automatic mode.
 return jsonb_build_object('status','cancelled','confirmed_count',(select count(*) from public.registrations where session_id=s.id and status='confirmed'),
      'waitlisted_count',(select count(*) from public.registrations where session_id=s.id and status='waitlisted'));
end; $function$;

-- Every real queued->confirmed transition (manual or automatic) emits exactly one alert.
create function private.notify_waitlist_promotion() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if old.status='waitlisted' and new.status='confirmed' then
  insert into private.app_notifications(recipient_id,notification_type,registration_id,deduplication_key)
  values(new.player_id,'waitlist_promotions',new.id,'waitlist_promotions:'||new.id||':'||extract(epoch from new.confirmed_at)::text)
  on conflict(deduplication_key) do nothing;
 end if;
 return new;
end $$;
revoke all on function private.notify_waitlist_promotion() from public,anon,authenticated;
create trigger notify_waitlist_promotion after update of status on public.registrations
for each row execute function private.notify_waitlist_promotion();

create function private.waitlist_notification_deliverable(p_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.app_notifications n join public.registrations r on r.id=n.registration_id
 join public.sessions s on s.id=r.session_id join public.organizers o on o.profile_id=s.organizer_id and o.status='active'
 where n.id=p_id and n.read_at is null and s.status='published' and s.starts_at>now()
 and private.notification_push_enabled(n.recipient_id,n.notification_type)
 and ((n.notification_type in ('waitlist_joins','waitlist_departures') and n.recipient_id=s.organizer_id)
 or (n.notification_type='waitlist_promotions' and n.recipient_id=r.player_id and r.status='confirmed'
 and n.deduplication_key='waitlist_promotions:'||r.id||':'||extract(epoch from r.confirmed_at)::text)))
$$;
revoke all on function private.waitlist_notification_deliverable(uuid) from public,anon,authenticated;
grant execute on function private.waitlist_notification_deliverable(uuid) to service_role;
CREATE OR REPLACE FUNCTION private.review_notification_deliverable(p_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select private.waitlist_notification_deliverable(p_id) or private.registration_notification_deliverable(p_id) or private.cancellation_push_deliverable(p_id) or exists(select 1 from private.app_notifications n join public.registrations r on r.id=n.registration_id join public.sessions s on s.id=r.session_id left join public.session_reviews v on v.registration_id=r.id left join public.session_announcements a on a.id=n.announcement_id
 where n.id=p_id and n.read_at is null and private.notification_push_enabled(n.recipient_id,n.notification_type) and (
 (n.notification_type='review_reminders' and r.player_id=n.recipient_id and r.status='confirmed' and s.status='completed' and s.ends_at<=now() and now()<s.ends_at+interval '14 days' and v.id is null)
 or (n.notification_type='new_reviews' and v.id=n.review_id and v.status='published' and v.organizer_id=n.recipient_id)
 or (n.notification_type='session_announcements' and a.removed_at is null and s.status='published' and s.ends_at>now() and r.status='confirmed' and r.player_id=n.recipient_id and exists(select 1 from private.session_announcement_recipients x where x.announcement_id=a.id and x.recipient_id=n.recipient_id))))
$function$;

CREATE OR REPLACE FUNCTION public.get_public_session_detail(p_session_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select jsonb_build_object(
    'has_cover_image', coalesce(s.cover_image_path,s.inherited_cover_image_path) is not null,
    'attributes', coalesce((select jsonb_agg(a.attribute_code order by a.attribute_code) from public.session_attributes a where a.session_id=s.id),'[]'::jsonb),
    'id', s.id, 'title', s.title, 'description', s.description,
    'court_label', s.court_label, 'starts_at', s.starts_at, 'ends_at', s.ends_at,
    'timezone', coalesce(ss.timezone, 'America/Argentina/Buenos_Aires'),
    'status', s.status, 'visibility', s.visibility, 'capacity', s.capacity,
    'confirmed_count', (select count(*) from public.registrations r where r.session_id=s.id and r.status='confirmed'),
    'waitlist_enabled',s.waitlist_enabled,'waitlist_capacity',s.waitlist_capacity,
    'waitlisted_count',(select count(*) from public.registrations r where r.session_id=s.id and r.status='waitlisted'),
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
$function$;

CREATE OR REPLACE FUNCTION public.claim_review_notification_push_jobs()
 RETURNS jsonb
 LANGUAGE sql
 SET search_path TO ''
AS $function$
 with stale as (
 update private.notification_push_jobs j set state='skipped' where j.state in ('pending','sending') and (j.created_at<now()-interval '24 hours' or not private.review_notification_deliverable(j.notification_id) or not exists(select 1 from private.chat_push_devices d where d.installation_id=j.installation_id and d.profile_id=j.recipient_id and d.expo_token=j.expo_token and d.enabled and d.updated_at>now()-interval '60 days')) returning id
 ),candidates as(select id from private.notification_push_jobs where state in ('pending','sending') and available_at<=now() and attempts<5 and id not in(select id from stale) order by created_at for update skip locked limit 100),
 claimed as(update private.notification_push_jobs set state='sending',attempts=attempts+1,available_at=now()+interval '2 minutes' where id in(select id from candidates) returning *)
 select coalesce(jsonb_agg(jsonb_build_object('id',j.id,'attempt',j.attempts,'token',j.expo_token,'notification_id',coalesce(unread_target.id,n.id),'recipient_id',j.recipient_id,'mode',t.audience,'kind',n.notification_type,
 'title',case n.notification_type when 'waitlist_joins' then coalesce(nullif(n.actor_name,''),'A player')||' joined your waitlist' when 'waitlist_departures' then coalesce(nullif(n.actor_name,''),'A player')||' left your waitlist' when 'waitlist_promotions' then 'You’re in! Your place is confirmed' when 'new_registrations' then coalesce(nullif(n.actor_name,''),'A player')||' joined your session' when 'player_cancellations' then coalesce(nullif(n.actor_name,''),'A player')||' cancelled their registration' when 'review_reminders' then 'How was your session?' when 'session_cancellations' then case when batch_count.total>1 then batch_count.total||' sessions cancelled' else 'Session cancelled' end when 'session_announcements' then 'Announcement from '||h.first_name else 'You received a new review' end,
 'body',case n.notification_type when 'waitlist_joins' then s.title when 'waitlist_departures' then s.title when 'waitlist_promotions' then 'You’ve been moved from the waitlist to '||s.title||'.' when 'new_registrations' then s.title when 'player_cancellations' then s.title when 'review_reminders' then 'Share your experience at '||s.title||'.' when 'session_cancellations' then case when batch_count.total>1 then h.first_name||' cancelled '||batch_count.total||' sessions you joined or waitlisted for.' else s.title||' has been cancelled.' end when 'session_announcements' then s.title||': '||a.body else btrim(concat_ws(' ',p.first_name,p.last_name))||' reviewed '||s.title||'.' end)),'[]')
 from claimed j join private.app_notifications n on n.id=j.notification_id join private.notification_types t on t.key=n.notification_type join public.registrations r on r.id=n.registration_id join public.sessions s on s.id=r.session_id join public.profiles p on p.id=r.player_id join public.profiles h on h.id=s.organizer_id left join public.session_announcements a on a.id=n.announcement_id
 left join lateral(select count(*)::integer as total from private.session_cancellations c join private.app_notifications nn on nn.cancellation_id=c.id where c.batch_id=j.cancellation_batch_id and nn.recipient_id=j.recipient_id) batch_count on true
 left join lateral(select nn.id from private.session_cancellations c join private.app_notifications nn on nn.cancellation_id=c.id where c.batch_id=j.cancellation_batch_id and nn.recipient_id=j.recipient_id and nn.read_at is null order by nn.created_at,nn.id limit 1) unread_target on true
$function$;

CREATE OR REPLACE FUNCTION private.push_subscription_state()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
 return jsonb_build_object('waitlist_promotions',private.notification_push_enabled(auth.uid(),'waitlist_promotions'),
'waitlist_joins',exists(select 1 from public.organizers where profile_id=auth.uid() and status='active') and private.notification_push_enabled(auth.uid(),'waitlist_joins'),
'waitlist_departures',exists(select 1 from public.organizers where profile_id=auth.uid() and status='active') and private.notification_push_enabled(auth.uid(),'waitlist_departures'),'new_registrations',exists(select 1 from public.organizers where profile_id=auth.uid() and status='active') and private.notification_push_enabled(auth.uid(),'new_registrations'),'player_cancellations',exists(select 1 from public.organizers where profile_id=auth.uid() and status='active') and private.notification_push_enabled(auth.uid(),'player_cancellations'),'session_cancellations',private.notification_push_enabled(auth.uid(),'session_cancellations'),'chat_messages',private.notification_push_enabled(auth.uid(),'chat_messages'),'review_reminders',private.notification_push_enabled(auth.uid(),'review_reminders'),'new_reviews',exists(select 1 from public.organizers where profile_id=auth.uid() and status='active') and private.notification_push_enabled(auth.uid(),'new_reviews'),'session_announcements',private.notification_push_enabled(auth.uid(),'session_announcements'));
end$function$;
