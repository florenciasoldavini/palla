-- Presence is ephemeral. No online/last-seen columns or product tables.
create function private.chat_online_visible(p_topic text) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (
   p_topic='chat-online:'||auth.uid()::text
   or exists(select 1 from public.chat_conversations c
     where (c.organizer_id=auth.uid() and p_topic='chat-online:'||c.player_id::text)
        or (c.player_id=auth.uid() and p_topic='chat-online:'||c.organizer_id::text))
 )
$$;
revoke all on function private.chat_online_visible(text) from public,anon;
grant execute on function private.chat_online_visible(text) to authenticated;

-- Supabase owns realtime.messages and already enables RLS. Manage policies only.
create policy chat_online_receive on realtime.messages for select to authenticated
using (extension='presence' and private.chat_online_visible((select realtime.topic())));
create policy chat_online_publish on realtime.messages for insert to authenticated
with check (extension='presence' and (select realtime.topic())='chat-online:'||(select auth.uid())::text);
