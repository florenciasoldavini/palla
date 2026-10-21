-- Account-wide preferences; no row preserves existing enabled behavior.
create table private.notification_preferences (
 profile_id uuid primary key references public.profiles(id) on delete cascade,
 chat_messages boolean not null default true
);
alter table private.notification_preferences enable row level security;
revoke all on private.notification_preferences from public, anon, authenticated;
grant select on private.notification_preferences to service_role;

create function private.get_chat_notification_preference() returns boolean
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 return coalesce((select chat_messages from private.notification_preferences where profile_id=auth.uid()),true);
end $$;
create function public.get_chat_notification_preference() returns boolean
language sql security invoker set search_path='' as $$select private.get_chat_notification_preference()$$;

create function private.set_chat_notification_preference(p_enabled boolean) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and onboarding_completed_at is not null) then
  raise exception 'Authentication required' using errcode='42501';
 end if;
 if p_enabled is null then raise exception 'Preference is required' using errcode='22023'; end if;
 insert into private.notification_preferences(profile_id,chat_messages) values(auth.uid(),p_enabled)
 on conflict(profile_id) do update set chat_messages=excluded.chat_messages;
 -- Do not deliver a backlog when notifications are enabled again.
 if not p_enabled then
  update private.chat_push_jobs set state='skipped' where recipient_id=auth.uid() and state in ('pending','sending');
 end if;
 return p_enabled;
end $$;
create function public.set_chat_notification_preference(p_enabled boolean) returns boolean
language sql security invoker set search_path='' as $$select private.set_chat_notification_preference(p_enabled)$$;
revoke all on function private.get_chat_notification_preference(),public.get_chat_notification_preference(),private.set_chat_notification_preference(boolean),public.set_chat_notification_preference(boolean) from public,anon;
grant execute on function private.get_chat_notification_preference(),public.get_chat_notification_preference(),private.set_chat_notification_preference(boolean),public.set_chat_notification_preference(boolean) to authenticated;

create or replace function private.enqueue_chat_push() returns trigger
language plpgsql security definer set search_path='' as $$
declare recipient uuid;
begin
 select case when organizer_id=new.sender_id then player_id else organizer_id end into recipient
 from public.chat_conversations where id=new.conversation_id;
 if exists(select 1 from private.notification_preferences where profile_id=recipient and not chat_messages) then return new; end if;
 insert into private.chat_push_jobs(message_id,installation_id,recipient_id,expo_token)
 select new.id,installation_id,recipient,expo_token from private.chat_push_devices
 where profile_id=recipient and enabled and updated_at>now()-interval '60 days';
 return new;
end $$;
revoke all on function private.enqueue_chat_push() from public,anon,authenticated;

create or replace function public.claim_chat_push_jobs() returns jsonb
language sql security invoker set search_path='' as $$
 with stale as (
  update private.chat_push_jobs j set state='skipped'
  where j.state in ('pending','sending') and (j.created_at<now()-interval '24 hours' or not exists(
   select 1 from private.chat_push_devices d join public.chat_messages m on m.id=j.message_id
   left join public.chat_reads r on r.conversation_id=m.conversation_id and r.profile_id=j.recipient_id
   left join public.chat_preferences p on p.conversation_id=m.conversation_id and p.profile_id=j.recipient_id
   where d.installation_id=j.installation_id and d.profile_id=j.recipient_id and d.enabled and d.expo_token=j.expo_token
    and not exists(select 1 from private.notification_preferences np where np.profile_id=j.recipient_id and not np.chat_messages)
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
