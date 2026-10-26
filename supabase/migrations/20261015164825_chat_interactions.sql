-- Per-account inbox state is separate from shared message history and receipts.
create table public.chat_preferences (
 conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
 profile_id uuid not null references public.profiles(id) on delete cascade,
 pinned_at timestamptz,
 marked_unread boolean not null default false,
 hidden boolean not null default false,
 cleared_through_sequence bigint not null default 0 check(cleared_through_sequence>=0),
 primary key(conversation_id,profile_id)
);
create index chat_preferences_profile_idx on public.chat_preferences(profile_id);
alter table public.chat_preferences enable row level security;
revoke all on public.chat_preferences from anon,authenticated;
grant select on public.chat_preferences to authenticated;
grant all on public.chat_preferences to service_role;
create policy chat_preferences_own on public.chat_preferences for select to authenticated
 using(profile_id=(select auth.uid()) and private.chat_participant(conversation_id));

alter table public.chat_messages add column edited_at timestamptz,
 add column deleted_at timestamptz,
 add column revision integer not null default 1 check(revision>0);
alter table public.chat_messages drop constraint chat_messages_body_check;
alter table public.chat_messages alter column body drop not null;
alter table public.chat_messages add constraint chat_messages_body_check check(
 (deleted_at is null and body is not null and length(btrim(body)) between 1 and 4000)
 or (deleted_at is not null and body is null));

create function private.chat_message_visible(p_conversation_id uuid,p_sequence bigint) returns boolean
language sql stable security definer set search_path='' as $$
 select private.chat_participant(p_conversation_id) and p_sequence>coalesce((select cleared_through_sequence from public.chat_preferences where conversation_id=p_conversation_id and profile_id=(select auth.uid())),0)
$$;
revoke all on function private.chat_message_visible(uuid,bigint) from public,anon;
grant execute on function private.chat_message_visible(uuid,bigint) to authenticated;
drop policy chat_messages_members on public.chat_messages;
create policy chat_messages_members on public.chat_messages for select to authenticated
 using(private.chat_message_visible(conversation_id,sequence));

