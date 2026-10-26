-- Release only the caller's own confirmed place; preserve the registration history.
create function private.cancel_session_registration(p_session_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); s public.sessions; r public.registrations; instant timestamptz;
begin
 if actor is null then raise exception 'CANCEL_SIGN_IN_REQUIRED'; end if;
 select * into s from public.sessions where id=p_session_id for update;
 if s.id is null then raise exception 'CANCEL_NOT_REGISTERED'; end if;
 select * into r from public.registrations where session_id=s.id and player_id=actor for update;
 if r.id is null then raise exception 'CANCEL_NOT_REGISTERED'; end if;
 if r.status='cancelled' then
   return jsonb_build_object('status','cancelled','confirmed_count',(select count(*) from public.registrations where session_id=s.id and status='confirmed'));
 end if;
 if r.status<>'confirmed' then raise exception 'CANCEL_NOT_REGISTERED'; end if;
 instant:=clock_timestamp();
 if s.status<>'published' or s.starts_at<=instant then raise exception 'CANCEL_UNAVAILABLE'; end if;
 if s.cancellation_deadline_at is not null and s.cancellation_deadline_at<=instant then raise exception 'CANCEL_DEADLINE'; end if;
 update public.registrations set status='cancelled',cancelled_at=instant,cancelled_by=actor,
   cancellation_reason=null,checked_in_at=null,checked_in_by=null where id=r.id;
 -- The existing trigger promotes eligible queued players in automatic mode.
 return jsonb_build_object('status','cancelled','confirmed_count',(select count(*) from public.registrations where session_id=s.id and status='confirmed'));
end; $$;
create function public.cancel_session_registration(p_session_id uuid) returns jsonb
language sql security invoker set search_path='' as $$select private.cancel_session_registration(p_session_id)$$;
revoke all on function private.cancel_session_registration(uuid),public.cancel_session_registration(uuid) from public,anon;
grant execute on function private.cancel_session_registration(uuid),public.cancel_session_registration(uuid) to authenticated;
