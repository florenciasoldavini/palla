-- Announcements are immutable messages for one dated occurrence. Client access is RPC-only.
create table public.session_announcements (
 id uuid primary key default gen_random_uuid(),
 session_id uuid not null references public.sessions(id),
 author_id uuid not null references public.profiles(id),
 body text not null check (char_length(body) between 1 and 1000),
 client_request_id uuid not null,
 created_at timestamptz not null default now(),
 removed_at timestamptz,
 unique(author_id,client_request_id)
);
create index session_announcements_session on public.session_announcements(session_id,created_at desc,id desc);
alter table public.session_announcements enable row level security;
revoke all on public.session_announcements from public,anon,authenticated;
create table private.session_announcement_recipients (
 announcement_id uuid not null references public.session_announcements(id),
 recipient_id uuid not null references public.profiles(id),
 registration_id uuid not null references public.registrations(id),
 primary key(announcement_id,recipient_id)
);
create index announcement_recipients_profile on private.session_announcement_recipients(recipient_id,announcement_id);
create index announcement_recipients_registration on private.session_announcement_recipients(registration_id);
alter table private.session_announcement_recipients enable row level security;
revoke all on private.session_announcement_recipients from public,anon,authenticated;
insert into private.notification_types values ('session_announcements','player',true,4);
alter table private.app_notifications add column announcement_id uuid references public.session_announcements(id);
alter table private.app_notifications drop constraint app_notifications_notification_type_check;
alter table private.app_notifications add constraint app_notifications_notification_type_check check(notification_type in ('review_reminders','new_reviews','session_announcements'));
alter table private.app_notifications add constraint announcement_notification_target check ((notification_type='session_announcements')=(announcement_id is not null));
create index app_notifications_announcement on private.app_notifications(announcement_id);

create function private.can_read_announcement(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists (
 select 1 from public.session_announcements a join public.sessions s on s.id=a.session_id
 where a.id=p_id and (s.organizer_id=auth.uid()
 or exists(select 1 from private.session_announcement_recipients x where x.announcement_id=a.id and x.recipient_id=auth.uid())
 or exists(select 1 from public.registrations r where r.session_id=s.id and r.player_id=auth.uid() and r.status='confirmed')))
$$;
create function private.announcement_context(p_session uuid,p_announcement uuid default null) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare s public.sessions; result jsonb;begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
 select * into s from public.sessions where id=p_session;
 if s.id is null then raise exception 'Session unavailable' using errcode='42501';end if;
 if s.organizer_id<>auth.uid() and not (
  exists(select 1 from public.registrations where session_id=s.id and player_id=auth.uid() and status='confirmed')
  or exists(select 1 from public.session_announcements a join private.session_announcement_recipients x on x.announcement_id=a.id where a.session_id=s.id and x.recipient_id=auth.uid())
 ) then raise exception 'Announcement unavailable' using errcode='42501';end if;
 if p_announcement is not null and not private.can_read_announcement(p_announcement) then raise exception 'Announcement unavailable' using errcode='42501';end if;
 select jsonb_build_object('session_id',s.id,'session_title',s.title,'organizer_id',s.organizer_id,
 'starts_at',s.starts_at,'ends_at',s.ends_at,'timezone',coalesce(ss.timezone,'America/Argentina/Buenos_Aires'),
 'host_name',btrim(concat_ws(' ',p.first_name,p.last_name)),'host_avatar_url',p.avatar_url,
 'can_send',s.organizer_id=auth.uid() and s.status='published' and s.ends_at>now() and exists(select 1 from public.organizers where profile_id=auth.uid() and status='active'),
 'recipient_count',(select count(*) from public.registrations where session_id=s.id and status='confirmed' and player_id<>s.organizer_id),
 'announcements',coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'body',case when a.removed_at is null then a.body else null end,'created_at',a.created_at,'removed_at',a.removed_at,
 'recipient_count',case when s.organizer_id=auth.uid() then (select count(*) from private.session_announcement_recipients x where x.announcement_id=a.id) else null end) order by a.created_at desc,a.id desc)
 from public.session_announcements a where a.session_id=s.id and (p_announcement is null or a.id=p_announcement) and private.can_read_announcement(a.id)),'[]'::jsonb)) into result
 from public.profiles p left join public.session_series ss on ss.id=s.series_id where p.id=s.organizer_id;
 return result;
