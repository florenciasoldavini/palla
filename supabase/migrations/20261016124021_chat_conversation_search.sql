-- Literal, case-insensitive substring search within the caller's visible history.
-- Return one selected match and bounded context, rather than downloading all history.
create function private.search_chat_messages(p_conversation_id uuid, p_search text, p_index integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare term text:=btrim(p_search); total integer; selected public.chat_messages; context jsonb;
begin
 if auth.uid() is null or not private.chat_participant(p_conversation_id) then raise exception 'Chat access denied'; end if;
 if term is null or char_length(term)<1 or char_length(term)>200 or p_index is null or p_index<0 then raise exception 'Invalid search'; end if;
 select count(*) into total from public.chat_messages m where m.conversation_id=p_conversation_id
  and private.chat_message_visible(m.conversation_id,m.sequence) and m.deleted_at is null
  and strpos(lower(m.body),lower(term))>0;
 if total=0 then return jsonb_build_object('total',0,'index',null,'selected_id',null,'messages','[]'::jsonb); end if;
 -- Newest match first; clamp when a message is removed while navigating.
 p_index:=least(p_index,total-1);
 select * into selected from public.chat_messages m where m.conversation_id=p_conversation_id
  and private.chat_message_visible(m.conversation_id,m.sequence) and m.deleted_at is null
  and strpos(lower(m.body),lower(term))>0 order by m.sequence desc offset p_index limit 1;
 select coalesce(jsonb_agg(private.chat_message_json(m) order by m.sequence),'[]'::jsonb) into context from (
  (select * from public.chat_messages m where m.conversation_id=p_conversation_id
    and private.chat_message_visible(m.conversation_id,m.sequence) and m.sequence<=selected.sequence order by m.sequence desc limit 13)
  union all
  (select * from public.chat_messages m where m.conversation_id=p_conversation_id
    and private.chat_message_visible(m.conversation_id,m.sequence) and m.sequence>selected.sequence order by m.sequence limit 12)
 ) m;
 return jsonb_build_object('total',total,'index',p_index,'selected_id',selected.id,'messages',context);
end $$;
create function public.search_chat_messages(p_conversation_id uuid,p_search text,p_index integer default 0)
returns jsonb language sql stable security invoker set search_path='' as $$
 select private.search_chat_messages(p_conversation_id,p_search,p_index)
$$;
revoke all on function private.search_chat_messages(uuid,text,integer), public.search_chat_messages(uuid,text,integer) from public,anon;
grant execute on function private.search_chat_messages(uuid,text,integer), public.search_chat_messages(uuid,text,integer) to authenticated;
