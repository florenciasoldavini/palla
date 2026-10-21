-- Vault holds the scheduler credential; it never enters client config or migration output.
create extension if not exists pg_cron;
create extension if not exists pg_net;
do $$begin
 if not exists(select 1 from vault.secrets where name='chat_push_worker_secret') then
  perform vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),'chat_push_worker_secret');
 end if;
end $$;
create function private.wake_chat_push_worker() returns void
language plpgsql security definer set search_path='' as $$
declare endpoint text; secret text;
begin
 -- Provision chat_push_function_url at deployment; no project-specific URL in portable migrations.
 select decrypted_secret into endpoint from vault.decrypted_secrets where name='chat_push_function_url';
 select decrypted_secret into secret from vault.decrypted_secrets where name='chat_push_worker_secret';
 if endpoint is null or secret is null then return;end if;
 if not exists(select 1 from private.chat_push_jobs where state in ('pending','sending','ticket') and available_at<=now()) then return;end if;
 perform net.http_post(url:=endpoint,headers:=jsonb_build_object('Content-Type','application/json','x-chat-push-secret',secret),body:='{}'::jsonb,timeout_milliseconds:=10000);
end $$;
revoke all on function private.wake_chat_push_worker() from public,anon,authenticated;
create function private.chat_push_wake_trigger() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 begin perform private.wake_chat_push_worker();exception when others then null;end;
 return null;
end $$;
revoke all on function private.chat_push_wake_trigger() from public,anon,authenticated;
create trigger chat_push_wake after insert on private.chat_push_jobs for each statement execute function private.chat_push_wake_trigger();
select cron.schedule('palla-chat-push-delivery','* * * * *',$$select private.wake_chat_push_worker()$$);
select cron.schedule('palla-chat-push-cleanup','17 3 * * *',$$
 update private.chat_push_jobs set state='failed',error_code='Expired' where
  (state in ('pending','sending') and (created_at<now()-interval '24 hours' or (attempts>=5 and available_at<now())))
  or (state='ticket' and created_at<now()-interval '24 hours');
 delete from private.chat_push_jobs where created_at<now()-interval '7 days';
 update private.chat_push_devices set enabled=false where updated_at<now()-interval '60 days';
$$);