end$$;
create function public.get_session_announcements(p_session uuid) returns jsonb language sql security invoker set search_path='' as $$select private.announcement_context(p_session)$$;
create function private.get_announcement(p_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$declare s uuid;begin
 if not private.can_read_announcement(p_id) then raise exception 'Announcement unavailable' using errcode='42501';end if;
 select session_id into s from public.session_announcements where id=p_id;
 return private.announcement_context(s,p_id);
end$$;
create function public.get_session_announcement(p_id uuid) returns jsonb language sql security invoker set search_path='' as $$select private.get_announcement(p_id)$$;

create function private.publish_session_announcement(p_session uuid,p_body text,p_request uuid,p_expected_count integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.sessions; a public.session_announcements; audience integer;begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
 -- Serialize host sends across sessions as well as retries; enforce a small server-side flood limit.
 perform 1 from public.organizers where profile_id=auth.uid() and status='active' for update;
 if not found then raise exception 'Organizer access required' using errcode='42501';end if;
 select * into s from public.sessions where id=p_session for update;
 if s.id is null or s.organizer_id<>auth.uid() then raise exception 'Session unavailable' using errcode='42501';end if;
 if p_request is null or p_body is null or char_length(btrim(p_body)) not between 1 and 1000 then raise exception 'Write a message of up to 1,000 characters';end if;
 select * into a from public.session_announcements where author_id=auth.uid() and client_request_id=p_request;
 if a.id is not null then
  if a.session_id<>s.id or (a.removed_at is null and a.body<>btrim(p_body)) then raise exception 'Send request already used';end if;
  return private.announcement_context(s.id,a.id);
 end if;
 if s.status<>'published' or s.ends_at<=now() then raise exception 'Announcements are only available before the session ends';end if;
 if (select count(*) from public.session_announcements where author_id=auth.uid() and created_at>now()-interval '1 minute')>=10 then raise exception 'Please wait a minute before sending another announcement';end if;
 -- Lock the recipient registrations while the immutable audience snapshot is taken.
 perform 1 from public.registrations where session_id=s.id and status='confirmed' and player_id<>s.organizer_id for share;
 select count(*) into audience from public.registrations where session_id=s.id and status='confirmed' and player_id<>s.organizer_id;
 if audience=0 then raise exception 'There are no confirmed players to notify';end if;
 if p_expected_count is distinct from audience then raise exception 'The recipient count changed. Check the updated count and try again';end if;
 insert into public.session_announcements(session_id,author_id,body,client_request_id) values(s.id,auth.uid(),btrim(p_body),p_request) returning * into a;
 insert into private.session_announcement_recipients(announcement_id,recipient_id,registration_id) select a.id,player_id,id from public.registrations where session_id=s.id and status='confirmed' and player_id<>s.organizer_id;
 insert into private.app_notifications(recipient_id,notification_type,registration_id,announcement_id,deduplication_key)
 select recipient_id,'session_announcements',registration_id,a.id,'announcement:'||a.id||':'||recipient_id from private.session_announcement_recipients where announcement_id=a.id;
 return private.announcement_context(s.id,a.id);
end$$;
create function public.publish_session_announcement(p_session uuid,p_body text,p_request uuid,p_expected_count integer) returns jsonb language sql security invoker set search_path='' as $$select private.publish_session_announcement(p_session,p_body,p_request,p_expected_count)$$;
create function private.remove_session_announcement(p_id uuid) returns void language plpgsql security definer set search_path='' as $$begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
 update public.session_announcements a set removed_at=coalesce(removed_at,now()),body='This announcement was removed.' where a.id=p_id and a.author_id=auth.uid() and exists(select 1 from public.organizers where profile_id=auth.uid() and status='active');
 if not found then raise exception 'Announcement unavailable' using errcode='42501';end if;
 update private.notification_push_jobs j set state='skipped' from private.app_notifications n where j.notification_id=n.id and n.announcement_id=p_id and j.state in ('pending','sending');
end$$;
create function public.remove_session_announcement(p_id uuid) returns void language sql security invoker set search_path='' as $$select private.remove_session_announcement(p_id)$$;

do $$declare signature text;begin
 foreach signature in array array['announcement_context(uuid,uuid)','get_announcement(uuid)','publish_session_announcement(uuid,text,uuid,integer)','remove_session_announcement(uuid)'] loop
 execute 'revoke all on function private.'||signature||' from public,anon';execute 'grant execute on function private.'||signature||' to authenticated';end loop;
 foreach signature in array array['get_session_announcements(uuid)','get_session_announcement(uuid)','publish_session_announcement(uuid,text,uuid,integer)','remove_session_announcement(uuid)'] loop
 execute 'revoke all on function public.'||signature||' from public,anon';execute 'grant execute on function public.'||signature||' to authenticated';end loop;
end$$;
revoke all on function private.can_read_announcement(uuid) from public,anon;
grant execute on function private.can_read_announcement(uuid) to authenticated;

-- Keep the shared inbox and its keyset pagination; announcements have their own typed target.
create or replace function private.notification_inbox(p_mode text,p_unread boolean default false,p_before timestamptz default null,p_before_id uuid default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$begin
 if auth.uid() is null or p_mode is null or p_mode not in ('player','organizer') then raise exception 'Authentication required' using errcode='42501';end if;
 if p_mode='organizer' and not exists(select 1 from public.organizers where profile_id=auth.uid() and status='active') then raise exception 'Organizer access required' using errcode='42501';end if;
 return (select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at desc,q.id desc),'[]') from (
 select n.id,n.notification_type,n.registration_id,n.review_id,n.announcement_id,n.created_at,n.read_at,s.id as session_id,s.title as session_title,s.ends_at+interval '14 days' as deadline,
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
 select jsonb_build_object('id',n.id,'registration_id',n.registration_id,'announcement_id',n.announcement_id,'mode',t.audience) into result from private.app_notifications n join private.notification_types t on t.key=n.notification_type where n.id=p_id and n.recipient_id=auth.uid();
 if result is null then raise exception 'Notification unavailable' using errcode='42501';end if;return result;
end$$;
create or replace function private.push_subscription_state() returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
 return jsonb_build_object('chat_messages',private.notification_push_enabled(auth.uid(),'chat_messages'),'review_reminders',private.notification_push_enabled(auth.uid(),'review_reminders'),'new_reviews',exists(select 1 from public.organizers where profile_id=auth.uid() and status='active') and private.notification_push_enabled(auth.uid(),'new_reviews'),'session_announcements',private.notification_push_enabled(auth.uid(),'session_announcements'));
end$$;
-- Preserve the existing RPC names for deployed workers and old clients while extending delivery.
create or replace function private.review_notification_deliverable(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.app_notifications n join public.registrations r on r.id=n.registration_id join public.sessions s on s.id=r.session_id left join public.session_reviews v on v.registration_id=r.id left join public.session_announcements a on a.id=n.announcement_id
 where n.id=p_id and n.read_at is null and private.notification_push_enabled(n.recipient_id,n.notification_type) and (
 (n.notification_type='review_reminders' and r.player_id=n.recipient_id and r.status='confirmed' and s.status='completed' and s.ends_at<=now() and now()<s.ends_at+interval '14 days' and v.id is null)
 or (n.notification_type='new_reviews' and v.id=n.review_id and v.status='published' and v.organizer_id=n.recipient_id)
 or (n.notification_type='session_announcements' and a.removed_at is null and s.status='published' and s.ends_at>now() and r.status='confirmed' and r.player_id=n.recipient_id and exists(select 1 from private.session_announcement_recipients x where x.announcement_id=a.id and x.recipient_id=n.recipient_id))))
$$;
create or replace function public.claim_review_notification_push_jobs() returns jsonb language sql security invoker set search_path='' as $$
 with stale as (
 update private.notification_push_jobs j set state='skipped' where j.state in ('pending','sending') and (j.created_at<now()-interval '24 hours' or not private.review_notification_deliverable(j.notification_id) or not exists(select 1 from private.chat_push_devices d where d.installation_id=j.installation_id and d.profile_id=j.recipient_id and d.expo_token=j.expo_token and d.enabled and d.updated_at>now()-interval '60 days')) returning id
 ),candidates as(select id from private.notification_push_jobs where state in ('pending','sending') and available_at<=now() and attempts<5 and id not in(select id from stale) order by created_at for update skip locked limit 100),
 claimed as(update private.notification_push_jobs set state='sending',attempts=attempts+1,available_at=now()+interval '2 minutes' where id in(select id from candidates) returning *)
 select coalesce(jsonb_agg(jsonb_build_object('id',j.id,'attempt',j.attempts,'token',j.expo_token,'notification_id',n.id,'recipient_id',j.recipient_id,'mode',t.audience,'kind',n.notification_type,
 'title',case n.notification_type when 'review_reminders' then 'How was your session?' when 'session_announcements' then 'Announcement from '||h.first_name else 'You received a new review' end,
 'body',case n.notification_type when 'review_reminders' then 'Share your experience at '||s.title||'.' when 'session_announcements' then s.title||': '||a.body else btrim(concat_ws(' ',p.first_name,p.last_name))||' reviewed '||s.title||'.' end)),'[]')
 from claimed j join private.app_notifications n on n.id=j.notification_id join private.notification_types t on t.key=n.notification_type join public.registrations r on r.id=n.registration_id join public.sessions s on s.id=r.session_id join public.profiles p on p.id=r.player_id join public.profiles h on h.id=s.organizer_id left join public.session_announcements a on a.id=n.announcement_id
$$;
grant select on public.session_announcements,private.session_announcement_recipients to service_role;
