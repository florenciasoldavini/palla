-- Structured cancellation reasons are self-reported facts, not scoring exemptions.
alter table public.sessions add column cancellation_reason_code text
 check (cancellation_reason_code in ('weather','venue_issue','host_emergency','insufficient_players','other'));
alter table public.sessions add constraint cancellation_code_status check (status='cancelled' or cancellation_reason_code is null);
create table private.session_cancellations (
 id uuid primary key default gen_random_uuid(),
 session_id uuid not null unique references public.sessions(id),
 batch_id uuid not null,
 client_request_id uuid not null default gen_random_uuid(),
 request_session_id uuid not null references public.sessions(id),
 cancelled_by uuid not null references public.profiles(id),
 created_at timestamptz not null default now()
);
create index session_cancellations_batch on private.session_cancellations(batch_id,cancelled_by);
create index session_cancellations_request_id on private.session_cancellations(cancelled_by,client_request_id);
create index session_cancellations_actor on private.session_cancellations(cancelled_by);
create index session_cancellations_request on private.session_cancellations(request_session_id);
alter table private.session_cancellations enable row level security;
revoke all on private.session_cancellations from public,anon,authenticated;
grant select on private.session_cancellations to service_role;
insert into private.notification_types values ('session_cancellations','player',true,5);
alter table private.app_notifications add column cancellation_id uuid references private.session_cancellations(id);
alter table private.app_notifications add column recipient_status text check (recipient_status in ('confirmed','waitlisted'));
alter table private.app_notifications drop constraint app_notifications_notification_type_check;
alter table private.app_notifications add constraint app_notifications_notification_type_check
 check(notification_type in ('review_reminders','new_reviews','session_announcements','session_cancellations'));
alter table private.app_notifications add constraint cancellation_notification_target
 check ((notification_type='session_cancellations')=(cancellation_id is not null) and (notification_type='session_cancellations')=(recipient_status is not null));
create index app_notifications_cancellation on private.app_notifications(cancellation_id,recipient_id);
-- A batch creates one inbox entry per occurrence but only one push per recipient/device.
alter table private.notification_push_jobs add column cancellation_batch_id uuid;
create unique index cancellation_push_batch_device on private.notification_push_jobs(cancellation_batch_id,recipient_id,installation_id) where cancellation_batch_id is not null;

-- Replace the existing trigger, preserving its check-in clearing/history behavior.
-- Snapshot recipients before registrations are cancelled. This also covers older callers.
create or replace function private.cancel_session_registrations() returns trigger
language plpgsql security definer set search_path='' as $$
declare event_id uuid;begin
 if new.status='cancelled' and old.status<>'cancelled' then
  insert into private.session_cancellations(session_id,batch_id,request_session_id,cancelled_by,created_at)
  values(new.id,gen_random_uuid(),new.id,new.organizer_id,new.cancelled_at)
  on conflict(session_id) do nothing;
  select id into event_id from private.session_cancellations where session_id=new.id;
  insert into private.app_notifications(recipient_id,notification_type,registration_id,cancellation_id,recipient_status,deduplication_key)
  select player_id,'session_cancellations',id,event_id,status,'session_cancelled:'||event_id||':'||player_id
  from public.registrations where session_id=new.id and status in ('confirmed','waitlisted') and player_id<>new.organizer_id
  on conflict(deduplication_key) do nothing;
  update public.registrations set status='cancelled',cancelled_at=new.cancelled_at,
   cancelled_by=new.organizer_id,cancellation_reason=new.cancellation_reason,checked_in_at=null,checked_in_by=null
   where session_id=new.id and status in ('confirmed','waitlisted');
 end if;return new;
end$$;

