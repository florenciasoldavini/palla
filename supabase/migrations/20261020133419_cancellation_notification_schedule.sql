-- Schedule context for typed cancellation inbox rows; no extra client request.
create or replace function private.notification_inbox(p_mode text,p_unread boolean default false,p_before timestamptz default null,p_before_id uuid default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$begin
 if auth.uid() is null or p_mode is null or p_mode not in ('player','organizer') then raise exception 'Authentication required' using errcode='42501';end if;
 if p_mode='organizer' and not exists(select 1 from public.organizers where profile_id=auth.uid() and status='active') then raise exception 'Organizer access required' using errcode='42501';end if;
 return (select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at desc,q.id desc),'[]') from (
 select n.id,n.notification_type,n.registration_id,n.review_id,n.announcement_id,n.cancellation_id,n.recipient_status,s.cancellation_reason_code,s.starts_at as session_starts_at,s.ends_at as session_ends_at,(select ss.timezone from public.session_series ss where ss.id=s.series_id) as session_timezone,n.created_at,n.read_at,s.id as session_id,s.title as session_title,s.ends_at+interval '14 days' as deadline,
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
