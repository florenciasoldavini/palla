-- Enforce nonblank content even for clients calling the RPC directly.
create or replace function private.publish_session_announcement(p_session uuid,p_body text,p_request uuid,p_expected_count integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.sessions; a public.session_announcements; audience integer;begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
 -- Serialize host sends across sessions as well as retries; enforce a small server-side flood limit.
 perform 1 from public.organizers where profile_id=auth.uid() and status='active' for update;
 if not found then raise exception 'Organizer access required' using errcode='42501';end if;
 select * into s from public.sessions where id=p_session for update;
 if s.id is null or s.organizer_id<>auth.uid() then raise exception 'Session unavailable' using errcode='42501';end if;
 if p_request is null or p_body is null or p_body !~ '[^[:space:]]' or char_length(btrim(p_body)) not between 1 and 1000 then raise exception 'Write a message of up to 1,000 characters';end if;
 select * into a from public.session_announcements where author_id=auth.uid() and client_request_id=p_request;
 if a.id is not null then
  if a.session_id<>s.id or (a.removed_at is null and a.body<>btrim(p_body)) then raise exception 'Send request already used';end if;
  return private.announcement_context(s.id,a.id);
 end if;
 if s.status<>'published' or s.ends_at<=now() then raise exception 'Announcements are only available before the session ends';end if;
 if (select count(*) from public.session_announcements where author_id=auth.uid() and created_at>now()-interval '1 minute')>=10 then raise exception 'Please wait a minute before sending another announcement';end if;
 -- Lock the recipient registrations while the immutable audience snapshot is taken.
 perform 1 from public.registrations where session_id=s.id and status='confirmed' and player_id<>s.organizer_id for share;
 select count(*) into audience from public.registrations where session_id=s.id and status='confirmed' and player_id<>s.organizer_id;
 if audience=0 then raise exception 'There are no confirmed players to notify';end if;
 if p_expected_count is distinct from audience then raise exception 'The recipient count changed. Check the updated count and try again';end if;
 insert into public.session_announcements(session_id,author_id,body,client_request_id) values(s.id,auth.uid(),btrim(p_body),p_request) returning * into a;
 insert into private.session_announcement_recipients(announcement_id,recipient_id,registration_id) select a.id,player_id,id from public.registrations where session_id=s.id and status='confirmed' and player_id<>s.organizer_id;
 insert into private.app_notifications(recipient_id,notification_type,registration_id,announcement_id,deduplication_key)
 select recipient_id,'session_announcements',registration_id,a.id,'announcement:'||a.id||':'||recipient_id from private.session_announcement_recipients where announcement_id=a.id;
 return private.announcement_context(s.id,a.id);
end$$;
