-- Delivery is acknowledged by the recipient client after receiving a message.
-- This is distinct from saving on the server and from opening the conversation.
create table public.chat_deliveries (
 message_id uuid primary key references public.chat_messages(id) on delete cascade,
 recipient_id uuid not null references public.profiles(id) on delete cascade,
 delivered_at timestamptz not null default clock_timestamp()
);
create index chat_deliveries_recipient_idx on public.chat_deliveries(recipient_id);
alter table public.chat_deliveries enable row level security;
revoke all on public.chat_deliveries from anon, authenticated;
grant select on public.chat_deliveries to authenticated;
grant all on public.chat_deliveries to service_role;
create policy chat_deliveries_members on public.chat_deliveries
for select to authenticated using (
 exists(select 1 from public.chat_messages m where m.id=message_id and private.chat_participant(m.conversation_id))
);

create or replace function private.chat_message_json(m public.chat_messages) returns jsonb
language sql stable set search_path='' as $$
 select to_jsonb(m)||jsonb_build_object('sequence',m.sequence::text,'delivered_at',
 (select d.delivered_at from public.chat_deliveries d where d.message_id=m.id))
$$;

create function private.acknowledge_chat_deliveries(p_message_ids uuid[]) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();
begin
 if actor is null or coalesce(cardinality(p_message_ids),0) not between 1 and 100 then raise exception 'Delivery access denied'; end if;
 if (select count(distinct m.id) from public.chat_messages m where m.id=any(p_message_ids) and m.sender_id<>actor and private.chat_participant(m.conversation_id))<>cardinality(p_message_ids) then raise exception 'Delivery access denied'; end if;
 insert into public.chat_deliveries(message_id,recipient_id)
 select id,actor from public.chat_messages where id=any(p_message_ids)
 on conflict(message_id) do nothing;
end $$;
create function public.acknowledge_chat_deliveries(p_message_ids uuid[]) returns void
language sql security invoker set search_path='' as $$select private.acknowledge_chat_deliveries(p_message_ids)$$;
revoke all on function private.acknowledge_chat_deliveries(uuid[]),public.acknowledge_chat_deliveries(uuid[]) from public,anon;
grant execute on function private.acknowledge_chat_deliveries(uuid[]),public.acknowledge_chat_deliveries(uuid[]) to authenticated;

-- Typing hints are ephemeral private-channel broadcasts, never stored messages.
create function private.chat_typing_allowed(p_topic text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.chat_conversations c
 where p_topic='chat-typing:'||c.id::text and (c.organizer_id=(select auth.uid()) or c.player_id=(select auth.uid())))
$$;
revoke all on function private.chat_typing_allowed(text) from public,anon;
grant execute on function private.chat_typing_allowed(text) to authenticated;
-- realtime.messages already has RLS; Supabase permits policy management only.
create policy chat_typing_receive on realtime.messages for select to authenticated
using (extension='broadcast' and private.chat_typing_allowed((select realtime.topic())));
create policy chat_typing_send on realtime.messages for insert to authenticated
with check (extension='broadcast' and private.chat_typing_allowed((select realtime.topic())));

create or replace function private.start_chat(p_organizer_id uuid,p_player_id uuid,p_source_session_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); c public.chat_conversations;
begin
 if actor is null or actor not in(p_organizer_id,p_player_id) or p_organizer_id is null or p_player_id is null or p_organizer_id=p_player_id then raise exception 'Chat access denied'; end if;
 if not exists(select 1 from public.organizers where profile_id=p_organizer_id and status='active') or not exists(select 1 from public.profiles where id=p_player_id and onboarding_completed_at is not null) then raise exception 'Chat participant unavailable'; end if;
 -- Registration is deliberately NOT required. UI entry points control discovery.
 -- Context may only be attached by its owning organizer; players can start without it.
 if p_source_session_id is not null and (actor<>p_organizer_id or not exists(select 1 from public.sessions where id=p_source_session_id and organizer_id=actor)) then raise exception 'Session context unavailable'; end if;
 insert into public.chat_conversations(organizer_id,player_id,source_session_id) values(p_organizer_id,p_player_id,p_source_session_id)
 on conflict(organizer_id,player_id) do update set source_session_id=coalesce(public.chat_conversations.source_session_id,excluded.source_session_id);
 select * into c from public.chat_conversations where organizer_id=p_organizer_id and player_id=p_player_id;
 return to_jsonb(c);
end $$;

do $$begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
  alter publication supabase_realtime add table public.chat_deliveries;
 end if;
end $$;
