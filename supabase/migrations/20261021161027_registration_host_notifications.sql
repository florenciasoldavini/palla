-- Account-level organizer push preferences; inbox delivery is independent.
insert into private.notification_types(key,audience,default_push_enabled,sort_order)
values ('new_registrations','organizer',true,6),('player_cancellations','organizer',true,7);

alter table private.app_notifications
 add column actor_name text,
 drop constraint app_notifications_notification_type_check,
 add constraint app_notifications_notification_type_check check(notification_type in
 ('review_reminders','new_reviews','session_announcements','session_cancellations','new_registrations','player_cancellations'));

-- Called only by successful player mutations, never by roster/promotion triggers.
create function private.notify_registration_host(p_registration uuid,p_type text)
returns void language plpgsql security definer set search_path='' as $$
declare r public.registrations; s public.sessions; version timestamptz; actor_name text;
begin
 select * into r from public.registrations where id=p_registration;
 select * into s from public.sessions where id=r.session_id;
 if auth.uid() is null or r.player_id is distinct from auth.uid() or s.organizer_id=r.player_id
 then raise exception 'Registration notification access denied' using errcode='42501'; end if;
 if p_type='new_registrations' and r.status='confirmed' then version:=r.confirmed_at;
 elsif p_type='player_cancellations' and r.status='cancelled' and r.cancelled_by=r.player_id
 then version:=r.cancelled_at;
 else raise exception 'Invalid registration event'; end if;
 select btrim(concat_ws(' ',first_name,last_name)) into actor_name from public.profiles where id=r.player_id;
 insert into private.app_notifications(recipient_id,notification_type,registration_id,actor_name,deduplication_key)
 values(s.organizer_id,p_type,r.id,actor_name,p_type||':'||r.id||':'||version::text)
 on conflict(deduplication_key) do nothing;
end $$;
revoke all on function private.notify_registration_host(uuid,text) from public,anon,authenticated;

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
      'confirmed_count',(select count(*) from public.registrations where session_id=s.id and status='confirmed'));
  end if;
  if r.status='cancelled' and r.cancelled_by is distinct from actor then raise exception 'JOIN_REMOVED'; end if;
  instant:=clock_timestamp();
  if s.starts_at<=instant or (s.registration_closes_at is not null and s.registration_closes_at<=instant)
    then raise exception 'JOIN_CLOSED'; end if;
  if s.registration_opens_at is not null and s.registration_opens_at>instant then raise exception 'JOIN_NOT_OPEN'; end if;
  if s.strict_category_enforcement and s.allowed_categories is not null
    and (p.category_status<>'known' or p.playing_category is null or not(p.playing_category=any(s.allowed_categories)))
    then raise exception 'JOIN_CATEGORY'; end if;
  if (select count(*) from public.registrations where session_id=s.id and status='confirmed')>=s.capacity
    then raise exception 'JOIN_FULL'; end if;
  if r.id is null then
    insert into public.registrations(session_id,player_id,status,confirmed_at)
      values(s.id,actor,'confirmed',instant) returning * into r;
  else
    update public.registrations set status='confirmed',joined_at=instant,confirmed_at=instant,
      waitlist_sequence=null,cancelled_at=null,cancelled_by=null,cancellation_reason=null,
      checked_in_at=null,checked_in_by=null where id=r.id returning * into r;
  end if;
  perform private.notify_registration_host(r.id,'new_registrations');
  return jsonb_build_object('registration_id',r.id,'status',r.status,
    'confirmed_count',(select count(*) from public.registrations where session_id=s.id and status='confirmed'));
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
   return jsonb_build_object('status','cancelled','confirmed_count',(select count(*) from public.registrations where session_id=s.id and status='confirmed'));
 end if;
 if r.status<>'confirmed' then raise exception 'CANCEL_NOT_REGISTERED'; end if;
 instant:=clock_timestamp();
 if s.status<>'published' or s.starts_at<=instant then raise exception 'CANCEL_UNAVAILABLE'; end if;
 if s.cancellation_deadline_at is not null and s.cancellation_deadline_at<=instant then raise exception 'CANCEL_DEADLINE'; end if;
 update public.registrations set status='cancelled',cancelled_at=instant,cancelled_by=actor,
   cancellation_reason=null,checked_in_at=null,checked_in_by=null where id=r.id;
 perform private.notify_registration_host(r.id,'player_cancellations');
 -- The existing trigger promotes eligible queued players in automatic mode.
 return jsonb_build_object('status','cancelled','confirmed_count',(select count(*) from public.registrations where session_id=s.id and status='confirmed'));
end; $function$;

