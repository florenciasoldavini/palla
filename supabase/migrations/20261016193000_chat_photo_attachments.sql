-- Private files are only published after the authenticated Edge Function validates them.
alter table public.chat_messages add column kind text not null default 'text' check(kind in ('text','attachment'));
alter table public.chat_messages drop constraint chat_messages_body_check;
alter table public.chat_messages add constraint chat_messages_body_check check(
 (deleted_at is not null and body is null) or
 (deleted_at is null and body is not null and length(body)<=4000 and (kind='attachment' or length(btrim(body))>=1)));
create table public.chat_attachments (
 id uuid primary key,
 message_id uuid not null references public.chat_messages(id) on delete cascade,
 type text not null check(type in ('image','document','audio')),
 storage_path text not null unique,
 mime_type text not null,
 size_bytes integer not null check(size_bytes between 1 and 4194304),
 file_name text,
 width integer,
 height integer,
 duration_ms integer,
 created_at timestamptz not null default now(),
 check(type<>'image' or (mime_type='image/jpeg' and width between 1 and 4096 and height between 1 and 4096))
);
create index chat_attachments_message_idx on public.chat_attachments(message_id);
alter table public.chat_attachments enable row level security;
revoke all on public.chat_attachments from anon,authenticated;
grant select on public.chat_attachments to authenticated;
grant all on public.chat_attachments to service_role;
create policy chat_attachments_visible on public.chat_attachments for select to authenticated using(exists(
 select 1 from public.chat_messages m where m.id=message_id and m.deleted_at is null and private.chat_message_visible(m.conversation_id,m.sequence)));
create table private.chat_photo_uploads (
 id uuid primary key, conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
 sender_id uuid not null references public.profiles(id) on delete cascade,
 body text not null check(length(body)<=4000), reply_to_id uuid, content_hash text not null,
 storage_path text not null unique, created_at timestamptz not null default now(), finalized_at timestamptz, cleaned_at timestamptz
);
create index chat_photo_uploads_sender_idx on private.chat_photo_uploads(sender_id,created_at);
alter table private.chat_photo_uploads enable row level security;
revoke all on private.chat_photo_uploads from public,anon,authenticated;
grant all on private.chat_photo_uploads to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('chat-attachments','chat-attachments',false,4194304,array['image/jpeg'])
 on conflict(id) do update set public=false,file_size_limit=4194304,allowed_mime_types=array['image/jpeg'];
-- No Storage policies: authenticated clients must go through the validated Edge boundary.
alter function private.chat_message_json(public.chat_messages) rename to chat_message_json_before_attachments;
create function private.chat_message_json(m public.chat_messages) returns jsonb language sql stable set search_path='' as $$
 select private.chat_message_json_before_attachments(m)||jsonb_build_object('attachments',
 case when m.deleted_at is not null then '[]'::jsonb else
 (select coalesce(jsonb_agg(to_jsonb(a) order by a.created_at,a.id),'[]'::jsonb) from public.chat_attachments a where a.message_id=m.id) end,
 'reply',case when m.deleted_at is not null then null else
 case when (private.chat_message_json_before_attachments(m)->'reply'->>'available')::boolean
 and private.chat_message_json_before_attachments(m)->'reply'->>'body'='' then
 (private.chat_message_json_before_attachments(m)->'reply')||jsonb_build_object('body','Photo')
 else private.chat_message_json_before_attachments(m)->'reply' end end)
