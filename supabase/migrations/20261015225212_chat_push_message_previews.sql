-- Read sender/message content at claim time; do not duplicate private text in queue storage.
create or replace function public.claim_chat_push_jobs() returns jsonb
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
 ) select coalesce(jsonb_agg(jsonb_build_object('id',j.id,'attempt',j.attempts,'token',j.expo_token,'conversation_id',m.conversation_id,'message_id',m.id,'recipient_id',j.recipient_id,'sender_name',nullif(btrim(concat_ws(' ',sender.first_name,sender.last_name)),''),'message_preview',m.body)),'[]'::jsonb)
 from claimed j join public.chat_messages m on m.id=j.message_id
 join public.profiles sender on sender.id=m.sender_id
$$;
revoke all on function public.claim_chat_push_jobs() from public,anon,authenticated;
grant execute on function public.claim_chat_push_jobs() to service_role;
