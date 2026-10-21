-- The catalog owns visibility/defaults. Preserve every existing chat opt-out.
create table private.notification_types (
 key text primary key, audience text not null check(audience in ('shared','player','organizer')),
 default_push_enabled boolean not null default true, sort_order integer not null
);
insert into private.notification_types values ('chat_messages','shared',true,1),('review_reminders','player',true,2),('new_reviews','organizer',true,3);
alter table private.notification_types enable row level security;
revoke all on private.notification_types from public,anon,authenticated;
alter table private.notification_preferences add column notification_type text not null default 'chat_messages' references private.notification_types(key);
alter table private.notification_preferences rename column chat_messages to push_enabled;
alter table private.notification_preferences drop constraint notification_preferences_pkey;
alter table private.notification_preferences add primary key(profile_id,notification_type);
create function private.notification_push_enabled(p_profile uuid,p_type text) returns boolean
language sql stable security definer set search_path='' as $$
 select coalesce((select p.push_enabled from private.notification_preferences p where p.profile_id=p_profile and p.notification_type=p_type),(select t.default_push_enabled from private.notification_types t where t.key=p_type),false)
$$;
revoke all on function private.notification_push_enabled(uuid,text) from public,anon,authenticated;
grant execute on function private.notification_push_enabled(uuid,text) to service_role;
create or replace function private.get_chat_notification_preference() returns boolean
language plpgsql security definer set search_path='' as $$begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
 return private.notification_push_enabled(auth.uid(),'chat_messages');
end$$;
create function private.notification_settings(p_mode text) returns jsonb
language plpgsql stable security definer set search_path='' as $$begin
 if auth.uid() is null or p_mode not in ('player','organizer') or p_mode is null then raise exception 'Invalid settings request' using errcode='42501';end if;
 if p_mode='organizer' and not exists(select 1 from public.organizers where profile_id=auth.uid() and status='active') then raise exception 'Organizer access required' using errcode='42501';end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('key',t.key,'audience',t.audience,'push_enabled',private.notification_push_enabled(auth.uid(),t.key)) order by t.sort_order),'[]') from private.notification_types t where t.audience in ('shared',p_mode));
end$$;
create function public.get_notification_settings(p_mode text) returns jsonb language sql security invoker set search_path='' as $$select private.notification_settings(p_mode)$$;

-- No attendance state is changed by reviews. One immutable registration association.
alter table public.sessions add column completed_at timestamptz;
create or replace function private.guard_session_change() returns trigger language plpgsql security invoker set search_path='' as $$begin
 if new.organizer_id<>old.organizer_id or new.id<>old.id then raise exception 'Session ownership cannot change';end if;
 if tg_table_name='sessions' then
  if new.series_id<>old.series_id or new.occurrence_date<>old.occurrence_date then raise exception 'Occurrence identity cannot change';end if;
  if current_user not in ('anon','authenticated') and old.status='published' and new.status='completed' and old.ends_at<=now()
   and (to_jsonb(new)-array['status','completed_at','updated_at'])=(to_jsonb(old)-array['status','completed_at','updated_at']) then
   new.completed_at:=clock_timestamp();new.updated_at:=clock_timestamp();return new;
  end if;
  if new.completed_at is distinct from old.completed_at or new.status='completed' or old.status<>'published' or old.starts_at<=now() or new.starts_at<=now() then raise exception 'This session can no longer be changed';end if;
 elsif new.status<>old.status then
  if not ((old.status='draft' and new.status='active') or (old.status='active' and new.status in ('paused','ended')) or (old.status='paused' and new.status in ('active','ended'))) then raise exception 'Invalid series transition';end if;
 end if;
 new.updated_at:=clock_timestamp();return new;
