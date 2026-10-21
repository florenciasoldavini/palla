-- Moderation evidence is deliberately outside the Data API and Realtime.
create table private.chat_user_reports (
 id uuid primary key,
 reporter_id uuid references public.profiles(id) on delete set null,
 reported_id uuid references public.profiles(id) on delete set null,
 conversation_id uuid references public.chat_conversations(id) on delete set null,
 reason text not null check(reason in('harassment','spam','inappropriate_content','impersonation','other')),
 details text not null default '' check(char_length(details)<=2000),
 block_requested boolean not null default false,
 messages jsonb not null check(jsonb_typeof(messages)='array' and jsonb_array_length(messages)<=20),
 status text not null default 'pending' check(status in('pending','reviewed','dismissed')),
 created_at timestamptz not null default now(),
 reviewed_at timestamptz
);
alter table private.chat_user_reports enable row level security;
revoke all on private.chat_user_reports from public,anon,authenticated;
grant all on private.chat_user_reports to service_role;
create policy chat_user_reports_service_only on private.chat_user_reports for all to service_role using(true) with check(true);
create index chat_user_reports_reporter_time on private.chat_user_reports(reporter_id,created_at desc);
create index chat_user_reports_reported_idx on private.chat_user_reports(reported_id);
create index chat_user_reports_conversation_idx on private.chat_user_reports(conversation_id);
create index chat_user_reports_pending_idx on private.chat_user_reports(created_at) where status='pending';

-- Only the authenticated Edge Function may supply p_reporter_id. No client RPC grant.
create function private.submit_chat_report(
 p_id uuid,p_reporter_id uuid,p_conversation_id uuid,p_reason text,p_details text,p_block boolean
) returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.chat_conversations; peer uuid; existing private.chat_user_reports;
 evidence jsonb; details_value text:=btrim(coalesce(p_details,'')); previous_sub text;
begin
 if p_id is null or p_reporter_id is null or p_conversation_id is null or p_block is null
 or p_reason is null or p_reason not in('harassment','spam','inappropriate_content','impersonation','other')
 or char_length(details_value)>2000 then raise exception 'Invalid report' using errcode='22023';end if;
 select * into c from public.chat_conversations where id=p_conversation_id;
 if c.id is null or p_reporter_id not in(c.organizer_id,c.player_id)
 or not exists(select 1 from public.profiles where id=p_reporter_id and onboarding_completed_at is not null)
 then raise exception 'Report access denied' using errcode='42501';end if;
 peer:=case when p_reporter_id=c.organizer_id then c.player_id else c.organizer_id end;
 -- Serialize quota and idempotency across this reporter's conversations.
 perform pg_advisory_xact_lock(hashtextextended(p_reporter_id::text,77103));
 select * into existing from private.chat_user_reports where id=p_id;
 if existing.id is not null then
  if existing.reporter_id is distinct from p_reporter_id or existing.conversation_id is distinct from p_conversation_id
  or existing.reason<>p_reason or existing.details<>details_value or existing.block_requested<>p_block
  then raise exception 'Report request conflict' using errcode='22023';end if;
  return jsonb_build_object('id',existing.id,'blocked',existing.block_requested);
 end if;
 if (select count(*) from private.chat_user_reports where reporter_id=p_reporter_id and created_at>now()-interval '24 hours')>=10
 then raise exception 'Report limit reached' using errcode='P0001';end if;
 -- Capture only the reporter's visible history, never text behind a cleared cursor.
 select coalesce(jsonb_agg(item order by sequence),'[]'::jsonb) into evidence from (
  select m.sequence,jsonb_build_object('id',m.id,'sender_id',m.sender_id,'sequence',m.sequence::text,
   'body',case when m.deleted_at is null then m.body else null end,
   'created_at',m.created_at,'edited_at',m.edited_at,'deleted_at',m.deleted_at,'revision',m.revision) item
  from public.chat_messages m where m.conversation_id=c.id and m.sequence>coalesce((
   select cleared_through_sequence from public.chat_preferences where conversation_id=c.id and profile_id=p_reporter_id
  ),0) order by m.sequence desc limit 20
 ) recent;
 insert into private.chat_user_reports(id,reporter_id,reported_id,conversation_id,reason,details,block_requested,messages)
 values(p_id,p_reporter_id,peer,c.id,p_reason,details_value,p_block,evidence);
 if p_block then
  -- Reuse all block side effects (signal rotation and pending-push cancellation).
  -- The trusted service-only entrypoint scopes auth.uid() for the existing helper.
  previous_sub:=current_setting('request.jwt.claim.sub',true);
  perform set_config('request.jwt.claim.sub',p_reporter_id::text,true);
  perform private.set_chat_block(c.id,true);
  perform set_config('request.jwt.claim.sub',coalesce(previous_sub,''),true);
 end if;
 return jsonb_build_object('id',p_id,'blocked',p_block);
end $$;
create function public.submit_chat_report(
 p_id uuid,p_reporter_id uuid,p_conversation_id uuid,p_reason text,p_details text,p_block boolean
) returns jsonb language sql security invoker set search_path='' as $$
 select private.submit_chat_report(p_id,p_reporter_id,p_conversation_id,p_reason,p_details,p_block)
$$;
revoke all on function private.submit_chat_report(uuid,uuid,uuid,text,text,boolean),public.submit_chat_report(uuid,uuid,uuid,text,text,boolean) from public,anon,authenticated;
grant usage on schema private to service_role;
grant execute on function private.submit_chat_report(uuid,uuid,uuid,text,text,boolean),public.submit_chat_report(uuid,uuid,uuid,text,text,boolean) to service_role;
