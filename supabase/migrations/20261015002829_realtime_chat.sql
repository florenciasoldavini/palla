create table public.chat_conversations (
 id uuid primary key default gen_random_uuid(),
 organizer_id uuid not null references public.profiles(id) on delete restrict,
 player_id uuid not null references public.profiles(id) on delete restrict,
 source_session_id uuid references public.sessions(id) on delete set null,
 created_at timestamptz not null default now(),
 unique(organizer_id,player_id), check(organizer_id<>player_id)
);
create index chat_conversations_player_idx on public.chat_conversations(player_id);
create table public.chat_messages (
 id uuid primary key,
 conversation_id uuid not null references public.chat_conversations(id) on delete restrict,
 sender_id uuid not null references public.profiles(id) on delete restrict,
 sequence bigint generated always as identity unique,
 body text not null check(length(btrim(body)) between 1 and 4000),
 created_at timestamptz not null default clock_timestamp()
);
create index chat_messages_conversation_sequence_idx on public.chat_messages(conversation_id,sequence desc);
create index chat_messages_sender_time_idx on public.chat_messages(sender_id,created_at desc);
create table public.chat_reads (
 conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
 profile_id uuid not null references public.profiles(id) on delete cascade,
 through_sequence bigint not null default 0 check(through_sequence>=0),
 updated_at timestamptz not null default clock_timestamp(),
 primary key(conversation_id,profile_id)
);
create index chat_reads_profile_idx on public.chat_reads(profile_id);
alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_reads enable row level security;
revoke all on public.chat_conversations, public.chat_messages,public.chat_reads from anon,authenticated;
grant select on public.chat_conversations,public.chat_messages,public.chat_reads to authenticated;
grant all on public.chat_conversations,public.chat_messages,public.chat_reads to service_role;
grant usage,select on sequence public.chat_messages_sequence_seq to service_role;

create function private.chat_participant(p_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.chat_conversations c where c.id=p_id and (c.organizer_id=(select auth.uid()) or c.player_id=(select auth.uid())))
$$;
revoke all on function private.chat_participant(uuid) from public,anon;
grant execute on function private.chat_participant(uuid) to authenticated;
create policy chat_conversations_members on public.chat_conversations for select to authenticated using(organizer_id=(select auth.uid()) or player_id=(select auth.uid()));
create policy chat_messages_members on public.chat_messages for select to authenticated using(private.chat_participant(conversation_id));
create policy chat_reads_own on public.chat_reads for select to authenticated using(profile_id=(select auth.uid()) and private.chat_participant(conversation_id));

create function private.chat_message_json(m public.chat_messages) returns jsonb
language sql immutable set search_path='' as $$ select to_jsonb(m)||jsonb_build_object('sequence',m.sequence::text) $$;
revoke all on function private.chat_message_json(public.chat_messages) from public,anon,authenticated;

create function private.start_chat(p_organizer_id uuid,p_player_id uuid,p_source_session_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); c public.chat_conversations;
begin
 if actor is null or actor not in(p_organizer_id,p_player_id) or p_organizer_id is null or p_player_id is null or p_organizer_id=p_player_id then raise exception 'Chat access denied'; end if;
 if not exists(select 1 from public.organizers where profile_id=p_organizer_id and status='active') or not exists(select 1 from public.profiles where id=p_player_id and onboarding_completed_at is not null) then raise exception 'Chat participant unavailable'; end if;
 -- Registration is deliberately NOT required. UI entry points control discovery.
 -- Context may only be attached by its owning organizer; players can start without it.
 if p_source_session_id is not null and (actor<>p_organizer_id or not exists(select 1 from public.sessions where id=p_source_session_id and organizer_id=actor)) then raise exception 'Session context unavailable'; end if;
 insert into public.chat_conversations(organizer_id,player_id,source_session_id) values(p_organizer_id,p_player_id,p_source_session_id)
 on conflict(organizer_id,player_id) do nothing;
 select * into c from public.chat_conversations where organizer_id=p_organizer_id and player_id=p_player_id;
 return to_jsonb(c);
end $$;

create function private.send_chat_message(p_id uuid,p_conversation_id uuid,p_body text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); c public.chat_conversations; m public.chat_messages;
begin
 if actor is null or not private.chat_participant(p_conversation_id) then raise exception 'Chat access denied'; end if;
 if p_id is null or p_body is null or length(btrim(p_body)) not between 1 and 4000 then raise exception 'Invalid message'; end if;
 -- Serialize sends per sender for the rate limit, then per thread for cursor ordering.
 perform pg_advisory_xact_lock(hashtextextended(actor::text,0));
 select * into c from public.chat_conversations where id=p_conversation_id for update;
 if not exists(select 1 from public.organizers where profile_id=c.organizer_id and status='active') then raise exception 'Conversation unavailable'; end if;
 select * into m from public.chat_messages where id=p_id;
 if found then
  if m.sender_id<>actor or m.conversation_id<>p_conversation_id or m.body<>btrim(p_body) then raise exception 'Message retry does not match'; end if;
  return private.chat_message_json(m);
 end if;
 if (select count(*) from public.chat_messages where sender_id=actor and created_at>clock_timestamp()-interval '1 minute')>=30 then raise exception 'Message rate limit reached'; end if;
 insert into public.chat_messages(id,conversation_id,sender_id,body) values(p_id,p_conversation_id,actor,btrim(p_body)) returning * into m;
 return private.chat_message_json(m);