end$$;
create table public.session_reviews (
 id uuid primary key default gen_random_uuid(), registration_id uuid not null unique references public.registrations(id),
 session_id uuid not null references public.sessions(id), organizer_id uuid not null references public.profiles(id), reviewer_id uuid not null references public.profiles(id),
 rating smallint not null check(rating between 1 and 5), comment text check(char_length(comment)<=2000),
 status text not null default 'published' check(status in ('published','hidden','removed')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default clock_timestamp(),
 check(organizer_id<>reviewer_id)
);
create index session_reviews_host on public.session_reviews(organizer_id,created_at desc) where status='published';
create index session_reviews_session on public.session_reviews(session_id,created_at desc) where status='published';
create index session_reviews_reviewer on public.session_reviews(reviewer_id);
alter table public.session_reviews enable row level security;
revoke all on public.session_reviews from public,anon,authenticated;
grant select on public.session_reviews to anon,authenticated;
create policy reviews_visible on public.session_reviews for select to anon,authenticated using(status='published' or reviewer_id=(select auth.uid()) or organizer_id=(select auth.uid()));
create table private.review_reports (
 id uuid primary key default gen_random_uuid(),review_id uuid not null unique references public.session_reviews(id), reporter_id uuid not null references public.profiles(id),
 reason text not null check(reason in ('harassment','personal_information','spam','manipulation','other')),details text check(char_length(details)<=2000),
 snapshot jsonb not null,status text not null default 'pending' check(status in ('pending','dismissed','action_taken')),
 created_at timestamptz not null default now(),resolved_at timestamptz,moderator_id uuid references public.profiles(id),moderation_note text
);
create index review_reports_reporter on private.review_reports(reporter_id);
create table private.review_moderation_log (
 id uuid primary key default gen_random_uuid(),review_id uuid not null references public.session_reviews(id),moderator_id uuid not null references public.profiles(id),
 action text not null check(action in ('hide','restore','dismiss')),note text not null check(char_length(btrim(note)) between 1 and 2000),snapshot jsonb not null,created_at timestamptz not null default now()
);
create index review_moderation_log_review on private.review_moderation_log(review_id);
alter table private.review_reports enable row level security;alter table private.review_moderation_log enable row level security;
revoke all on private.review_reports,private.review_moderation_log from public,anon,authenticated;

create table private.app_notifications (
 id uuid primary key default gen_random_uuid(),recipient_id uuid not null references public.profiles(id) on delete cascade,
 notification_type text not null references private.notification_types(key) check(notification_type in ('review_reminders','new_reviews')),
 registration_id uuid not null references public.registrations(id),review_id uuid references public.session_reviews(id),
 deduplication_key text not null unique,created_at timestamptz not null default now(),read_at timestamptz
);
create index app_notifications_inbox on private.app_notifications(recipient_id,created_at desc,id desc);
create index app_notifications_registration on private.app_notifications(registration_id);
create index app_notifications_review on private.app_notifications(review_id);
alter table private.app_notifications enable row level security;
revoke all on private.app_notifications from public,anon,authenticated;
create table private.notification_push_jobs (
 id uuid primary key default gen_random_uuid(),notification_id uuid not null references private.app_notifications(id) on delete cascade,
 installation_id uuid not null references private.chat_push_devices(installation_id) on delete cascade,recipient_id uuid not null references public.profiles(id) on delete cascade,expo_token text not null,
 state text not null default 'pending' check(state in ('pending','sending','ticket','sent','failed','skipped')),
 attempts integer not null default 0,available_at timestamptz not null default now(),created_at timestamptz not null default now(),ticket_id text,error_code text,
 unique(notification_id,installation_id)
);
create index notification_push_jobs_work on private.notification_push_jobs(state,available_at);
create index notification_push_jobs_installation on private.notification_push_jobs(installation_id);
create index notification_push_jobs_recipient on private.notification_push_jobs(recipient_id);
alter table private.notification_push_jobs enable row level security;
revoke all on private.notification_push_jobs from public,anon,authenticated;
grant select,update,delete on private.notification_push_jobs to service_role;
grant select on private.app_notifications,private.notification_types,public.session_reviews,private.review_reports to service_role;

create function private.set_notification_preference(p_type text,p_enabled boolean) returns boolean
language plpgsql security definer set search_path='' as $$declare audience text;begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and onboarding_completed_at is not null) then raise exception 'Authentication required' using errcode='42501';end if;
 select t.audience into audience from private.notification_types t where t.key=p_type;
 if audience is null or p_enabled is null then raise exception 'Invalid preference' using errcode='22023';end if;
 if audience='organizer' and not exists(select 1 from public.organizers where profile_id=auth.uid() and status='active') then raise exception 'Organizer access required' using errcode='42501';end if;
 insert into private.notification_preferences(profile_id,notification_type,push_enabled) values(auth.uid(),p_type,p_enabled)
 on conflict(profile_id,notification_type) do update set push_enabled=excluded.push_enabled;
 if not p_enabled then
  if p_type='chat_messages' then update private.chat_push_jobs set state='skipped' where recipient_id=auth.uid() and state in ('pending','sending');
  else update private.notification_push_jobs j set state='skipped' from private.app_notifications n where j.notification_id=n.id and j.recipient_id=auth.uid() and n.notification_type=p_type and j.state in ('pending','sending');end if;
 end if;return p_enabled;
