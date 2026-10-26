-- Bounded inbox payloads. Conversation detail retains its existing RPC.
create function private.list_chat_inbox(
 p_search text default '', p_unread_only boolean default false,
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
 if p_limit is null or p_limit not between 1 and 50 or p_search is null or length(p_search)>200 or p_unread_only is null then
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
  select c.id, pref.pinned_at, coalesce(m.created_at,c.created_at) as last_at,
   coalesce(pref.marked_unread,false) as marked_unread,
   (select count(*) from public.chat_messages u where u.conversation_id=c.id
    and u.sender_id<>actor and u.deleted_at is null
    and u.sequence>greatest(coalesce(r.through_sequence,0),coalesce(pref.cleared_through_sequence,0))) as unread_count,
   strpos(lower(concat_ws(' ',p.first_name,p.last_name,m.body)),lower(btrim(p_search)))>0 as matches
  from public.chat_conversations c
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
  where matches and (not p_unread_only or marked_unread or unread_count>0)
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
   'total_unread',(select count(*) from base where marked_unread or unread_count>0),
   'badge',coalesce((select sum(greatest(unread_count,case when marked_unread then 1 else 0 end)) from base),0)
  )
 ) into result;
 return result;
end $$;
revoke all on function private.list_chat_inbox(text,boolean,jsonb,integer) from public,anon;
grant execute on function private.list_chat_inbox(text,boolean,jsonb,integer) to authenticated;
create function public.list_chat_inbox(p_search text default '',p_unread_only boolean default false,p_cursor jsonb default null,p_limit integer default 30) returns jsonb
language sql stable security invoker set search_path='' as $$
 select private.list_chat_inbox(p_search,p_unread_only,p_cursor,p_limit)
$$;
revoke all on function public.list_chat_inbox(text,boolean,jsonb,integer) from public,anon;
grant execute on function public.list_chat_inbox(text,boolean,jsonb,integer) to authenticated;