-- Old message text is erased, never returned as hidden JSON metadata.
create function private.change_chat_message(p_id uuid,p_body text,p_revision integer,p_delete boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
declare m public.chat_messages; c public.chat_conversations;
begin
 if auth.uid() is null then raise exception 'Chat access denied'; end if;
 select * into m from public.chat_messages where id=p_id;
 if not found or m.sender_id<>auth.uid() or not private.chat_message_visible(m.conversation_id,m.sequence) then raise exception 'Message unavailable'; end if;
 -- Same conversation lock order as send/delete-chat prevents history races.
 select * into c from public.chat_conversations where id=m.conversation_id for update;
 select * into m from public.chat_messages where id=p_id for update;
 if not private.chat_message_visible(m.conversation_id,m.sequence) then raise exception 'Message unavailable'; end if;
 if not exists(select 1 from public.organizers where profile_id=c.organizer_id and status='active') then raise exception 'Conversation unavailable'; end if;
 if p_delete and m.deleted_at is not null then return private.chat_message_json(m); end if;
 if m.deleted_at is not null then raise exception 'Message unavailable'; end if;
 if p_revision is null or p_revision<>m.revision then raise exception 'Message changed. Reload and try again.'; end if;
 if p_delete then
  update public.chat_messages set body=null,deleted_at=clock_timestamp(),revision=revision+1 where id=p_id returning * into m;
 else
  if p_body is null or length(btrim(p_body)) not between 1 and 4000 then raise exception 'Invalid message'; end if;
  if m.body=btrim(p_body) then return private.chat_message_json(m); end if;
  update public.chat_messages set body=btrim(p_body),edited_at=clock_timestamp(),revision=revision+1 where id=p_id returning * into m;
 end if;
 return private.chat_message_json(m);
end $$;
create function public.edit_chat_message(p_id uuid,p_body text,p_revision integer) returns jsonb
language sql security invoker set search_path='' as $$select private.change_chat_message(p_id,p_body,p_revision,false)$$;
create function public.delete_chat_message(p_id uuid,p_revision integer) returns jsonb
language sql security invoker set search_path='' as $$select private.change_chat_message(p_id,null,p_revision,true)$$;
revoke all on function private.change_chat_message(uuid,text,integer,boolean),public.edit_chat_message(uuid,text,integer),public.delete_chat_message(uuid,integer) from public,anon;
grant execute on function private.change_chat_message(uuid,text,integer,boolean),public.edit_chat_message(uuid,text,integer),public.delete_chat_message(uuid,integer) to authenticated;

create function private.update_chat_preferences(p_conversation_id uuid,p_action text) returns void
language plpgsql security definer set search_path='' as $$
declare latest bigint; actor uuid:=auth.uid();
begin
 if actor is null or not private.chat_participant(p_conversation_id) then raise exception 'Chat access denied'; end if;
 if p_action is null or p_action not in('pin','unpin','mark_read','mark_unread','delete') then raise exception 'Invalid chat action'; end if;
 perform 1 from public.chat_conversations where id=p_conversation_id for update;
 select coalesce(max(sequence),0) into latest from public.chat_messages where conversation_id=p_conversation_id;
 insert into public.chat_preferences(conversation_id,profile_id) values(p_conversation_id,actor) on conflict do nothing;
 if p_action='pin' then
  update public.chat_preferences set pinned_at=coalesce(pinned_at,clock_timestamp()) where conversation_id=p_conversation_id and profile_id=actor;
 elsif p_action='unpin' then
  update public.chat_preferences set pinned_at=null where conversation_id=p_conversation_id and profile_id=actor;
 elsif p_action='mark_unread' then
  update public.chat_preferences set marked_unread=true where conversation_id=p_conversation_id and profile_id=actor;
 else
  insert into public.chat_reads(conversation_id,profile_id,through_sequence) values(p_conversation_id,actor,latest)
   on conflict(conversation_id,profile_id) do update set through_sequence=greatest(public.chat_reads.through_sequence,excluded.through_sequence),updated_at=clock_timestamp();
  update public.chat_preferences set marked_unread=false,
    hidden=case when p_action='delete' then true else hidden end,
    cleared_through_sequence=case when p_action='delete' then latest else cleared_through_sequence end,
    pinned_at=case when p_action='delete' then null else pinned_at end
    where conversation_id=p_conversation_id and profile_id=actor;
 end if;
end $$;
create function public.update_chat_preferences(p_conversation_id uuid,p_action text) returns void
language sql security invoker set search_path='' as $$select private.update_chat_preferences(p_conversation_id,p_action)$$;
revoke all on function private.update_chat_preferences(uuid,text),public.update_chat_preferences(uuid,text) from public,anon;
grant execute on function private.update_chat_preferences(uuid,text),public.update_chat_preferences(uuid,text) to authenticated;

create or replace function private.get_chat_messages(p_conversation_id uuid,p_before_sequence bigint default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare output jsonb;
begin
 if auth.uid() is null or not private.chat_participant(p_conversation_id) then raise exception 'Chat access denied'; end if;
 select coalesce(jsonb_agg(private.chat_message_json(m) order by m.sequence),'[]'::jsonb) into output from (
  select * from public.chat_messages where conversation_id=p_conversation_id and private.chat_message_visible(conversation_id,sequence)
  and (p_before_sequence is null or sequence<p_before_sequence) order by sequence desc limit 50
 ) m;
 return output;
end $$;
create or replace function private.mark_chat_read(p_conversation_id uuid,p_through_sequence bigint) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.chat_participant(p_conversation_id) then raise exception 'Chat access denied'; end if;
 if p_through_sequence is null or not exists(select 1 from public.chat_messages where conversation_id=p_conversation_id and sequence=p_through_sequence) then raise exception 'Read position unavailable'; end if;
 insert into public.chat_reads(conversation_id,profile_id,through_sequence) values(p_conversation_id,auth.uid(),p_through_sequence)
 on conflict(conversation_id,profile_id) do update set through_sequence=greatest(public.chat_reads.through_sequence,excluded.through_sequence),updated_at=clock_timestamp();
 update public.chat_preferences set marked_unread=false where conversation_id=p_conversation_id and profile_id=auth.uid();
end $$;

create or replace function private.list_chat_conversations(p_conversation_id uuid default null) returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(result order by pinned_at desc nulls last,last_at desc,id),'[]'::jsonb) from (
 select c.id,pref.pinned_at,coalesce(m.created_at,c.created_at) as last_at,
 jsonb_build_object('conversation',to_jsonb(c),
 'other_participant',jsonb_build_object('id',p.id,'first_name',p.first_name,'last_name',p.last_name,'avatar_url',p.avatar_url,'playing_category',p.playing_category),
 'other_role',case when c.organizer_id=auth.uid() then 'player' else 'organizer' end,
 'last_message',case when m.id is null then null else private.chat_message_json(m) end,
 'pinned_at',pref.pinned_at,'marked_unread',coalesce(pref.marked_unread,false),
 'other_read_sequence',(select nullif(peer.through_sequence,0)::text from public.chat_reads peer where peer.conversation_id=c.id and peer.profile_id=case when c.organizer_id=auth.uid() then c.player_id else c.organizer_id end),
 'unread_count',(select count(*) from public.chat_messages u where u.conversation_id=c.id and u.sender_id<>auth.uid() and u.deleted_at is null and u.sequence>greatest(coalesce(r.through_sequence,0),coalesce(pref.cleared_through_sequence,0))),
 'source_session',case when s.id is null then null else jsonb_build_object('id',s.id,'title',s.title,'starts_at',s.starts_at) end) as result
 from public.chat_conversations c
 join public.profiles p on p.id=case when c.organizer_id=auth.uid() then c.player_id else c.organizer_id end
 left join public.chat_preferences pref on pref.conversation_id=c.id and pref.profile_id=auth.uid()
 left join public.chat_reads r on r.conversation_id=c.id and r.profile_id=auth.uid()
 left join public.sessions s on s.id=c.source_session_id
 left join lateral(select * from public.chat_messages where conversation_id=c.id and sequence>coalesce(pref.cleared_through_sequence,0) order by sequence desc limit 1) m on true
 where (c.organizer_id=auth.uid() or c.player_id=auth.uid()) and (p_conversation_id is null or c.id=p_conversation_id)
 and (p_conversation_id is not null or not coalesce(pref.hidden,false) or m.id is not null)
 ) rows
$$;


do $$begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
  alter publication supabase_realtime add table public.chat_preferences;
 end if;
end $$;