end$$;
create function public.set_notification_preference(p_type text,p_enabled boolean) returns boolean language sql security invoker set search_path='' as $$select private.set_notification_preference(p_type,p_enabled)$$;
create or replace function private.set_chat_notification_preference(p_enabled boolean) returns boolean language sql security invoker set search_path='' as $$select private.set_notification_preference('chat_messages',p_enabled)$$;
-- Existing chat enqueue/worker must use the migrated catalog/override structure.
create or replace function private.enqueue_chat_push() returns trigger language plpgsql security definer set search_path='' as $$declare recipient uuid;begin
 select case when organizer_id=new.sender_id then player_id else organizer_id end into recipient from public.chat_conversations where id=new.conversation_id;
 if not private.notification_push_enabled(recipient,'chat_messages') then return new;end if;
 insert into private.chat_push_jobs(message_id,installation_id,recipient_id,expo_token) select new.id,installation_id,recipient,expo_token from private.chat_push_devices where profile_id=recipient and enabled and updated_at>now()-interval '60 days';return new;
end$$;

create or replace function public.claim_chat_push_jobs() returns jsonb
language sql security invoker set search_path='' as $$
 with stale as (
  update private.chat_push_jobs j set state='skipped'
  where j.state in ('pending','sending') and (j.created_at<now()-interval '24 hours' or not exists(
   select 1 from private.chat_push_devices d join public.chat_messages m on m.id=j.message_id
   left join public.chat_reads r on r.conversation_id=m.conversation_id and r.profile_id=j.recipient_id
   left join public.chat_preferences p on p.conversation_id=m.conversation_id and p.profile_id=j.recipient_id
   where d.installation_id=j.installation_id and d.profile_id=j.recipient_id and d.enabled and d.expo_token=j.expo_token
    and private.notification_push_enabled(j.recipient_id,'chat_messages')
    and d.updated_at>now()-interval '60 days' and m.deleted_at is null and not private.chat_pair_blocked(m.sender_id,j.recipient_id)
    and m.sequence>greatest(coalesce(r.through_sequence,0),coalesce(p.cleared_through_sequence,0))
  )) returning id
 ), candidates as (
  select id from private.chat_push_jobs where state in ('pending','sending') and available_at<=now() and attempts<5
   and id not in(select id from stale) order by created_at for update skip locked limit 100
 ), claimed as (
  update private.chat_push_jobs j set state='sending',attempts=attempts+1,available_at=now()+interval '2 minutes'
  where id in(select id from candidates) returning j.*
 ) select coalesce(jsonb_agg(jsonb_build_object('id',j.id,'attempt',j.attempts,'token',j.expo_token,'conversation_id',m.conversation_id,'message_id',m.id,'recipient_id',j.recipient_id,'sender_name',nullif(btrim(concat_ws(' ',sender.first_name,sender.last_name)),''),'message_preview',m.body)),'[]'::jsonb)
 from claimed j join public.chat_messages m on m.id=j.message_id
 join public.profiles sender on sender.id=m.sender_id
$$;
revoke all on function public.claim_chat_push_jobs() from public,anon,authenticated;
grant execute on function public.claim_chat_push_jobs() to service_role;