CREATE OR REPLACE FUNCTION private.notification_inbox(p_mode text, p_unread boolean DEFAULT false, p_before timestamp with time zone DEFAULT NULL::timestamp with time zone, p_before_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$begin
 if auth.uid() is null or p_mode is null or p_mode not in ('player','organizer') then raise exception 'Authentication required' using errcode='42501';end if;
 if p_mode='organizer' and not exists(select 1 from public.organizers where profile_id=auth.uid() and status='active') then raise exception 'Organizer access required' using errcode='42501';end if;
 return (select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at desc,q.id desc),'[]') from (
 select n.actor_name,n.id,n.notification_type,n.registration_id,n.review_id,n.announcement_id,n.cancellation_id,n.recipient_status,s.cancellation_reason_code,s.starts_at as session_starts_at,s.ends_at as session_ends_at,(select ss.timezone from public.session_series ss where ss.id=s.series_id) as session_timezone,n.created_at,n.read_at,s.id as session_id,s.title as session_title,s.ends_at+interval '14 days' as deadline,
 btrim(concat_ws(' ',h.first_name,h.last_name)) as host_name,btrim(concat_ws(' ',p.first_name,p.last_name)) as reviewer_name,
 v.status as review_status,
 n.notification_type='review_reminders' and r.status='confirmed' and s.status in ('published','completed') and s.ends_at<=now() and now()<s.ends_at+interval '14 days' and v.id is null as can_review,
 case when a.removed_at is not null then 'This announcement was removed.' else left(a.body,150) end as announcement_preview,a.removed_at as announcement_removed_at
 from private.app_notifications n join private.notification_types t on t.key=n.notification_type join public.registrations r on r.id=n.registration_id
 join public.sessions s on s.id=r.session_id join public.profiles h on h.id=s.organizer_id join public.profiles p on p.id=r.player_id
 left join public.session_reviews v on v.registration_id=r.id left join public.session_announcements a on a.id=n.announcement_id
 where n.recipient_id=auth.uid() and t.audience=p_mode and (not coalesce(p_unread,false) or n.read_at is null)
 and (p_before is null or (n.created_at,n.id)<(p_before,p_before_id))
 order by n.created_at desc,n.id desc limit 30)q);
end$function$;

CREATE OR REPLACE FUNCTION private.notification_target(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$declare result jsonb;begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
 select jsonb_build_object('notification_type',n.notification_type,'session_id',(select session_id from public.registrations where id=n.registration_id),'id',n.id,'registration_id',n.registration_id,'announcement_id',n.announcement_id,'cancellation_id',n.cancellation_id,'mode',t.audience) into result from private.app_notifications n join private.notification_types t on t.key=n.notification_type where n.id=p_id and n.recipient_id=auth.uid();
 if result is null then raise exception 'Notification unavailable' using errcode='42501';end if;return result;
end$function$;

create function private.registration_notification_deliverable(p_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.app_notifications n
 join public.registrations r on r.id=n.registration_id
 join public.sessions s on s.id=r.session_id
 join public.organizers o on o.profile_id=s.organizer_id and o.status='active'
 where n.id=p_id and n.notification_type in ('new_registrations','player_cancellations')
 and n.recipient_id=s.organizer_id and n.read_at is null
 and s.status='published' and s.starts_at>now()
 and private.notification_push_enabled(n.recipient_id,n.notification_type))
$$;
revoke all on function private.registration_notification_deliverable(uuid) from public,anon,authenticated;
grant execute on function private.registration_notification_deliverable(uuid) to service_role;
CREATE OR REPLACE FUNCTION private.review_notification_deliverable(p_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select private.registration_notification_deliverable(p_id) or private.cancellation_push_deliverable(p_id) or exists(select 1 from private.app_notifications n join public.registrations r on r.id=n.registration_id join public.sessions s on s.id=r.session_id left join public.session_reviews v on v.registration_id=r.id left join public.session_announcements a on a.id=n.announcement_id
 where n.id=p_id and n.read_at is null and private.notification_push_enabled(n.recipient_id,n.notification_type) and (
 (n.notification_type='review_reminders' and r.player_id=n.recipient_id and r.status='confirmed' and s.status='completed' and s.ends_at<=now() and now()<s.ends_at+interval '14 days' and v.id is null)
 or (n.notification_type='new_reviews' and v.id=n.review_id and v.status='published' and v.organizer_id=n.recipient_id)
 or (n.notification_type='session_announcements' and a.removed_at is null and s.status='published' and s.ends_at>now() and r.status='confirmed' and r.player_id=n.recipient_id and exists(select 1 from private.session_announcement_recipients x where x.announcement_id=a.id and x.recipient_id=n.recipient_id))))
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
 'title',case n.notification_type when 'new_registrations' then coalesce(nullif(n.actor_name,''),'A player')||' joined your session' when 'player_cancellations' then coalesce(nullif(n.actor_name,''),'A player')||' cancelled their registration' when 'review_reminders' then 'How was your session?' when 'session_cancellations' then case when batch_count.total>1 then batch_count.total||' sessions cancelled' else 'Session cancelled' end when 'session_announcements' then 'Announcement from '||h.first_name else 'You received a new review' end,
 'body',case n.notification_type when 'new_registrations' then s.title when 'player_cancellations' then s.title when 'review_reminders' then 'Share your experience at '||s.title||'.' when 'session_cancellations' then case when batch_count.total>1 then h.first_name||' cancelled '||batch_count.total||' sessions you joined or waitlisted for.' else s.title||' has been cancelled.' end when 'session_announcements' then s.title||': '||a.body else btrim(concat_ws(' ',p.first_name,p.last_name))||' reviewed '||s.title||'.' end)),'[]')
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
 return jsonb_build_object('new_registrations',exists(select 1 from public.organizers where profile_id=auth.uid() and status='active') and private.notification_push_enabled(auth.uid(),'new_registrations'),'player_cancellations',exists(select 1 from public.organizers where profile_id=auth.uid() and status='active') and private.notification_push_enabled(auth.uid(),'player_cancellations'),'session_cancellations',private.notification_push_enabled(auth.uid(),'session_cancellations'),'chat_messages',private.notification_push_enabled(auth.uid(),'chat_messages'),'review_reminders',private.notification_push_enabled(auth.uid(),'review_reminders'),'new_reviews',exists(select 1 from public.organizers where profile_id=auth.uid() and status='active') and private.notification_push_enabled(auth.uid(),'new_reviews'),'session_announcements',private.notification_push_enabled(auth.uid(),'session_announcements'));
end$function$;
