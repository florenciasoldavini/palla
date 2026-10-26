-- Quotes reference the original row; erased or personally cleared text is never copied.
alter table public.chat_messages add column reply_to_id uuid
 references public.chat_messages(id) on delete set null;
create index chat_messages_reply_idx on public.chat_messages(reply_to_id) where reply_to_id is not null;

-- One reaction per participant. A null emoji is a removal event, allowing RLS-filtered
-- UPDATE delivery rather than broadcasting unfilterable DELETE events.
create table public.chat_reactions (
 message_id uuid not null references public.chat_messages(id) on delete cascade,
 profile_id uuid not null references public.profiles(id) on delete cascade,
 emoji text check(emoji in ('🎾','🔥','💪','👏','❤️','😂')),
 updated_at timestamptz not null default clock_timestamp(),
 primary key(message_id,profile_id)
);
create index chat_reactions_profile_idx on public.chat_reactions(profile_id);
alter table public.chat_reactions enable row level security;
revoke all on public.chat_reactions from anon,authenticated;
grant select on public.chat_reactions to authenticated;
grant all on public.chat_reactions to service_role;
create policy chat_reactions_members on public.chat_reactions for select to authenticated
 using(exists(select 1 from public.chat_messages m where m.id=message_id
 and private.chat_message_visible(m.conversation_id,m.sequence)));

create or replace function private.chat_message_json(m public.chat_messages) returns jsonb
language sql stable set search_path='' as $$
 select to_jsonb(m)||jsonb_build_object(
 'sequence',m.sequence::text,
 'delivered_at',(select d.delivered_at from public.chat_deliveries d where d.message_id=m.id),
 'reply',case when m.deleted_at is not null or m.reply_to_id is null then null else
 coalesce((select jsonb_build_object('id',q.id,'sender_id',q.sender_id,
 'sequence',q.sequence::text,'body',q.body,'deleted_at',q.deleted_at,'available',true)
 from public.chat_messages q where q.id=m.reply_to_id and q.conversation_id=m.conversation_id
 and private.chat_message_visible(q.conversation_id,q.sequence)),
 jsonb_build_object('id',m.reply_to_id,'sender_id',null,'sequence',null,
 'body',null,'deleted_at',null,'available',false)) end,
 'reactions',case when m.deleted_at is not null then '[]'::jsonb else
 (select coalesce(jsonb_agg(jsonb_build_object('profile_id',r.profile_id,'emoji',r.emoji)
 order by r.profile_id),'[]'::jsonb) from public.chat_reactions r
 where r.message_id=m.id and r.emoji is not null) end)
$$;

-- Replace the old signature rather than keeping ambiguous PostgREST overloads.
drop function public.send_chat_message(uuid,uuid,text);
drop function private.send_chat_message(uuid,uuid,text);
create function private.send_chat_message(p_id uuid,p_conversation_id uuid,p_body text,p_reply_to_id uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); c public.chat_conversations; m public.chat_messages;
begin
 if actor is null or not private.chat_participant(p_conversation_id) then raise exception 'Chat access denied'; end if;
 if p_id is null or p_body is null or length(btrim(p_body)) not between 1 and 4000 then raise exception 'Invalid message'; end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text,0));
 select * into c from public.chat_conversations where id=p_conversation_id for update;
 if not exists(select 1 from public.organizers where profile_id=c.organizer_id and status='active') then raise exception 'Conversation unavailable'; end if;
 select * into m from public.chat_messages where id=p_id;
 if found then
  if m.sender_id<>actor or m.conversation_id<>p_conversation_id or m.body is distinct from btrim(p_body)
   or m.reply_to_id is distinct from p_reply_to_id then raise exception 'Message retry does not match'; end if;
  return private.chat_message_json(m);
 end if;
 if p_reply_to_id is not null and not exists(select 1 from public.chat_messages q
 where q.id=p_reply_to_id and q.conversation_id=p_conversation_id and q.deleted_at is null
 and private.chat_message_visible(q.conversation_id,q.sequence)) then raise exception 'Reply message unavailable'; end if;
 if (select count(*) from public.chat_messages where sender_id=actor and created_at>clock_timestamp()-interval '1 minute')>=30 then raise exception 'Message rate limit reached'; end if;
 insert into public.chat_messages(id,conversation_id,sender_id,body,reply_to_id)
 values(p_id,p_conversation_id,actor,btrim(p_body),p_reply_to_id) returning * into m;
 return private.chat_message_json(m);
end $$;
create function public.send_chat_message(p_id uuid,p_conversation_id uuid,p_body text,p_reply_to_id uuid default null) returns jsonb
language sql security invoker set search_path='' as $$select private.send_chat_message(p_id,p_conversation_id,p_body,p_reply_to_id)$$;
revoke all on function private.send_chat_message(uuid,uuid,text,uuid),public.send_chat_message(uuid,uuid,text,uuid) from public,anon;
grant execute on function private.send_chat_message(uuid,uuid,text,uuid),public.send_chat_message(uuid,uuid,text,uuid) to authenticated;

-- Set an explicit desired value: retries cannot accidentally toggle a reaction twice.
create function private.set_chat_reaction(p_message_id uuid,p_emoji text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare m public.chat_messages; c public.chat_conversations; actor uuid:=auth.uid();
begin
 if actor is null then raise exception 'Chat access denied'; end if;
 if p_emoji is not null and p_emoji not in('🎾','🔥','💪','👏','❤️','😂') then raise exception 'Invalid reaction'; end if;
 select * into m from public.chat_messages where id=p_message_id;
 if not found or not private.chat_message_visible(m.conversation_id,m.sequence) then raise exception 'Message unavailable'; end if;
 select * into c from public.chat_conversations where id=m.conversation_id for update;
 select * into m from public.chat_messages where id=p_message_id for update;
 if m.deleted_at is not null or not private.chat_message_visible(m.conversation_id,m.sequence)
 or not exists(select 1 from public.organizers where profile_id=c.organizer_id and status='active') then raise exception 'Message unavailable'; end if;
 insert into public.chat_reactions(message_id,profile_id,emoji) values(p_message_id,actor,p_emoji)
 on conflict(message_id,profile_id) do update set emoji=excluded.emoji,updated_at=clock_timestamp()
 where public.chat_reactions.emoji is distinct from excluded.emoji;
 return private.chat_message_json(m);
end $$;
create function public.set_chat_reaction(p_message_id uuid,p_emoji text) returns jsonb
language sql security invoker set search_path='' as $$select private.set_chat_reaction(p_message_id,p_emoji)$$;
revoke all on function private.set_chat_reaction(uuid,text),public.set_chat_reaction(uuid,text) from public,anon;
grant execute on function private.set_chat_reaction(uuid,text),public.set_chat_reaction(uuid,text) to authenticated;

do $$begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
  alter publication supabase_realtime add table public.chat_reactions;
 end if;
end $$;

-- Fetch a saved draft's target without loading every older history page.
create function private.get_chat_message(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare m public.chat_messages;
begin
 if auth.uid() is null then raise exception 'Chat access denied'; end if;
 select * into m from public.chat_messages where id=p_id;
 if not found or not private.chat_message_visible(m.conversation_id,m.sequence) then return null; end if;
 return private.chat_message_json(m);
end $$;
create function public.get_chat_message(p_id uuid) returns jsonb
language sql stable security invoker set search_path='' as $$select private.get_chat_message(p_id)$$;
revoke all on function private.get_chat_message(uuid),public.get_chat_message(uuid) from public,anon;
grant execute on function private.get_chat_message(uuid),public.get_chat_message(uuid) to authenticated;