create function private.review_context(p_registration uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare r public.registrations;s public.sessions;v public.session_reviews;begin
 select * into r from public.registrations where id=p_registration;
 select * into s from public.sessions where id=r.session_id;
 select * into v from public.session_reviews where registration_id=r.id;
 if auth.uid() is null or r.id is null or not (r.player_id=auth.uid() or (s.organizer_id=auth.uid() and v.id is not null)) then raise exception 'Review unavailable' using errcode='42501';end if;
 return jsonb_build_object('registration_id',r.id,'session_id',s.id,'session_title',s.title,'ends_at',s.ends_at,'deadline',s.ends_at+interval '14 days','host_name',(select btrim(concat_ws(' ',first_name,last_name)) from public.profiles where id=s.organizer_id),'reviewer_name',(select btrim(concat_ws(' ',first_name,last_name)) from public.profiles where id=r.player_id),
 'is_author',r.player_id=auth.uid(),'eligible',r.player_id=auth.uid() and r.player_id<>s.organizer_id and r.status='confirmed' and s.status in ('published','completed') and s.ends_at<=now() and now()<s.ends_at+interval '14 days' and coalesce(v.status,'')<>'removed',
 'reported',exists(select 1 from private.review_reports where review_id=v.id),
 'review',case when v.id is null then null else jsonb_build_object('id',v.id,'rating',v.rating,'comment',case when v.status='removed' then null else v.comment end,'status',v.status,'created_at',v.created_at,'updated_at',v.updated_at) end);
end$$;
create function public.get_review_context(p_registration uuid) returns jsonb language sql security invoker set search_path='' as $$select private.review_context(p_registration)$$;
create function private.submit_session_review(p_registration uuid,p_rating integer,p_comment text,p_expected_updated_at timestamptz default null) returns jsonb
language plpgsql security definer set search_path='' as $$declare r public.registrations;s public.sessions;v public.session_reviews;first_review boolean;begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
 select s0.* into s from public.sessions s0 join public.registrations r0 on r0.session_id=s0.id where r0.id=p_registration for update of s0;
 select * into r from public.registrations where id=p_registration for update;
 if r.id is null or r.player_id<>auth.uid() or r.player_id=s.organizer_id or r.status<>'confirmed' or s.status not in ('published','completed') or s.ends_at>now() or now()>=s.ends_at+interval '14 days' then raise exception 'The review window is unavailable or has closed' using errcode='42501';end if;
 if p_rating is null or p_rating not between 1 and 5 or char_length(p_comment)>2000 then raise exception 'Choose a rating from 1 to 5 and keep the comment within 2000 characters' using errcode='22023';end if;
 select * into v from public.session_reviews where registration_id=r.id for update;
 first_review:=v.id is null;
 if not first_review then
  if v.status='removed' then raise exception 'A removed review cannot be replaced' using errcode='42501';end if;
  if p_expected_updated_at is null and v.status='published' and v.rating=p_rating and v.comment is not distinct from nullif(btrim(p_comment),'') then return private.review_context(r.id);end if;
  if p_expected_updated_at is distinct from v.updated_at then raise exception 'Your review changed. Reload before editing.' using errcode='40001';end if;
  update public.session_reviews set rating=p_rating,comment=nullif(btrim(p_comment),''),status='published',updated_at=clock_timestamp() where id=v.id returning * into v;
 else
  insert into public.session_reviews(registration_id,session_id,organizer_id,reviewer_id,rating,comment) values(r.id,s.id,s.organizer_id,auth.uid(),p_rating,nullif(btrim(p_comment),'')) returning * into v;
  insert into private.app_notifications(recipient_id,notification_type,registration_id,review_id,deduplication_key) values(s.organizer_id,'new_reviews',r.id,v.id,'new_review:'||v.id) on conflict(deduplication_key) do nothing;
 end if;
 return private.review_context(r.id);
end$$;
create function public.submit_session_review(p_registration uuid,p_rating integer,p_comment text,p_expected_updated_at timestamptz default null) returns jsonb language sql security invoker set search_path='' as $$select private.submit_session_review(p_registration,p_rating,p_comment,p_expected_updated_at)$$;
create function private.remove_session_review(p_review uuid) returns void language plpgsql security definer set search_path='' as $$begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
 if not exists(select 1 from public.session_reviews where id=p_review and reviewer_id=auth.uid()) then raise exception 'Review unavailable' using errcode='42501';end if;
 update public.session_reviews set status='removed',updated_at=clock_timestamp() where id=p_review and reviewer_id=auth.uid() and status<>'removed';
end$$;
create function public.remove_session_review(p_review uuid) returns void language sql security invoker set search_path='' as $$select private.remove_session_review(p_review)$$;
create function private.report_session_review(p_review uuid,p_reason text,p_details text) returns void language plpgsql security definer set search_path='' as $$declare v public.session_reviews;begin
 select * into v from public.session_reviews where id=p_review for update;
 if auth.uid() is null or v.id is null or v.organizer_id<>auth.uid() or v.status='removed' then raise exception 'Only this session host can report its review' using errcode='42501';end if;
 if p_reason is null or p_reason not in ('harassment','personal_information','spam','manipulation','other') or char_length(p_details)>2000 then raise exception 'Invalid report' using errcode='22023';end if;
 insert into private.review_reports(review_id,reporter_id,reason,details,snapshot) values(v.id,auth.uid(),p_reason,nullif(btrim(p_details),''),to_jsonb(v)) on conflict(review_id) do nothing;
end$$;
create function public.report_session_review(p_review uuid,p_reason text,p_details text) returns void language sql security invoker set search_path='' as $$select private.report_session_review(p_review,p_reason,p_details)$$;
-- Restricted operational moderation; the actor/note and original content are always audited.
create function private.moderate_session_review(p_review uuid,p_action text,p_moderator uuid,p_note text) returns void
language plpgsql security definer set search_path='' as $$declare v public.session_reviews;begin
 if p_action is null or p_action not in ('hide','restore','dismiss') or p_moderator is null or coalesce(char_length(btrim(p_note)),0) not between 1 and 2000 then raise exception 'Invalid moderation decision' using errcode='22023';end if;
 select * into v from public.session_reviews where id=p_review for update;
 if v.id is null or v.status='removed' then raise exception 'Review unavailable';end if;
 insert into private.review_moderation_log(review_id,moderator_id,action,note,snapshot) values(v.id,p_moderator,p_action,btrim(p_note),to_jsonb(v));
 if p_action<>'dismiss' then update public.session_reviews set status=case when p_action='hide' then 'hidden' else 'published' end,updated_at=clock_timestamp() where id=v.id;end if;
 update private.review_reports set status=case when p_action='hide' then 'action_taken' else 'dismissed' end,resolved_at=clock_timestamp(),moderator_id=p_moderator,moderation_note=btrim(p_note) where review_id=v.id;
end$$;
create function public.moderate_session_review(p_review uuid,p_action text,p_moderator uuid,p_note text) returns void language sql security invoker set search_path='' as $$select private.moderate_session_review(p_review,p_action,p_moderator,p_note)$$;
revoke all on function private.moderate_session_review(uuid,text,uuid,text) from public,anon,authenticated;
grant execute on function private.moderate_session_review(uuid,text,uuid,text) to service_role;
revoke all on function public.moderate_session_review(uuid,text,uuid,text) from public,anon,authenticated;
grant execute on function public.moderate_session_review(uuid,text,uuid,text) to service_role;
create function public.get_review_rating_summary(p_organizer uuid default null,p_session uuid default null) returns jsonb
language sql stable security invoker set search_path='' as $$select jsonb_build_object('count',count(*),'rating',round(avg(rating),1)) from public.session_reviews where status='published' and ((p_organizer is not null and organizer_id=p_organizer and p_session is null) or (p_session is not null and session_id=p_session and p_organizer is null))$$;
revoke all on function public.get_review_rating_summary(uuid,uuid) from public;
grant execute on function public.get_review_rating_summary(uuid,uuid) to anon,authenticated;

create function private.notification_inbox(p_mode text,p_unread boolean default false,p_before timestamptz default null,p_before_id uuid default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$begin
 if auth.uid() is null or p_mode is null or p_mode not in ('player','organizer') then raise exception 'Authentication required' using errcode='42501';end if;
 if p_mode='organizer' and not exists(select 1 from public.organizers where profile_id=auth.uid() and status='active') then raise exception 'Organizer access required' using errcode='42501';end if;
 return (select coalesce(jsonb_agg(to_jsonb(q) order by q.created_at desc,q.id desc),'[]') from (
  select n.id,n.notification_type,n.registration_id,n.review_id,n.created_at,n.read_at,s.id as session_id,s.title as session_title,s.ends_at+interval '14 days' as deadline,
   btrim(concat_ws(' ',h.first_name,h.last_name)) as host_name,btrim(concat_ws(' ',p.first_name,p.last_name)) as reviewer_name,
   v.status as review_status,
   r.status='confirmed' and s.status in ('published','completed') and s.ends_at<=now() and now()<s.ends_at+interval '14 days' and v.id is null as can_review
  from private.app_notifications n join private.notification_types t on t.key=n.notification_type join public.registrations r on r.id=n.registration_id
  join public.sessions s on s.id=r.session_id join public.profiles h on h.id=s.organizer_id join public.profiles p on p.id=r.player_id
  left join public.session_reviews v on v.registration_id=r.id
  where n.recipient_id=auth.uid() and t.audience=p_mode and (not coalesce(p_unread,false) or n.read_at is null)
   and (p_before is null or (n.created_at,n.id)<(p_before,p_before_id))
  order by n.created_at desc,n.id desc limit 30
 )q);
end$$;
create function public.get_notification_inbox(p_mode text,p_unread boolean default false,p_before timestamptz default null,p_before_id uuid default null) returns jsonb language sql security invoker set search_path='' as $$select private.notification_inbox(p_mode,p_unread,p_before,p_before_id)$$;
create function private.unread_notification_count(p_mode text) returns integer language plpgsql stable security definer set search_path='' as $$begin
 if auth.uid() is null or p_mode is null or p_mode not in ('player','organizer') then raise exception 'Authentication required' using errcode='42501';end if;
 return (select count(*)::integer from private.app_notifications n join private.notification_types t on t.key=n.notification_type where n.recipient_id=auth.uid() and n.read_at is null and t.audience=p_mode);
end$$;
create function public.get_unread_notification_count(p_mode text) returns integer language sql security invoker set search_path='' as $$select private.unread_notification_count(p_mode)$$;
create function private.mark_notifications_read(p_mode text,p_id uuid default null) returns void language plpgsql security definer set search_path='' as $$begin
 if auth.uid() is null or p_mode is null or p_mode not in ('player','organizer') then raise exception 'Authentication required' using errcode='42501';end if;
 update private.app_notifications n set read_at=coalesce(n.read_at,clock_timestamp()) from private.notification_types t where t.key=n.notification_type and t.audience=p_mode and n.recipient_id=auth.uid() and (p_id is null or n.id=p_id) and n.read_at is null;
end$$;
create function public.mark_notifications_read(p_mode text,p_id uuid default null) returns void language sql security invoker set search_path='' as $$select private.mark_notifications_read(p_mode,p_id)$$;

-- One completion/reminder pass is safe to repeat. Attendance is deliberately untouched.
create function private.complete_sessions_and_request_reviews() returns void language plpgsql security definer set search_path='' as $$begin
 update public.sessions set status='completed' where status='published' and ends_at<=now();
 insert into private.app_notifications(recipient_id,notification_type,registration_id,deduplication_key)
 select r.player_id,'review_reminders',r.id,'review_reminder:'||r.id from public.registrations r join public.sessions s on s.id=r.session_id
 where r.status='confirmed' and r.player_id<>s.organizer_id and s.status='completed' and s.ends_at+interval '1 hour'<=now() and now()<s.ends_at+interval '14 days'
 and not exists(select 1 from public.session_reviews v where v.registration_id=r.id)
 on conflict(deduplication_key) do nothing;
end$$;
revoke all on function private.complete_sessions_and_request_reviews() from public,anon,authenticated,service_role;
select cron.schedule('palla-session-reviews','*/5 * * * *',$$select private.complete_sessions_and_request_reviews()$$);

-- Restrict the new client entry points and their internal ownership-checked functions.
do $$declare name text;signature text;begin
 foreach signature in array array['notification_settings(text)','set_notification_preference(text,boolean)','review_context(uuid)','submit_session_review(uuid,integer,text,timestamp with time zone)','remove_session_review(uuid)','report_session_review(uuid,text,text)','notification_inbox(text,boolean,timestamp with time zone,uuid)','unread_notification_count(text)','mark_notifications_read(text,uuid)'] loop
  execute 'revoke all on function private.'||signature||' from public,anon';
  execute 'grant execute on function private.'||signature||' to authenticated';
 end loop;
 foreach signature in array array['get_notification_settings(text)','set_notification_preference(text,boolean)','get_review_context(uuid)','submit_session_review(uuid,integer,text,timestamp with time zone)','remove_session_review(uuid)','report_session_review(uuid,text,text)','get_notification_inbox(text,boolean,timestamp with time zone,uuid)','get_unread_notification_count(text)','mark_notifications_read(text,uuid)'] loop
  execute 'revoke all on function public.'||signature||' from public,anon';
  execute 'grant execute on function public.'||signature||' to authenticated';
 end loop;
end$$;

create function private.notification_target(p_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$declare result jsonb;begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
 select jsonb_build_object('id',n.id,'registration_id',n.registration_id,'mode',t.audience) into result from private.app_notifications n join private.notification_types t on t.key=n.notification_type where n.id=p_id and n.recipient_id=auth.uid();
 if result is null then raise exception 'Notification unavailable' using errcode='42501';end if;return result;
end$$;
create function public.get_notification_target(p_id uuid) returns jsonb language sql security invoker set search_path='' as $$select private.notification_target(p_id)$$;
create function private.push_subscription_state() returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
 return jsonb_build_object('chat_messages',private.notification_push_enabled(auth.uid(),'chat_messages'),'review_reminders',private.notification_push_enabled(auth.uid(),'review_reminders'),'new_reviews',exists(select 1 from public.organizers where profile_id=auth.uid() and status='active') and private.notification_push_enabled(auth.uid(),'new_reviews'));
end$$;
create function public.get_push_subscription_state() returns jsonb language sql security invoker set search_path='' as $$select private.push_subscription_state()$$;
revoke all on function private.notification_target(uuid),public.get_notification_target(uuid),private.push_subscription_state(),public.get_push_subscription_state() from public,anon;
grant execute on function private.notification_target(uuid),public.get_notification_target(uuid),private.push_subscription_state(),public.get_push_subscription_state() to authenticated;

create function private.review_notification_deliverable(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.app_notifications n join public.registrations r on r.id=n.registration_id join public.sessions s on s.id=r.session_id left join public.session_reviews v on v.registration_id=r.id
 where n.id=p_id and n.read_at is null and private.notification_push_enabled(n.recipient_id,n.notification_type) and (
 (n.notification_type='review_reminders' and r.player_id=n.recipient_id and r.status='confirmed' and s.status='completed' and s.ends_at<=now() and now()<s.ends_at+interval '14 days' and v.id is null)
 or (n.notification_type='new_reviews' and v.id=n.review_id and v.status='published' and v.organizer_id=n.recipient_id)))
$$;
revoke all on function private.review_notification_deliverable(uuid) from public,anon,authenticated;
grant execute on function private.review_notification_deliverable(uuid) to service_role;
create function private.enqueue_review_notification_push() returns trigger language plpgsql security definer set search_path='' as $$begin
 if private.review_notification_deliverable(new.id) then
  insert into private.notification_push_jobs(notification_id,installation_id,recipient_id,expo_token) select new.id,installation_id,new.recipient_id,expo_token from private.chat_push_devices where profile_id=new.recipient_id and enabled and updated_at>now()-interval '60 days' on conflict do nothing;
 end if;return new;
end$$;
revoke all on function private.enqueue_review_notification_push() from public,anon,authenticated;
create trigger enqueue_review_notification after insert on private.app_notifications for each row execute function private.enqueue_review_notification_push();

create function public.claim_review_notification_push_jobs() returns jsonb language sql security invoker set search_path='' as $$
 with stale as (
  update private.notification_push_jobs j set state='skipped' where j.state in ('pending','sending') and (j.created_at<now()-interval '24 hours' or not private.review_notification_deliverable(j.notification_id) or not exists(select 1 from private.chat_push_devices d where d.installation_id=j.installation_id and d.profile_id=j.recipient_id and d.expo_token=j.expo_token and d.enabled and d.updated_at>now()-interval '60 days')) returning id
 ), candidates as (
  select id from private.notification_push_jobs where state in ('pending','sending') and available_at<=now() and attempts<5 and id not in(select id from stale) order by created_at for update skip locked limit 100
 ), claimed as (
  update private.notification_push_jobs set state='sending',attempts=attempts+1,available_at=now()+interval '2 minutes' where id in(select id from candidates) returning *
 ) select coalesce(jsonb_agg(jsonb_build_object('id',j.id,'attempt',j.attempts,'token',j.expo_token,'notification_id',n.id,'recipient_id',j.recipient_id,'mode',t.audience,'title',case when n.notification_type='review_reminders' then 'How was your session?' else 'You received a new review' end,'body',case when n.notification_type='review_reminders' then 'Share your experience at '||s.title||'.' else btrim(concat_ws(' ',p.first_name,p.last_name))||' reviewed '||s.title||'.' end)),'[]')
 from claimed j join private.app_notifications n on n.id=j.notification_id join private.notification_types t on t.key=n.notification_type join public.registrations r on r.id=n.registration_id join public.sessions s on s.id=r.session_id join public.profiles p on p.id=r.player_id
$$;
create function public.finish_review_notification_push_job(p_id uuid,p_attempt integer,p_ticket text default null,p_error text default null,p_retry boolean default false) returns void language sql security invoker set search_path='' as $$
 update private.notification_push_jobs set state=case when p_ticket is not null then 'ticket' when p_retry and attempts<5 then 'pending' else 'failed' end,ticket_id=p_ticket,error_code=p_error,available_at=now()+case when p_ticket is not null then interval '15 minutes' else interval '1 minute'*power(2,least(attempts,5)) end where id=p_id and attempts=p_attempt and state='sending';
 update private.chat_push_devices d set enabled=false where p_error='DeviceNotRegistered' and exists(select 1 from private.notification_push_jobs j where j.id=p_id and j.attempts=p_attempt and j.installation_id=d.installation_id and j.expo_token=d.expo_token and j.recipient_id=d.profile_id);
$$;
create function public.claim_review_notification_push_receipts() returns jsonb language sql security invoker set search_path='' as $$
 with candidates as(select id from private.notification_push_jobs where state='ticket' and available_at<=now() order by available_at for update skip locked limit 100), claimed as(update private.notification_push_jobs set available_at=now()+interval '5 minutes' where id in(select id from candidates) returning id,ticket_id) select coalesce(jsonb_agg(claimed),'[]') from claimed
$$;
create function public.finish_review_notification_push_receipt(p_id uuid,p_error text default null) returns void language sql security invoker set search_path='' as $$
 update private.chat_push_devices d set enabled=false where p_error='DeviceNotRegistered' and exists(select 1 from private.notification_push_jobs j where j.id=p_id and j.state='ticket' and j.installation_id=d.installation_id and j.expo_token=d.expo_token and j.recipient_id=d.profile_id);
 update private.notification_push_jobs set state=case when p_error is null then 'sent' else 'failed' end,error_code=p_error where id=p_id and state='ticket';
$$;
revoke all on function public.claim_review_notification_push_jobs(),public.finish_review_notification_push_job(uuid,integer,text,text,boolean),public.claim_review_notification_push_receipts(),public.finish_review_notification_push_receipt(uuid,text) from public,anon,authenticated;
grant execute on function public.claim_review_notification_push_jobs(),public.finish_review_notification_push_job(uuid,integer,text,text,boolean),public.claim_review_notification_push_receipts(),public.finish_review_notification_push_receipt(uuid,text) to service_role;
-- Reuse the existing authenticated worker endpoint/credential for both queues.
create or replace function private.wake_chat_push_worker() returns void language plpgsql security definer set search_path='' as $$declare endpoint text;secret text;begin
 select decrypted_secret into endpoint from vault.decrypted_secrets where name='chat_push_function_url';
 select decrypted_secret into secret from vault.decrypted_secrets where name='chat_push_worker_secret';
 if endpoint is null or secret is null then return;end if;
 if not exists(select 1 from private.chat_push_jobs where state in ('pending','sending','ticket') and available_at<=now()) and not exists(select 1 from private.notification_push_jobs where state in ('pending','sending','ticket') and available_at<=now()) then return;end if;
 perform net.http_post(url:=endpoint,headers:=jsonb_build_object('Content-Type','application/json','x-chat-push-secret',secret),body:='{}'::jsonb,timeout_milliseconds:=10000);
end$$;
select cron.schedule('palla-review-push-cleanup','23 3 * * *',$$
 update private.notification_push_jobs set state='failed',error_code='Expired' where state in ('pending','sending','ticket') and (created_at<now()-interval '24 hours' or (attempts>=5 and state<>'ticket' and available_at<now()));
 delete from private.notification_push_jobs where created_at<now()-interval '7 days';
$$);
