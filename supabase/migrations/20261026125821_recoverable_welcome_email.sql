-- A claim is a short lease, never evidence that an email was delivered.
create table private.welcome_email_jobs (
 profile_id uuid primary key references public.profiles(id) on delete cascade,
 name text not null,
 lease_token uuid,
 lease_until timestamptz,
 created_at timestamptz not null default now()
);
alter table private.welcome_email_jobs enable row level security;
revoke all on private.welcome_email_jobs from public,anon,authenticated;

create function private.claim_welcome_email(p_actor uuid,p_name text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare p public.profiles; job private.welcome_email_jobs; token uuid:=gen_random_uuid();
begin
 if p_actor is null or p_name is null or length(btrim(p_name)) not between 1 and 80 then raise exception 'Invalid welcome request';end if;
 select * into p from public.profiles where id=p_actor for update;
 if p.id is null then raise exception 'Profile not found';end if;
 if p.welcome_email_sent_at is not null then return jsonb_build_object('state','sent','sent_at',p.welcome_email_sent_at);end if;
 insert into private.welcome_email_jobs(profile_id,name) values(p_actor,coalesce(nullif(p.first_name,''),btrim(p_name))) on conflict do nothing;
 select * into job from private.welcome_email_jobs where profile_id=p_actor for update;
 if job.lease_until>clock_timestamp() then return jsonb_build_object('state','busy');end if;
 update private.welcome_email_jobs set lease_token=token,lease_until=clock_timestamp()+interval '2 minutes' where profile_id=p_actor;
 return jsonb_build_object('state','claimed','token',token,'name',job.name);
end$$;
create function private.finish_welcome_email(p_actor uuid,p_token uuid) returns timestamptz
language plpgsql security definer set search_path='' as $$
declare sent timestamptz;
begin
 perform 1 from public.profiles where id=p_actor for update;
 if not exists(select 1 from private.welcome_email_jobs where profile_id=p_actor and lease_token=p_token and p_token is not null)
 then raise exception 'Welcome claim expired';end if;
 update public.profiles set welcome_email_sent_at=coalesce(welcome_email_sent_at,clock_timestamp()) where id=p_actor returning welcome_email_sent_at into sent;
 delete from private.welcome_email_jobs where profile_id=p_actor;
 return sent;
end$$;
create function private.release_welcome_email(p_actor uuid,p_token uuid) returns void
language sql security definer set search_path='' as $$
 update private.welcome_email_jobs set lease_token=null,lease_until=null where profile_id=p_actor and lease_token=p_token
$$;
create function public.claim_welcome_email(p_actor uuid,p_name text) returns jsonb language sql security invoker set search_path='' as $$select private.claim_welcome_email(p_actor,p_name)$$;
create function public.finish_welcome_email(p_actor uuid,p_token uuid) returns timestamptz language sql security invoker set search_path='' as $$select private.finish_welcome_email(p_actor,p_token)$$;
create function public.release_welcome_email(p_actor uuid,p_token uuid) returns void language sql security invoker set search_path='' as $$select private.release_welcome_email(p_actor,p_token)$$;
revoke all on function private.claim_welcome_email(uuid,text),private.finish_welcome_email(uuid,uuid),private.release_welcome_email(uuid,uuid),public.claim_welcome_email(uuid,text),public.finish_welcome_email(uuid,uuid),public.release_welcome_email(uuid,uuid) from public,anon,authenticated;
grant execute on function private.claim_welcome_email(uuid,text),private.finish_welcome_email(uuid,uuid),private.release_welcome_email(uuid,uuid),public.claim_welcome_email(uuid,text),public.finish_welcome_email(uuid,uuid),public.release_welcome_email(uuid,uuid) to service_role;