create function private.cancellation_context(p_session uuid,p_event uuid default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare s public.sessions; event private.session_cancellations; recipient private.app_notifications;begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
 select * into s from public.sessions where id=p_session;
 if p_event is not null then
  select * into event from private.session_cancellations where id=p_event and session_id=p_session;
  select * into recipient from private.app_notifications where cancellation_id=p_event and recipient_id=auth.uid();
  if event.id is null or (s.organizer_id<>auth.uid() and recipient.id is null) then raise exception 'Cancellation unavailable' using errcode='42501';end if;
 elsif s.id is null or s.organizer_id<>auth.uid() then raise exception 'Session unavailable' using errcode='42501';end if;
 return (select jsonb_build_object('session_id',s.id,'session_title',s.title,'organizer_id',s.organizer_id,
 'starts_at',s.starts_at,'ends_at',s.ends_at,'timezone',ss.timezone,'venue_name',v.name,
 'host_name',btrim(concat_ws(' ',p.first_name,p.last_name)),'host_avatar_url',p.avatar_url,
 'updated_at',s.updated_at,'can_cancel',s.status='published' and s.starts_at>now() and s.organizer_id=auth.uid() and exists(select 1 from public.organizers where profile_id=auth.uid() and status='active'),
 'confirmed_count',case when event.id is null then (select count(*) from public.registrations where session_id=s.id and status='confirmed' and player_id<>s.organizer_id) else (select count(*) from private.app_notifications where cancellation_id=event.id and recipient_status='confirmed') end,
 'waitlisted_count',case when event.id is null then (select count(*) from public.registrations where session_id=s.id and status='waitlisted' and player_id<>s.organizer_id) else (select count(*) from private.app_notifications where cancellation_id=event.id and recipient_status='waitlisted') end,
 'recipients',case when s.organizer_id=auth.uid() and event.id is null then coalesce((select jsonb_agg(to_jsonb(q)) from (select r.player_id as id,btrim(concat_ws(' ',pr.first_name,pr.last_name)) as name,pr.avatar_url as image_url from public.registrations r join public.profiles pr on pr.id=r.player_id where r.session_id=s.id and r.status in ('confirmed','waitlisted') and r.player_id<>s.organizer_id order by r.created_at,r.id limit 5)q),'[]') else '[]'::jsonb end,
 'cancellation_id',event.id,'cancelled_at',s.cancelled_at,'reason_code',case when event.id is not null then coalesce(s.cancellation_reason_code,'other') end,
 'message',s.cancellation_reason,'recipient_status',recipient.recipient_status)
 from public.session_series ss join public.venues v on v.id=s.venue_id join public.profiles p on p.id=s.organizer_id where ss.id=s.series_id);
end$$;
create function public.get_session_cancellation_context(p_session uuid) returns jsonb language sql security invoker set search_path='' as $$select private.cancellation_context(p_session)$$;
create function private.get_session_cancellation(p_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$declare session_id uuid;begin
 select c.session_id into session_id from private.session_cancellations c where c.id=p_id;
 if session_id is null then raise exception 'Cancellation unavailable' using errcode='42501';end if;
 return private.cancellation_context(session_id,p_id);
end$$;
create function public.get_session_cancellation(p_id uuid) returns jsonb language sql security invoker set search_path='' as $$select private.get_session_cancellation(p_id)$$;

-- Backend retains future scope; the application repository always supplies 'one'.
create function private.cancel_session_occurrences(p_session uuid,p_scope text,p_reason_code text,p_message text,p_expected_version timestamptz,p_request uuid,p_expected_count integer default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare target public.sessions; s public.sessions; event private.session_cancellations; affected integer:=0; audience integer; message text; batch uuid:=gen_random_uuid();begin
 if auth.uid() is null or not exists(select 1 from public.organizers where profile_id=auth.uid() and status='active') then raise exception 'Organizer access required' using errcode='42501';end if;
 if p_scope is null or p_scope not in ('one','future') then raise exception 'Choose a cancellation scope';end if;
 if p_reason_code is null or p_reason_code not in ('weather','venue_issue','host_emergency','insufficient_players','other') then raise exception 'Choose a cancellation reason';end if;
 message:=nullif(regexp_replace(coalesce(p_message,''),'^[[:space:]]+|[[:space:]]+$','','g'),'');
 if char_length(message)>1000 then raise exception 'Use up to 1,000 characters';end if;
 if p_request is null then raise exception 'Cancellation request required';end if;
 -- Same series -> occurrences -> registrations lock order as saves and roster changes.
 perform ss.id from public.session_series ss join public.sessions x on x.series_id=ss.id where x.id=p_session and x.organizer_id=auth.uid() for update of ss;
 select * into target from public.sessions where id=p_session and organizer_id=auth.uid() for update;
 if target.id is null then raise exception 'Session unavailable' using errcode='42501';end if;
 if exists(select 1 from private.session_cancellations where client_request_id=p_request and cancelled_by=auth.uid()) then
  select * into event from private.session_cancellations where client_request_id=p_request and session_id=p_session and request_session_id=p_session and cancelled_by=auth.uid();
  if event.id is null or target.cancellation_reason_code is distinct from p_reason_code or target.cancellation_reason is distinct from message then raise exception 'Cancellation request already used';end if;
  return private.cancellation_context(target.id,event.id)||jsonb_build_object('cancelled_count',(select count(*) from private.session_cancellations where client_request_id=p_request and cancelled_by=auth.uid()));
 end if;
 if target.status<>'published' or target.starts_at<=now() then raise exception 'This session can no longer be changed';end if;
 if p_expected_version is null or target.updated_at<>p_expected_version then raise exception 'Session changed. Reload before saving';end if;
 perform 1 from public.registrations where session_id=target.id for update;
 select count(*) into audience from public.registrations where session_id=target.id and status in ('confirmed','waitlisted') and player_id<>target.organizer_id;
 if p_expected_count is not null and p_expected_count<>audience then raise exception 'The recipient count changed. Review the updated count and try again';end if;
 for s in select * from public.sessions where series_id=target.series_id and organizer_id=auth.uid() and status='published' and starts_at>now() and (id=target.id or (p_scope='future' and occurrence_date>=target.occurrence_date)) order by id for update loop
  insert into private.session_cancellations(session_id,batch_id,client_request_id,request_session_id,cancelled_by) values(s.id,batch,p_request,target.id,auth.uid());
  update public.sessions set status='cancelled',cancelled_at=now(),cancellation_reason_code=p_reason_code,cancellation_reason=message where id=s.id;
  affected:=affected+1;
 end loop;
 select * into event from private.session_cancellations where session_id=target.id;
 return private.cancellation_context(target.id,event.id)||jsonb_build_object('cancelled_count',affected);
end$$;
create function public.cancel_session_occurrences(p_session uuid,p_scope text,p_reason_code text,p_message text,p_expected_version timestamptz,p_request uuid,p_expected_count integer default null) returns jsonb language sql security invoker set search_path='' as $$select private.cancel_session_occurrences(p_session,p_scope,p_reason_code,p_message,p_expected_version,p_request,p_expected_count)$$;
-- Compatibility entry point also produces recipient snapshots and inbox notifications.
create or replace function public.cancel_organizer_session(p_session_id uuid,p_scope text,p_reason text,p_expected_version timestamptz) returns integer language sql security invoker set search_path='' as $$
 select (private.cancel_session_occurrences(p_session_id,p_scope,'other',p_reason,p_expected_version,gen_random_uuid())->>'cancelled_count')::integer
$$;
do $$declare signature text;begin
 foreach signature in array array['cancellation_context(uuid,uuid)','get_session_cancellation(uuid)','cancel_session_occurrences(uuid,text,text,text,timestamptz,uuid,integer)'] loop
 execute 'revoke all on function private.'||signature||' from public,anon';execute 'grant execute on function private.'||signature||' to authenticated';end loop;
 foreach signature in array array['get_session_cancellation_context(uuid)','get_session_cancellation(uuid)','cancel_session_occurrences(uuid,text,text,text,timestamptz,uuid,integer)'] loop
 execute 'revoke all on function public.'||signature||' from public,anon';execute 'grant execute on function public.'||signature||' to authenticated';end loop;
end$$;

create or replace function private.notification_inbox(p_mode text,p_unread boolean default false,p_before timestamptz default null,p_before_id uuid default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$begin
 if auth.uid() is null or p_mode is null or p_mode not in ('player','organizer') then raise exception 'Authentication required' using errcode='42501';end if;
 if p_mode='organizer' and not exists(select 1 from public.organizers where profile_id=auth.uid() and status='active') then raise exception 'Organizer access required' using errcode='42501';end if;
 return (select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at desc,q.id desc),'[]') from (
 select n.id,n.notification_type,n.registration_id,n.review_id,n.announcement_id,n.cancellation_id,n.recipient_status,s.cancellation_reason_code,n.created_at,n.read_at,s.id as session_id,s.title as session_title,s.ends_at+interval '14 days' as deadline,
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
end$$;
create or replace function private.notification_target(p_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$declare result jsonb;begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
 select jsonb_build_object('id',n.id,'registration_id',n.registration_id,'announcement_id',n.announcement_id,'cancellation_id',n.cancellation_id,'mode',t.audience) into result from private.app_notifications n join private.notification_types t on t.key=n.notification_type where n.id=p_id and n.recipient_id=auth.uid();
 if result is null then raise exception 'Notification unavailable' using errcode='42501';end if;return result;
end$$;
create or replace function private.push_subscription_state() returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
 return jsonb_build_object('session_cancellations',private.notification_push_enabled(auth.uid(),'session_cancellations'),'chat_messages',private.notification_push_enabled(auth.uid(),'chat_messages'),'review_reminders',private.notification_push_enabled(auth.uid(),'review_reminders'),'new_reviews',exists(select 1 from public.organizers where profile_id=auth.uid() and status='active') and private.notification_push_enabled(auth.uid(),'new_reviews'),'session_announcements',private.notification_push_enabled(auth.uid(),'session_announcements'));
end$$;

create function private.cancellation_push_deliverable(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.app_notifications leader join private.session_cancellations batch on batch.id=leader.cancellation_id
 join private.session_cancellations c on c.batch_id=batch.batch_id join private.app_notifications n on n.cancellation_id=c.id and n.recipient_id=leader.recipient_id
 join public.sessions s on s.id=c.session_id join public.registrations r on r.id=n.registration_id
 where leader.id=p_id and n.notification_type='session_cancellations' and n.read_at is null and s.status='cancelled' and r.player_id=n.recipient_id
 and private.notification_push_enabled(n.recipient_id,'session_cancellations'))
$$;
revoke all on function private.cancellation_push_deliverable(uuid) from public,anon,authenticated;
grant execute on function private.cancellation_push_deliverable(uuid) to service_role;
create or replace function private.review_notification_deliverable(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.cancellation_push_deliverable(p_id) or exists(select 1 from private.app_notifications n join public.registrations r on r.id=n.registration_id join public.sessions s on s.id=r.session_id left join public.session_reviews v on v.registration_id=r.id left join public.session_announcements a on a.id=n.announcement_id
 where n.id=p_id and n.read_at is null and private.notification_push_enabled(n.recipient_id,n.notification_type) and (
 (n.notification_type='review_reminders' and r.player_id=n.recipient_id and r.status='confirmed' and s.status='completed' and s.ends_at<=now() and now()<s.ends_at+interval '14 days' and v.id is null)
 or (n.notification_type='new_reviews' and v.id=n.review_id and v.status='published' and v.organizer_id=n.recipient_id)
 or (n.notification_type='session_announcements' and a.removed_at is null and s.status='published' and s.ends_at>now() and r.status='confirmed' and r.player_id=n.recipient_id and exists(select 1 from private.session_announcement_recipients x where x.announcement_id=a.id and x.recipient_id=n.recipient_id))))
$$;

create or replace function private.enqueue_review_notification_push() returns trigger language plpgsql security definer set search_path='' as $$declare batch uuid;begin
 if private.review_notification_deliverable(new.id) then
  select batch_id into batch from private.session_cancellations where id=new.cancellation_id;
  insert into private.notification_push_jobs(notification_id,installation_id,recipient_id,expo_token,cancellation_batch_id)
  select new.id,installation_id,new.recipient_id,expo_token,batch from private.chat_push_devices
  where profile_id=new.recipient_id and enabled and updated_at>now()-interval '60 days' on conflict do nothing;
 end if;return new;
end$$;
create or replace function public.claim_review_notification_push_jobs() returns jsonb language sql security invoker set search_path='' as $$
 with stale as (
 update private.notification_push_jobs j set state='skipped' where j.state in ('pending','sending') and (j.created_at<now()-interval '24 hours' or not private.review_notification_deliverable(j.notification_id) or not exists(select 1 from private.chat_push_devices d where d.installation_id=j.installation_id and d.profile_id=j.recipient_id and d.expo_token=j.expo_token and d.enabled and d.updated_at>now()-interval '60 days')) returning id
 ),candidates as(select id from private.notification_push_jobs where state in ('pending','sending') and available_at<=now() and attempts<5 and id not in(select id from stale) order by created_at for update skip locked limit 100),
 claimed as(update private.notification_push_jobs set state='sending',attempts=attempts+1,available_at=now()+interval '2 minutes' where id in(select id from candidates) returning *)
 select coalesce(jsonb_agg(jsonb_build_object('id',j.id,'attempt',j.attempts,'token',j.expo_token,'notification_id',coalesce(unread_target.id,n.id),'recipient_id',j.recipient_id,'mode',t.audience,'kind',n.notification_type,
 'title',case n.notification_type when 'review_reminders' then 'How was your session?' when 'session_cancellations' then case when batch_count.total>1 then batch_count.total||' sessions cancelled' else 'Session cancelled' end when 'session_announcements' then 'Announcement from '||h.first_name else 'You received a new review' end,
 'body',case n.notification_type when 'review_reminders' then 'Share your experience at '||s.title||'.' when 'session_cancellations' then case when batch_count.total>1 then h.first_name||' cancelled '||batch_count.total||' sessions you joined or waitlisted for.' else s.title||' has been cancelled.' end when 'session_announcements' then s.title||': '||a.body else btrim(concat_ws(' ',p.first_name,p.last_name))||' reviewed '||s.title||'.' end)),'[]')
 from claimed j join private.app_notifications n on n.id=j.notification_id join private.notification_types t on t.key=n.notification_type join public.registrations r on r.id=n.registration_id join public.sessions s on s.id=r.session_id join public.profiles p on p.id=r.player_id join public.profiles h on h.id=s.organizer_id left join public.session_announcements a on a.id=n.announcement_id
 left join lateral(select count(*)::integer as total from private.session_cancellations c join private.app_notifications nn on nn.cancellation_id=c.id where c.batch_id=j.cancellation_batch_id and nn.recipient_id=j.recipient_id) batch_count on true
 left join lateral(select nn.id from private.session_cancellations c join private.app_notifications nn on nn.cancellation_id=c.id where c.batch_id=j.cancellation_batch_id and nn.recipient_id=j.recipient_id and nn.read_at is null order by nn.created_at,nn.id limit 1) unread_target on true
$$;
