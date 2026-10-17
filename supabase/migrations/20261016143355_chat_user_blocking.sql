-- A profile-pair block affects messaging, never registrations or attendance.
create table public.user_blocks (
 blocker_id uuid not null references public.profiles(id) on delete cascade,
 blocked_id uuid not null references public.profiles(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(blocker_id,blocked_id),check(blocker_id<>blocked_id)
);
create index user_blocks_blocked_idx on public.user_blocks(blocked_id,blocker_id);
alter table public.user_blocks enable row level security;
revoke all on public.user_blocks from anon,authenticated;
grant select on public.user_blocks to authenticated;
grant all on public.user_blocks to service_role;
create policy user_blocks_own on public.user_blocks for select to authenticated using(blocker_id=(select auth.uid()));
alter table public.chat_conversations add column access_version bigint not null default 0;

create function private.chat_pair_blocked(a uuid,b uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.user_blocks where (blocker_id=a and blocked_id=b) or (blocker_id=b and blocked_id=a))
$$;
revoke all on function private.chat_pair_blocked(uuid,uuid) from public,anon,authenticated;
create function private.chat_can_message(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.chat_conversations c where c.id=p_id and (c.organizer_id=auth.uid() or c.player_id=auth.uid()) and not private.chat_pair_blocked(c.organizer_id,c.player_id))
$$;
revoke all on function private.chat_can_message(uuid) from public,anon;
grant execute on function private.chat_can_message(uuid) to authenticated;
create function private.lock_chat_pair(a uuid,b uuid) returns void language sql volatile security definer set search_path='' as $$
 select pg_advisory_xact_lock(hashtextextended(least(a,b)::text||greatest(a,b)::text,4881))
$$;
revoke all on function private.lock_chat_pair(uuid,uuid) from public,anon,authenticated;
create function private.assert_chat_messaging(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare c public.chat_conversations;
begin
 select * into c from public.chat_conversations where id=p_id;
 if auth.uid() is null or c.id is null or auth.uid() not in(c.organizer_id,c.player_id) then raise exception 'Chat access denied' using errcode='42501'; end if;
 perform private.lock_chat_pair(c.organizer_id,c.player_id);
 if private.chat_pair_blocked(c.organizer_id,c.player_id) then raise exception 'Messaging unavailable' using errcode='42501'; end if;
end $$;
revoke all on function private.assert_chat_messaging(uuid) from public,anon,authenticated;

create function private.set_chat_block(p_conversation_id uuid,p_blocked boolean) returns void language plpgsql security definer set search_path='' as $$
declare c public.chat_conversations; actor uuid:=auth.uid(); peer uuid; changed integer;
begin
 select * into c from public.chat_conversations where id=p_conversation_id;
 if actor is null or c.id is null or actor not in(c.organizer_id,c.player_id) or p_blocked is null then raise exception 'Chat access denied' using errcode='42501'; end if;
 peer:=case when actor=c.organizer_id then c.player_id else c.organizer_id end;
 perform private.lock_chat_pair(actor,peer);
 if p_blocked then
  insert into public.user_blocks(blocker_id,blocked_id) values(actor,peer) on conflict do nothing;
 else
  delete from public.user_blocks where blocker_id=actor and blocked_id=peer;
 end if;
 get diagnostics changed=row_count;
 if changed>0 then
  -- Generic revision notifies BOTH participants, without exposing who blocked whom.
  update public.chat_conversations set access_version=access_version+1
  where (organizer_id=actor and player_id=peer) or (organizer_id=peer and player_id=actor);
  if p_blocked then
   update private.chat_push_jobs j set state='skipped' from public.chat_messages m
   where j.message_id=m.id and j.state in('pending','sending') and ((m.sender_id=actor and j.recipient_id=peer) or (m.sender_id=peer and j.recipient_id=actor));
  end if;
 end if;
end $$;
create function public.set_chat_block(p_conversation_id uuid,p_blocked boolean) returns void language sql security invoker set search_path='' as $$select private.set_chat_block(p_conversation_id,p_blocked)$$;
revoke all on function private.set_chat_block(uuid,boolean),public.set_chat_block(uuid,boolean) from public,anon;
grant execute on function private.set_chat_block(uuid,boolean),public.set_chat_block(uuid,boolean) to authenticated;

-- Keep existing authorization, rate limits and idempotency; guard every write path.
alter function private.send_chat_message(uuid,uuid,text,uuid) rename to send_chat_message_before_blocking;
revoke all on function private.send_chat_message_before_blocking(uuid,uuid,text,uuid) from public,anon,authenticated;
create function private.send_chat_message(p_id uuid,p_conversation_id uuid,p_body text,p_reply_to_id uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
begin perform private.assert_chat_messaging(p_conversation_id);return private.send_chat_message_before_blocking(p_id,p_conversation_id,p_body,p_reply_to_id);end $$;
revoke all on function private.send_chat_message(uuid,uuid,text,uuid) from public,anon;
grant execute on function private.send_chat_message(uuid,uuid,text,uuid) to authenticated;

alter function private.start_chat(uuid,uuid,uuid) rename to start_chat_before_blocking;
revoke all on function private.start_chat_before_blocking(uuid,uuid,uuid) from public,anon,authenticated;
create function private.start_chat(p_organizer_id uuid,p_player_id uuid,p_source_session_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or auth.uid() not in(p_organizer_id,p_player_id) or p_organizer_id is null or p_player_id is null then raise exception 'Chat access denied' using errcode='42501';end if;
 perform private.lock_chat_pair(p_organizer_id,p_player_id);
 if private.chat_pair_blocked(p_organizer_id,p_player_id) then raise exception 'Messaging unavailable' using errcode='42501';end if;
 return private.start_chat_before_blocking(p_organizer_id,p_player_id,p_source_session_id);
end $$;
revoke all on function private.start_chat(uuid,uuid,uuid) from public,anon;
grant execute on function private.start_chat(uuid,uuid,uuid) to authenticated;

alter function private.set_chat_reaction(uuid,text) rename to set_chat_reaction_before_blocking;
revoke all on function private.set_chat_reaction_before_blocking(uuid,text) from public,anon,authenticated;
create function private.set_chat_reaction(p_message_id uuid,p_emoji text) returns jsonb language plpgsql security definer set search_path='' as $$
declare cid uuid;begin select conversation_id into cid from public.chat_messages where id=p_message_id;perform private.assert_chat_messaging(cid);return private.set_chat_reaction_before_blocking(p_message_id,p_emoji);end $$;
revoke all on function private.set_chat_reaction(uuid,text) from public,anon;
grant execute on function private.set_chat_reaction(uuid,text) to authenticated;

alter function private.change_chat_message(uuid,text,integer,boolean) rename to change_chat_message_before_blocking;
revoke all on function private.change_chat_message_before_blocking(uuid,text,integer,boolean) from public,anon,authenticated;
create function private.change_chat_message(p_id uuid,p_body text,p_revision integer,p_delete boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare cid uuid;begin
 if not coalesce(p_delete,false) then select conversation_id into cid from public.chat_messages where id=p_id;perform private.assert_chat_messaging(cid);end if;
 -- Own-message deletion remains available for privacy; existing ownership checks apply.
 return private.change_chat_message_before_blocking(p_id,p_body,p_revision,p_delete);
end $$;
revoke all on function private.change_chat_message(uuid,text,integer,boolean) from public,anon;
grant execute on function private.change_chat_message(uuid,text,integer,boolean) to authenticated;

alter function private.list_chat_conversations(uuid) rename to list_chat_conversations_before_blocking;
revoke all on function private.list_chat_conversations_before_blocking(uuid) from public,anon,authenticated;
create function private.list_chat_conversations(p_conversation_id uuid default null) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(value||jsonb_build_object('blocked_by_me',exists(select 1 from public.user_blocks where blocker_id=auth.uid() and blocked_id=(value->'other_participant'->>'id')::uuid),'messaging_available',private.chat_can_message((value->'conversation'->>'id')::uuid)) order by n),'[]'::jsonb)
 from jsonb_array_elements(private.list_chat_conversations_before_blocking(p_conversation_id)) with ordinality as rows(value,n)
$$;
revoke all on function private.list_chat_conversations(uuid) from public,anon;
grant execute on function private.list_chat_conversations(uuid) to authenticated;

alter function private.mark_chat_read(uuid,bigint) rename to mark_chat_read_before_blocking;
revoke all on function private.mark_chat_read_before_blocking(uuid,bigint) from public,anon,authenticated;
create function private.mark_chat_read(p_conversation_id uuid,p_through_sequence bigint) returns void language plpgsql security definer set search_path='' as $$
begin
 if not private.chat_participant(p_conversation_id) then raise exception 'Chat access denied' using errcode='42501';end if;
 if private.chat_can_message(p_conversation_id) then perform private.assert_chat_messaging(p_conversation_id);perform private.mark_chat_read_before_blocking(p_conversation_id,p_through_sequence);end if;
end $$;
revoke all on function private.mark_chat_read(uuid,bigint) from public,anon;
grant execute on function private.mark_chat_read(uuid,bigint) to authenticated;

alter function private.acknowledge_chat_deliveries(uuid[]) rename to acknowledge_chat_deliveries_before_blocking;
revoke all on function private.acknowledge_chat_deliveries_before_blocking(uuid[]) from public,anon,authenticated;
create function private.acknowledge_chat_deliveries(p_message_ids uuid[]) returns void language plpgsql security definer set search_path='' as $$
declare ids uuid[];begin
 if auth.uid() is null or coalesce(cardinality(p_message_ids),0) not between 1 and 100 then raise exception 'Delivery access denied';end if;
 if (select count(distinct id) from public.chat_messages where id=any(p_message_ids) and sender_id<>auth.uid() and private.chat_participant(conversation_id))<>cardinality(p_message_ids) then raise exception 'Delivery access denied';end if;
 select array_agg(id) into ids from public.chat_messages where id=any(p_message_ids) and private.chat_can_message(conversation_id);
 if cardinality(ids)>0 then perform private.acknowledge_chat_deliveries_before_blocking(ids);end if;
end $$;
revoke all on function private.acknowledge_chat_deliveries(uuid[]) from public,anon;
grant execute on function private.acknowledge_chat_deliveries(uuid[]) to authenticated;

-- Versioned signal topics stop old subscribers receiving future presence/typing.
create function private.chat_online_topic(subject uuid) returns text language sql stable security definer set search_path='' as $$
 select 'chat-online:'||subject::text||':'||coalesce(sum(access_version),0)::text from public.chat_conversations where organizer_id=subject or player_id=subject
$$;
revoke all on function private.chat_online_topic(uuid) from public,anon,authenticated;
create or replace function private.chat_online_visible(p_topic text) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (p_topic=private.chat_online_topic(auth.uid()) or exists(select 1 from public.chat_conversations c where (c.organizer_id=auth.uid() or c.player_id=auth.uid()) and not private.chat_pair_blocked(c.organizer_id,c.player_id) and p_topic=private.chat_online_topic(case when c.organizer_id=auth.uid() then c.player_id else c.organizer_id end)))
$$;
create function private.chat_online_can_publish(p_topic text) returns boolean language sql stable security definer set search_path='' as $$select auth.uid() is not null and p_topic=private.chat_online_topic(auth.uid())$$;
revoke all on function private.chat_online_can_publish(text) from public,anon;
grant execute on function private.chat_online_can_publish(text) to authenticated;
drop policy chat_online_publish on realtime.messages;
create policy chat_online_publish on realtime.messages for insert to authenticated with check(extension='presence' and private.chat_online_can_publish((select realtime.topic())));

create function private.get_chat_online_topic(p_subject uuid) returns text language plpgsql stable security definer set search_path='' as $$
declare topic text;begin topic:=private.chat_online_topic(p_subject);if not private.chat_online_visible(topic) then raise exception 'Presence unavailable' using errcode='42501';end if;return topic;end $$;
create function public.get_chat_online_topic(p_subject uuid) returns text language sql stable security invoker set search_path='' as $$select private.get_chat_online_topic(p_subject)$$;
revoke all on function private.get_chat_online_topic(uuid),public.get_chat_online_topic(uuid) from public,anon;
grant execute on function private.get_chat_online_topic(uuid),public.get_chat_online_topic(uuid) to authenticated;
create or replace function private.chat_typing_allowed(p_topic text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.chat_conversations c where p_topic='chat-typing:'||c.id::text||':'||c.access_version::text and private.chat_can_message(c.id))
$$;
create function private.get_chat_typing_topic(p_conversation_id uuid) returns text language plpgsql stable security definer set search_path='' as $$
begin if not private.chat_can_message(p_conversation_id) then raise exception 'Messaging unavailable' using errcode='42501';end if;return(select 'chat-typing:'||id::text||':'||access_version::text from public.chat_conversations where id=p_conversation_id);end $$;
create function public.get_chat_typing_topic(p_conversation_id uuid) returns text language sql stable security invoker set search_path='' as $$select private.get_chat_typing_topic(p_conversation_id)$$;
revoke all on function private.get_chat_typing_topic(uuid),public.get_chat_typing_topic(uuid) from public,anon;
grant execute on function private.get_chat_typing_topic(uuid),public.get_chat_typing_topic(uuid) to authenticated;

-- Read sender/message content at claim time; do not duplicate private text in queue storage.
create or replace function public.claim_chat_push_jobs() returns jsonb
language sql security invoker set search_path='' as $$
 with stale as (
  update private.chat_push_jobs j set state='skipped'
  where j.state in ('pending','sending') and (j.created_at<now()-interval '24 hours' or not exists(
   select 1 from private.chat_push_devices d join public.chat_messages m on m.id=j.message_id
   left join public.chat_reads r on r.conversation_id=m.conversation_id and r.profile_id=j.recipient_id
   left join public.chat_preferences p on p.conversation_id=m.conversation_id and p.profile_id=j.recipient_id
   where d.installation_id=j.installation_id and d.profile_id=j.recipient_id and d.enabled and d.expo_token=j.expo_token
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