end $$;

create function private.mark_chat_read(p_conversation_id uuid,p_through_sequence bigint) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not private.chat_participant(p_conversation_id) then raise exception 'Chat access denied'; end if;
 if p_through_sequence is null or not exists(select 1 from public.chat_messages where conversation_id=p_conversation_id and sequence=p_through_sequence) then raise exception 'Read position unavailable'; end if;
 insert into public.chat_reads(conversation_id,profile_id,through_sequence) values(p_conversation_id,auth.uid(),p_through_sequence)
 on conflict(conversation_id,profile_id) do update set through_sequence=greatest(public.chat_reads.through_sequence,excluded.through_sequence),updated_at=clock_timestamp();
end $$;

create function private.list_chat_conversations(p_conversation_id uuid default null) returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(result order by last_at desc,id),'[]'::jsonb) from (
 select c.id,coalesce(m.created_at,c.created_at) as last_at,
 jsonb_build_object('conversation',to_jsonb(c),
 'other_participant',jsonb_build_object('id',p.id,'first_name',p.first_name,'last_name',p.last_name,'avatar_url',p.avatar_url,'playing_category',p.playing_category),
 'other_role',case when c.organizer_id=auth.uid() then 'player' else 'organizer' end,
 'last_message',case when m.id is null then null else private.chat_message_json(m) end,
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

create function private.get_chat_messages(p_conversation_id uuid,p_before_sequence bigint default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare output jsonb;
begin
 if auth.uid() is null or not private.chat_participant(p_conversation_id) then raise exception 'Chat access denied'; end if;
 select coalesce(jsonb_agg(private.chat_message_json(m) order by m.sequence),'[]'::jsonb) into output from (
  select * from public.chat_messages where conversation_id=p_conversation_id and (p_before_sequence is null or sequence<p_before_sequence) order by sequence desc limit 50
 ) m;
 return output;
end $$;

create function public.start_chat(p_organizer_id uuid,p_player_id uuid,p_source_session_id uuid default null) returns jsonb language sql security invoker set search_path='' as $$select private.start_chat(p_organizer_id,p_player_id,p_source_session_id)$$;
create function public.send_chat_message(p_id uuid,p_conversation_id uuid,p_body text) returns jsonb language sql security invoker set search_path='' as $$select private.send_chat_message(p_id,p_conversation_id,p_body)$$;
create function public.mark_chat_read(p_conversation_id uuid,p_through_sequence bigint) returns void language sql security invoker set search_path='' as $$select private.mark_chat_read(p_conversation_id,p_through_sequence)$$;
create function public.list_chat_conversations(p_conversation_id uuid default null) returns jsonb language sql security invoker set search_path='' as $$select private.list_chat_conversations(p_conversation_id)$$;
create function public.get_chat_messages(p_conversation_id uuid,p_before_sequence bigint default null) returns jsonb language sql security invoker set search_path='' as $$select private.get_chat_messages(p_conversation_id,p_before_sequence)$$;
revoke all on function private.start_chat(uuid,uuid,uuid),public.start_chat(uuid,uuid,uuid),private.send_chat_message(uuid,uuid,text),public.send_chat_message(uuid,uuid,text),private.mark_chat_read(uuid,bigint),public.mark_chat_read(uuid,bigint),private.list_chat_conversations(uuid),public.list_chat_conversations(uuid),private.get_chat_messages(uuid,bigint),public.get_chat_messages(uuid,bigint) from public,anon;
grant execute on function private.start_chat(uuid,uuid,uuid),public.start_chat(uuid,uuid,uuid),private.send_chat_message(uuid,uuid,text),public.send_chat_message(uuid,uuid,text),private.mark_chat_read(uuid,bigint),public.mark_chat_read(uuid,bigint),private.list_chat_conversations(uuid),public.list_chat_conversations(uuid),private.get_chat_messages(uuid,bigint),public.get_chat_messages(uuid,bigint) to authenticated;
-- Supabase Postgres Changes applies the table RLS to each subscriber.
do $$begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
  alter publication supabase_realtime add table public.chat_messages,public.chat_reads;
 end if;
end $$;
