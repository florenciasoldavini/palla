-- A read receipt is shared only inside its private conversation. Writes remain
-- RPC-only, and mark_chat_read always derives the reader from auth.uid().
drop policy chat_reads_own on public.chat_reads;
create policy chat_reads_members on public.chat_reads
for select to authenticated
using (private.chat_participant(conversation_id));

create or replace function private.list_chat_conversations(p_conversation_id uuid default null) returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(result order by last_at desc,id),'[]'::jsonb) from (
 select c.id,coalesce(m.created_at,c.created_at) as last_at,
 jsonb_build_object('conversation',to_jsonb(c),
 'other_participant',jsonb_build_object('id',p.id,'first_name',p.first_name,'last_name',p.last_name,'avatar_url',p.avatar_url,'playing_category',p.playing_category),
 'other_role',case when c.organizer_id=auth.uid() then 'player' else 'organizer' end,
 'last_message',case when m.id is null then null else private.chat_message_json(m) end,
 'other_read_sequence',(select peer.through_sequence::text from public.chat_reads peer where peer.conversation_id=c.id and peer.profile_id=case when c.organizer_id=auth.uid() then c.player_id else c.organizer_id end),
 'unread_count',(select count(*) from public.chat_messages u where u.conversation_id=c.id and u.sender_id<>auth.uid() and u.sequence>coalesce(r.through_sequence,0)),
 'source_session',case when s.id is null then null else jsonb_build_object('id',s.id,'title',s.title,'starts_at',s.starts_at) end) as result
 from public.chat_conversations c
 join public.profiles p on p.id=case when c.organizer_id=auth.uid() then c.player_id else c.organizer_id end
 left join public.chat_reads r on r.conversation_id=c.id and r.profile_id=auth.uid()
 left join public.sessions s on s.id=c.source_session_id
 left join lateral(select * from public.chat_messages where conversation_id=c.id order by sequence desc limit 1) m on true
 where (c.organizer_id=auth.uid() or c.player_id=auth.uid()) and (p_conversation_id is null or c.id=p_conversation_id)
 ) rows
$$;
