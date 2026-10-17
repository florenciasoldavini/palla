-- Device tokens and delivery work are private; clients use bounded, actor-scoped RPCs.
create table private.chat_push_devices (
 installation_id uuid primary key,
 profile_id uuid not null references public.profiles(id) on delete cascade,
 expo_token text not null unique check (expo_token ~ '^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$'),
 platform text not null check (platform in ('ios','android')),
 enabled boolean not null default true,
 updated_at timestamptz not null default now()
);
create index chat_push_devices_profile on private.chat_push_devices(profile_id);
alter table private.chat_push_devices enable row level security;
revoke all on private.chat_push_devices from public,anon,authenticated;

create table private.chat_push_jobs (
 id uuid primary key default gen_random_uuid(),
 message_id uuid not null references public.chat_messages(id) on delete cascade,
 installation_id uuid not null references private.chat_push_devices(installation_id) on delete cascade,
 recipient_id uuid not null references public.profiles(id) on delete cascade,
 -- Snapshot the destination so sign-out, account switches and token rotation invalidate old jobs.
 expo_token text not null,
 state text not null default 'pending' check (state in ('pending','sending','ticket','done','failed','skipped')),
 attempts integer not null default 0,
 available_at timestamptz not null default now(),
 ticket_id text,
 error_code text,
 created_at timestamptz not null default now(),
 unique(message_id,installation_id)
);
create index chat_push_jobs_work on private.chat_push_jobs(state,available_at);
alter table private.chat_push_jobs enable row level security;
revoke all on private.chat_push_jobs from public,anon,authenticated;