$$;
revoke all on function private.chat_message_json(public.chat_messages) from public,anon;
grant execute on function private.chat_message_json(public.chat_messages) to authenticated,service_role;
create function public.prepare_chat_photo(p_actor uuid,p_id uuid,p_conversation_id uuid,p_body text,p_hash text,p_reply_to_id uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u private.chat_photo_uploads; m public.chat_messages; c public.chat_conversations;
begin
 perform set_config('request.jwt.claim.sub',p_actor::text,true);
 perform private.assert_chat_messaging(p_conversation_id);
 perform pg_advisory_xact_lock(hashtextextended(p_actor::text,930));
 select * into c from public.chat_conversations where id=p_conversation_id for update;
 if not exists(select 1 from public.organizers where profile_id=c.organizer_id and status='active') then raise exception 'Conversation unavailable' using errcode='42501'; end if;
 if p_id is null or p_hash is null or p_hash!~'^[a-f0-9]{64}$' or p_body is null or length(p_body)>4000 then raise exception 'Invalid photo message' using errcode='22023'; end if;
 select * into u from private.chat_photo_uploads where id=p_id;
 if found then
  if u.sender_id<>p_actor or u.conversation_id<>p_conversation_id or u.body<>btrim(p_body) or u.content_hash<>p_hash or u.reply_to_id is distinct from p_reply_to_id then raise exception 'Message identity conflict' using errcode='22023'; end if;
  if u.finalized_at is not null then
   select * into m from public.chat_messages where id=p_id;
   if m.deleted_at is not null then raise exception 'Message deleted' using errcode='42501'; end if;
   return jsonb_build_object('message',private.chat_message_json(m));
  end if;
  update private.chat_photo_uploads set created_at=now(),cleaned_at=null where id=p_id;
  return jsonb_build_object('path',u.storage_path);
 end if;
 if exists(select 1 from public.chat_messages where id=p_id) then raise exception 'Message identity conflict' using errcode='22023'; end if;
 if (select count(*) from private.chat_photo_uploads where sender_id=p_actor and created_at>now()-interval '1 day')>=100 then raise exception 'Photo limit reached' using errcode='54000'; end if;
 if p_reply_to_id is not null and not exists(select 1 from public.chat_messages q where q.id=p_reply_to_id and q.conversation_id=p_conversation_id and q.deleted_at is null and private.chat_message_visible(q.conversation_id,q.sequence)) then raise exception 'Reply unavailable' using errcode='42501'; end if;
 insert into private.chat_photo_uploads(id,conversation_id,sender_id,body,reply_to_id,content_hash,storage_path)
 values(p_id,p_conversation_id,p_actor,btrim(p_body),p_reply_to_id,p_hash,p_actor::text||'/'||p_conversation_id::text||'/'||p_id::text||'.jpg') returning * into u;
 return jsonb_build_object('path',u.storage_path);
end $$;
create function public.finish_chat_photo(p_actor uuid,p_id uuid,p_size integer,p_width integer,p_height integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u private.chat_photo_uploads; m public.chat_messages;
begin
 perform set_config('request.jwt.claim.sub',p_actor::text,true);
 select * into u from private.chat_photo_uploads where id=p_id and sender_id=p_actor;
 if not found then raise exception 'Upload unavailable' using errcode='42501'; end if;
 perform private.assert_chat_messaging(u.conversation_id);
 perform 1 from public.chat_conversations where id=u.conversation_id for update;
 select * into u from private.chat_photo_uploads where id=p_id for update;
 if u.finalized_at is not null then
  select * into m from public.chat_messages where id=p_id;
  if m.deleted_at is not null then raise exception 'Message deleted' using errcode='42501'; end if;
  return private.chat_message_json(m);
 end if;
 if not exists(select 1 from storage.objects where bucket_id='chat-attachments' and name=u.storage_path) then raise exception 'Photo unavailable'; end if;
 if u.reply_to_id is not null and not exists(select 1 from public.chat_messages q where q.id=u.reply_to_id and q.deleted_at is null and private.chat_message_visible(q.conversation_id,q.sequence)) then raise exception 'Reply unavailable' using errcode='42501'; end if;
 if (select count(*) from public.chat_messages where sender_id=p_actor and created_at>now()-interval '1 minute')>=30 then raise exception 'Message rate limit reached' using errcode='54000'; end if;
 insert into public.chat_messages(id,conversation_id,sender_id,kind,body,reply_to_id) values(u.id,u.conversation_id,p_actor,'attachment',u.body,u.reply_to_id) returning * into m;
 insert into public.chat_attachments(id,message_id,type,storage_path,mime_type,size_bytes,file_name,width,height) values(u.id,u.id,'image',u.storage_path,'image/jpeg',p_size,'Photo.jpg',p_width,p_height);
 update private.chat_photo_uploads set finalized_at=clock_timestamp() where id=u.id;
 return private.chat_message_json(m);
end $$;
create function public.get_chat_photo_access(p_actor uuid,p_id uuid) returns text
language plpgsql security definer set search_path='' as $$
declare path text;
begin
 perform set_config('request.jwt.claim.sub',p_actor::text,true);
 select a.storage_path into path from public.chat_attachments a join public.chat_messages m on m.id=a.message_id
 where a.id=p_id and a.type='image' and m.deleted_at is null and private.chat_message_visible(m.conversation_id,m.sequence);
 if path is null then raise exception 'Photo unavailable' using errcode='42501'; end if;
 return path;
end $$;
-- Opportunistic cleanup is limited to the authenticated sender's abandoned/deleted files.
create function public.chat_photo_cleanup_candidates(p_actor uuid) returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from (
 select u.id,u.storage_path from private.chat_photo_uploads u left join public.chat_messages m on m.id=u.id
 where u.sender_id=p_actor and u.cleaned_at is null and ((u.finalized_at is null and u.created_at<now()-interval '1 day') or m.deleted_at is not null)
 order by u.created_at limit 20) x
$$;
create function public.complete_chat_photo_cleanup(p_actor uuid,p_ids uuid[]) returns void
language sql security definer set search_path='' as $$
 update private.chat_photo_uploads set cleaned_at=now() where sender_id=p_actor and id=any(p_ids) and
 ((finalized_at is null and created_at<now()-interval '1 day') or exists(select 1 from public.chat_messages m where m.id=chat_photo_uploads.id and m.deleted_at is not null))
$$;
revoke all on function public.prepare_chat_photo(uuid,uuid,uuid,text,text,uuid),public.finish_chat_photo(uuid,uuid,integer,integer,integer),public.get_chat_photo_access(uuid,uuid),public.chat_photo_cleanup_candidates(uuid),public.complete_chat_photo_cleanup(uuid,uuid[]) from public,anon,authenticated;
grant execute on function public.prepare_chat_photo(uuid,uuid,uuid,text,text,uuid),public.finish_chat_photo(uuid,uuid,integer,integer,integer),public.get_chat_photo_access(uuid,uuid),public.chat_photo_cleanup_candidates(uuid),public.complete_chat_photo_cleanup(uuid,uuid[]) to service_role;
-- Keep privileged implementations out of the exposed schema.
alter function public.prepare_chat_photo(uuid,uuid,uuid,text,text,uuid) set schema private;
alter function public.finish_chat_photo(uuid,uuid,integer,integer,integer) set schema private;
alter function public.get_chat_photo_access(uuid,uuid) set schema private;
alter function public.chat_photo_cleanup_candidates(uuid) set schema private;
alter function public.complete_chat_photo_cleanup(uuid,uuid[]) set schema private;
create function public.prepare_chat_photo(p_actor uuid,p_id uuid,p_conversation_id uuid,p_body text,p_hash text,p_reply_to_id uuid default null) returns jsonb language sql security invoker set search_path='' as $$select private.prepare_chat_photo(p_actor,p_id,p_conversation_id,p_body,p_hash,p_reply_to_id)$$;
create function public.finish_chat_photo(p_actor uuid,p_id uuid,p_size integer,p_width integer,p_height integer) returns jsonb language sql security invoker set search_path='' as $$select private.finish_chat_photo(p_actor,p_id,p_size,p_width,p_height)$$;
create function public.get_chat_photo_access(p_actor uuid,p_id uuid) returns text language sql security invoker set search_path='' as $$select private.get_chat_photo_access(p_actor,p_id)$$;
create function public.chat_photo_cleanup_candidates(p_actor uuid) returns jsonb language sql security invoker set search_path='' as $$select private.chat_photo_cleanup_candidates(p_actor)$$;
create function public.complete_chat_photo_cleanup(p_actor uuid,p_ids uuid[]) returns void language sql security invoker set search_path='' as $$select private.complete_chat_photo_cleanup(p_actor,p_ids)$$;
revoke all on function public.prepare_chat_photo(uuid,uuid,uuid,text,text,uuid),public.finish_chat_photo(uuid,uuid,integer,integer,integer),public.get_chat_photo_access(uuid,uuid),public.chat_photo_cleanup_candidates(uuid),public.complete_chat_photo_cleanup(uuid,uuid[]) from public,anon,authenticated;
grant execute on function public.prepare_chat_photo(uuid,uuid,uuid,text,text,uuid),public.finish_chat_photo(uuid,uuid,integer,integer,integer),public.get_chat_photo_access(uuid,uuid),public.chat_photo_cleanup_candidates(uuid),public.complete_chat_photo_cleanup(uuid,uuid[]) to service_role;
