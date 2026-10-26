-- Processing attempts have their own budget: rejected/retried uploads must not
-- bypass the existing successful-upload quota by repeatedly decoding JPEGs.
create table private.chat_photo_processing_usage (
 actor uuid primary key references public.profiles(id) on delete cascade,
 minute_start timestamptz not null,
 minute_count integer not null,
 day_start timestamptz not null,
 day_count integer not null
);
alter table private.chat_photo_processing_usage enable row level security;
revoke all on private.chat_photo_processing_usage from public,anon,authenticated;

create function private.authorize_chat_photo_processing(p_actor uuid,p_conversation_id uuid)
returns boolean language plpgsql security definer set search_path='' as $$
declare instant timestamptz:=clock_timestamp(); charged uuid;
begin
 if p_actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
 perform set_config('request.jwt.claim.sub',p_actor::text,true);
 perform private.assert_chat_messaging(p_conversation_id);
 if not exists(select 1 from public.chat_conversations c join public.organizers o
   on o.profile_id=c.organizer_id and o.status='active' where c.id=p_conversation_id)
 then raise exception 'Conversation unavailable' using errcode='42501'; end if;
 insert into private.chat_photo_processing_usage values(p_actor,instant,1,instant,1)
 on conflict(actor) do update set
  minute_start=case when chat_photo_processing_usage.minute_start<=instant-interval '1 minute' then instant else chat_photo_processing_usage.minute_start end,
  minute_count=case when chat_photo_processing_usage.minute_start<=instant-interval '1 minute' then 1 else chat_photo_processing_usage.minute_count+1 end,
  day_start=case when chat_photo_processing_usage.day_start<=instant-interval '1 day' then instant else chat_photo_processing_usage.day_start end,
  day_count=case when chat_photo_processing_usage.day_start<=instant-interval '1 day' then 1 else chat_photo_processing_usage.day_count+1 end
 where (chat_photo_processing_usage.minute_start<=instant-interval '1 minute' or chat_photo_processing_usage.minute_count<10)
   and (chat_photo_processing_usage.day_start<=instant-interval '1 day' or chat_photo_processing_usage.day_count<150)
 returning actor into charged;
 if charged is null then raise exception 'Photo processing limit reached' using errcode='54000'; end if;
 return true;
end $$;
create function public.authorize_chat_photo_processing(p_actor uuid,p_conversation_id uuid)
returns boolean language sql security invoker set search_path='' as $$
 select private.authorize_chat_photo_processing(p_actor,p_conversation_id)
$$;
revoke all on function private.authorize_chat_photo_processing(uuid,uuid),public.authorize_chat_photo_processing(uuid,uuid) from public,anon,authenticated;
grant execute on function private.authorize_chat_photo_processing(uuid,uuid),public.authorize_chat_photo_processing(uuid,uuid) to service_role;