create function private.register_chat_push_device(p_installation_id uuid,p_token text,p_platform text,p_actor uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or auth.uid()<>p_actor or not exists(select 1 from public.profiles where id=p_actor and onboarding_completed_at is not null) then
  raise exception 'Authentication required' using errcode='42501';
 end if;
 if p_installation_id is null or p_token is null or length(p_token)>300 or p_token !~ '^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$' or p_platform is null or p_platform not in ('ios','android') then
  raise exception 'Invalid device' using errcode='22023';
 end if;
 -- Serialize per-account registration and cap installations. A UUID stored in SecureStore identifies the installation.
 perform pg_advisory_xact_lock(hashtextextended(p_actor::text,417));
 if not exists(select 1 from private.chat_push_devices where installation_id=p_installation_id)
  and (select count(*) from private.chat_push_devices where profile_id=p_actor)>=20 then
  raise exception 'Device limit reached' using errcode='22023';
 end if;
 insert into private.chat_push_devices(installation_id,profile_id,expo_token,platform)
 values(p_installation_id,p_actor,p_token,p_platform)
 on conflict(installation_id) do update set profile_id=excluded.profile_id,expo_token=excluded.expo_token,platform=excluded.platform,enabled=true,updated_at=now();
end $$;
create function public.register_chat_push_device(p_installation_id uuid,p_token text,p_platform text,p_actor uuid)
returns void language sql security invoker set search_path='' as $$select private.register_chat_push_device(p_installation_id,p_token,p_platform,p_actor)$$;
revoke all on function private.register_chat_push_device(uuid,text,text,uuid),public.register_chat_push_device(uuid,text,text,uuid) from public,anon;
grant execute on function private.register_chat_push_device(uuid,text,text,uuid),public.register_chat_push_device(uuid,text,text,uuid) to authenticated;

create function private.unregister_chat_push_device(p_installation_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
 update private.chat_push_devices set enabled=false,updated_at=now() where installation_id=p_installation_id and profile_id=auth.uid();
end $$;
create function public.unregister_chat_push_device(p_installation_id uuid)
returns void language sql security invoker set search_path='' as $$select private.unregister_chat_push_device(p_installation_id)$$;
revoke all on function private.unregister_chat_push_device(uuid),public.unregister_chat_push_device(uuid) from public,anon;
grant execute on function private.unregister_chat_push_device(uuid),public.unregister_chat_push_device(uuid) to authenticated;

create function private.enqueue_chat_push() returns trigger
language plpgsql security definer set search_path='' as $$
declare recipient uuid;
begin
 select case when organizer_id=new.sender_id then player_id else organizer_id end into recipient
 from public.chat_conversations where id=new.conversation_id;
 insert into private.chat_push_jobs(message_id,installation_id,recipient_id,expo_token)
 select new.id,installation_id,recipient,expo_token from private.chat_push_devices
 where profile_id=recipient and enabled and updated_at>now()-interval '60 days';
 return new;
end $$;
revoke all on function private.enqueue_chat_push() from public,anon,authenticated;
create trigger chat_push_enqueue after insert on public.chat_messages for each row execute function private.enqueue_chat_push();

-- Worker APIs are service-role only. Expired leases permit recovery after interrupted workers.
create function public.claim_chat_push_jobs() returns jsonb
language sql security invoker set search_path='' as $$
 with stale as (
  update private.chat_push_jobs j set state='skipped'
  where j.state in ('pending','sending') and (j.created_at<now()-interval '24 hours' or not exists(
   select 1 from private.chat_push_devices d join public.chat_messages m on m.id=j.message_id
   left join public.chat_reads r on r.conversation_id=m.conversation_id and r.profile_id=j.recipient_id
   left join public.chat_preferences p on p.conversation_id=m.conversation_id and p.profile_id=j.recipient_id
   where d.installation_id=j.installation_id and d.profile_id=j.recipient_id and d.enabled and d.expo_token=j.expo_token
    and d.updated_at>now()-interval '60 days' and m.deleted_at is null
    and m.sequence>greatest(coalesce(r.through_sequence,0),coalesce(p.cleared_through_sequence,0))
  )) returning id
 ), candidates as (
  select id from private.chat_push_jobs where state in ('pending','sending') and available_at<=now() and attempts<5
   and id not in(select id from stale) order by created_at for update skip locked limit 100
 ), claimed as (
  update private.chat_push_jobs j set state='sending',attempts=attempts+1,available_at=now()+interval '2 minutes'
  where id in(select id from candidates) returning j.*
 ) select coalesce(jsonb_agg(jsonb_build_object('id',j.id,'attempt',j.attempts,'token',j.expo_token,'conversation_id',m.conversation_id,'message_id',m.id,'recipient_id',j.recipient_id)),'[]'::jsonb)
 from claimed j join public.chat_messages m on m.id=j.message_id
$$;
create function public.finish_chat_push_job(p_id uuid,p_attempt integer,p_ticket text default null,p_error text default null,p_retry boolean default false)
returns void language plpgsql security invoker set search_path='' as $$
begin
 update private.chat_push_jobs set state=case when p_ticket is not null then 'ticket' when p_retry and attempts<5 then 'pending' else 'failed' end,
 ticket_id=p_ticket,error_code=left(p_error,80),available_at=now()+case when p_ticket is not null then interval '15 minutes' else interval '1 minute'*power(2,attempts)::integer end
 where id=p_id and state='sending' and attempts=p_attempt;
 if not found then return;end if;
 if p_error='DeviceNotRegistered' then
  update private.chat_push_devices d set enabled=false where exists(select 1 from private.chat_push_jobs j where j.id=p_id and j.installation_id=d.installation_id and j.expo_token=d.expo_token and j.recipient_id=d.profile_id);
 end if;
end $$;
create function public.claim_chat_push_receipts() returns jsonb
language sql security invoker set search_path='' as $$
 with candidates as (select id from private.chat_push_jobs where state='ticket' and available_at<=now() order by available_at for update skip locked limit 100),
 claimed as (update private.chat_push_jobs set available_at=now()+interval '15 minutes' where id in(select id from candidates) returning id,ticket_id)
 select coalesce(jsonb_agg(to_jsonb(claimed)),'[]'::jsonb) from claimed
$$;
create function public.finish_chat_push_receipt(p_id uuid,p_error text default null)
returns void language plpgsql security invoker set search_path='' as $$
begin
 update private.chat_push_jobs set state=case when p_error is null then 'done' else 'failed' end,error_code=left(p_error,80) where id=p_id and state='ticket';
 if p_error='DeviceNotRegistered' then
  update private.chat_push_devices d set enabled=false where exists(select 1 from private.chat_push_jobs j where j.id=p_id and j.installation_id=d.installation_id and j.expo_token=d.expo_token and j.recipient_id=d.profile_id);
 end if;
end $$;
revoke all on function public.claim_chat_push_jobs(),public.finish_chat_push_job(uuid,integer,text,text,boolean),public.claim_chat_push_receipts(),public.finish_chat_push_receipt(uuid,text) from public,anon,authenticated;
grant execute on function public.claim_chat_push_jobs(),public.finish_chat_push_job(uuid,integer,text,text,boolean),public.claim_chat_push_receipts(),public.finish_chat_push_receipt(uuid,text) to service_role;
grant usage on schema private to service_role;
grant select,update,delete on private.chat_push_devices,private.chat_push_jobs to service_role;

create function private.authorize_chat_push_worker(p_secret text) returns boolean
language sql security definer set search_path='' as $$
 select length(p_secret)=64 and exists(select 1 from vault.decrypted_secrets where name='chat_push_worker_secret' and decrypted_secret=p_secret)
$$;
create function public.authorize_chat_push_worker(p_secret text) returns boolean
language sql security invoker set search_path='' as $$select private.authorize_chat_push_worker(p_secret)$$;
revoke all on function private.authorize_chat_push_worker(text),public.authorize_chat_push_worker(text) from public,anon,authenticated;
grant execute on function private.authorize_chat_push_worker(text),public.authorize_chat_push_worker(text) to service_role;
