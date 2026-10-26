-- Current shared registrations drive chat context; source_session_id remains provenance.
create function private.chat_session_context(p_conversation_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null or not private.chat_participant(p_conversation_id) then return null; end if;
 with shared as materialized (
  select s.id,s.title,s.starts_at,s.ends_at,s.status from public.chat_conversations c
  join public.registrations r on r.player_id=c.player_id and r.status in ('confirmed','waitlisted')
  join public.sessions s on s.id=r.session_id and s.organizer_id=c.organizer_id and s.status<>'cancelled'
  where c.id=p_conversation_id
 ), upcoming as materialized (
  select * from shared where status='published' and ends_at>now()
 )
 select jsonb_build_object(
  'next_session',(select jsonb_build_object('id',id,'title',title,'starts_at',starts_at,'ends_at',ends_at)
   from upcoming order by starts_at,id limit 1),
  'upcoming_count',(select count(*) from upcoming),
  'past_count',(select count(*) from shared where status='completed' or ends_at<=now())
 ) into result;
 return result;
end $$;
revoke all on function private.chat_session_context(uuid) from public,anon;
grant execute on function private.chat_session_context(uuid) to authenticated;

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
 'session_context',ctx.value,
 'source_session',case when ctx.value->'next_session'='null'::jsonb then null else (ctx.value->'next_session')-'ends_at' end) as result
 from public.chat_conversations c
 join public.profiles p on p.id=case when c.organizer_id=auth.uid() then c.player_id else c.organizer_id end
 left join public.chat_preferences pref on pref.conversation_id=c.id and pref.profile_id=auth.uid()
 left join public.chat_reads r on r.conversation_id=c.id and r.profile_id=auth.uid()
 cross join lateral (select private.chat_session_context(c.id) as value) ctx
 left join lateral(select * from public.chat_messages where conversation_id=c.id and sequence>coalesce(pref.cleared_through_sequence,0) order by sequence desc limit 1) m on true
 where (c.organizer_id=auth.uid() or c.player_id=auth.uid()) and (p_conversation_id is null or c.id=p_conversation_id)
 and (p_conversation_id is not null or not coalesce(pref.hidden,false) or m.id is not null)
 ) rows
$$;

create function private.list_chat_inbox_filtered(
 p_search text default '', p_filter text default 'all',
 p_cursor jsonb default null, p_limit integer default 30
) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare
 actor uuid := auth.uid();
 cursor_pin timestamptz;
 cursor_at timestamptz;
 cursor_id uuid;
 result jsonb;
begin
 if actor is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_limit is null or p_limit not between 1 and 50 or p_search is null or length(p_search)>200 or p_filter is null or p_filter not in ('all','unread','upcoming','past') then
  raise exception 'Invalid inbox request' using errcode='22023';
 end if;
 if p_cursor is not null then
  cursor_pin := (p_cursor->>'pinned_at')::timestamptz;
  cursor_at := (p_cursor->>'last_at')::timestamptz;
  cursor_id := (p_cursor->>'id')::uuid;
  if jsonb_typeof(p_cursor)<>'object' or cursor_at is null or cursor_id is null
   or not isfinite(cursor_at) or (cursor_pin is not null and not isfinite(cursor_pin)) then
   raise exception 'Invalid inbox cursor' using errcode='22023';
  end if;
 end if;
 with base as materialized (
  select c.id, pref.pinned_at,
   (ctx.value->>'upcoming_count')::int as upcoming_count,(ctx.value->>'past_count')::int as past_count, coalesce(m.created_at,c.created_at) as last_at,
   coalesce(pref.marked_unread,false) as marked_unread,
   (select count(*) from public.chat_messages u where u.conversation_id=c.id
    and u.sender_id<>actor and u.deleted_at is null
    and u.sequence>greatest(coalesce(r.through_sequence,0),coalesce(pref.cleared_through_sequence,0))) as unread_count,
   strpos(lower(concat_ws(' ',p.first_name,p.last_name,m.body)),lower(btrim(p_search)))>0 as matches
  from public.chat_conversations c
  cross join lateral (select private.chat_session_context(c.id) as value) ctx
  join public.profiles p on p.id=case when c.organizer_id=actor then c.player_id else c.organizer_id end
  left join public.chat_preferences pref on pref.conversation_id=c.id and pref.profile_id=actor
  left join public.chat_reads r on r.conversation_id=c.id and r.profile_id=actor
  left join lateral (
   select created_at,body,id from public.chat_messages
   where conversation_id=c.id and sequence>coalesce(pref.cleared_through_sequence,0)
   order by sequence desc limit 1
  ) m on true
  where (c.organizer_id=actor or c.player_id=actor)
   and (not coalesce(pref.hidden,false) or m.id is not null)
 ), candidates as materialized (
  select * from base
  where matches and (p_filter='all' or (p_filter='unread' and (marked_unread or unread_count>0))
   or (p_filter='upcoming' and upcoming_count>0) or (p_filter='past' and upcoming_count=0 and past_count>0))
   and (p_cursor is null or
    (coalesce(pinned_at,'-infinity'::timestamptz),last_at,id)
    < (coalesce(cursor_pin,'-infinity'::timestamptz),cursor_at,cursor_id))
  order by pinned_at desc nulls last,last_at desc,id desc
  limit p_limit+1
 ), page as materialized (
  select * from candidates order by pinned_at desc nulls last,last_at desc,id desc limit p_limit
 )
 select jsonb_build_object(
  'conversations',coalesce((select jsonb_agg(private.list_chat_conversations(id)->0
    order by pinned_at desc nulls last,last_at desc,id desc) from page),'[]'::jsonb),
  'next_cursor',case when (select count(*) from candidates)>p_limit then
   (select jsonb_build_object('pinned_at',pinned_at,'last_at',last_at,'id',id)
    from page order by pinned_at asc nulls first,last_at asc,id asc limit 1) else null end,
  'counts',jsonb_build_object(
   'all',(select count(*) from base where matches),
   'unread',(select count(*) from base where matches and (marked_unread or unread_count>0)),
   'upcoming',(select count(*) from base where matches and upcoming_count>0),
   'past',(select count(*) from base where matches and upcoming_count=0 and past_count>0),
   'total_unread',(select count(*) from base where marked_unread or unread_count>0),
   'badge',coalesce((select sum(greatest(unread_count,case when marked_unread then 1 else 0 end)) from base),0)
  )
 ) into result;
 return result;
end $$;
revoke all on function private.list_chat_inbox_filtered(text,text,jsonb,integer) from public,anon;
grant execute on function private.list_chat_inbox_filtered(text,text,jsonb,integer) to authenticated;
create function public.list_chat_inbox_filtered(p_search text default '',p_filter text default 'all',p_cursor jsonb default null,p_limit integer default 30) returns jsonb
language sql stable security invoker set search_path='' as $$
 select private.list_chat_inbox_filtered(p_search,p_filter,p_cursor,p_limit)
$$;
revoke all on function public.list_chat_inbox_filtered(text,text,jsonb,integer) from public,anon;
grant execute on function public.list_chat_inbox_filtered(text,text,jsonb,integer) to authenticated;

-- Existing SELECT RLS controls which session/registration change events a client receives.
do $$begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='sessions') then
   alter publication supabase_realtime add table public.sessions;
  end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='registrations') then
   alter publication supabase_realtime add table public.registrations;
  end if;
 end if;
end $$;
