-- Host lock precedes series/occurrence locks, matching announcement sends.
create or replace function private.cancel_session_occurrences(p_session uuid,p_scope text,p_reason_code text,p_message text,p_expected_version timestamptz,p_request uuid,p_expected_count integer default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare target public.sessions; s public.sessions; event private.session_cancellations; affected integer:=0; audience integer; message text; batch uuid:=gen_random_uuid();begin
 if auth.uid() is null then raise exception 'Organizer access required' using errcode='42501';end if;
 -- Serialize request identity across different series owned by the same host.
 perform 1 from public.organizers where profile_id=auth.uid() and status='active' for update;
 if not found then raise exception 'Organizer access required' using errcode='42501';end if;
 if p_scope is null or p_scope not in ('one','future') then raise exception 'Choose a cancellation scope';end if;
 if p_reason_code is null or p_reason_code not in ('weather','venue_issue','host_emergency','insufficient_players','other') then raise exception 'Choose a cancellation reason';end if;
 message:=nullif(regexp_replace(coalesce(p_message,''),'^[[:space:]]+|[[:space:]]+$','','g'),'');
 if char_length(message)>1000 then raise exception 'Use up to 1,000 characters';end if;
 if p_request is null then raise exception 'Cancellation request required';end if;
 -- Same series -> occurrences -> registrations lock order as saves and roster changes.
 perform ss.id from public.session_series ss join public.sessions x on x.series_id=ss.id where x.id=p_session and x.organizer_id=auth.uid() for update of ss;
 select * into target from public.sessions where id=p_session and organizer_id=auth.uid() for update;
 if target.id is null then raise exception 'Session unavailable' using errcode='42501';end if;
 if exists(select 1 from private.session_cancellations where client_request_id=p_request and cancelled_by=auth.uid()) then
  select * into event from private.session_cancellations where client_request_id=p_request and session_id=p_session and request_session_id=p_session and cancelled_by=auth.uid();
  if event.id is null or target.cancellation_reason_code is distinct from p_reason_code or target.cancellation_reason is distinct from message then raise exception 'Cancellation request already used';end if;
  return private.cancellation_context(target.id,event.id)||jsonb_build_object('cancelled_count',(select count(*) from private.session_cancellations where client_request_id=p_request and cancelled_by=auth.uid()));
 end if;
 if target.status<>'published' or target.starts_at<=now() then raise exception 'This session can no longer be changed';end if;
 if p_expected_version is null or target.updated_at<>p_expected_version then raise exception 'Session changed. Reload before saving';end if;
 perform 1 from public.registrations where session_id=target.id for update;
 select count(*) into audience from public.registrations where session_id=target.id and status in ('confirmed','waitlisted') and player_id<>target.organizer_id;
 if p_expected_count is not null and p_expected_count<>audience then raise exception 'The recipient count changed. Review the updated count and try again';end if;
 for s in select * from public.sessions where series_id=target.series_id and organizer_id=auth.uid() and status='published' and starts_at>now() and (id=target.id or (p_scope='future' and occurrence_date>=target.occurrence_date)) order by id for update loop
  insert into private.session_cancellations(session_id,batch_id,client_request_id,request_session_id,cancelled_by) values(s.id,batch,p_request,target.id,auth.uid());
  update public.sessions set status='cancelled',cancelled_at=now(),cancellation_reason_code=p_reason_code,cancellation_reason=message where id=s.id;
  affected:=affected+1;
 end loop;
 select * into event from private.session_cancellations where session_id=target.id;
 return private.cancellation_context(target.id,event.id)||jsonb_build_object('cancelled_count',affected);
end$$;
