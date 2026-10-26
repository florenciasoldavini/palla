-- Count objects transactionally; client-side cleanup alone is not an abuse limit.
create table private.avatar_upload_usage (
 profile_id uuid primary key references public.profiles(id) on delete cascade,
 object_count integer not null default 0 check(object_count>=0),
 day_start timestamptz not null default clock_timestamp(),
 day_count integer not null default 0
);
alter table private.avatar_upload_usage enable row level security;
revoke all on private.avatar_upload_usage from public,anon,authenticated;
insert into private.avatar_upload_usage(profile_id,object_count)
select p.id,count(*) from public.profiles p join storage.objects o
 on o.bucket_id='user-avatars' and split_part(o.name,'/',2)=p.id::text group by p.id;

create function private.enforce_avatar_upload_quota() returns trigger
language plpgsql security definer set search_path='' as $$
declare actor uuid; charged uuid; instant timestamptz:=clock_timestamp();
begin
 if tg_op='UPDATE' then
  if (old.bucket_id='user-avatars' or new.bucket_id='user-avatars')
   and (old.bucket_id,old.name) is distinct from (new.bucket_id,new.name)
  then raise exception 'Upload a new profile photo instead of moving it' using errcode='42501'; end if;
  return new;
 end if;
 if tg_op='DELETE' then
  if old.bucket_id='user-avatars' then
   update private.avatar_upload_usage set object_count=greatest(0,object_count-1)
    where profile_id::text=split_part(old.name,'/',2);
  end if;
  return old;
 end if;
 if new.bucket_id<>'user-avatars' then return new; end if;
 if new.name !~ '^users/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/avatar/[^/]+$'
 then raise exception 'Invalid profile photo path' using errcode='42501'; end if;
 actor:=split_part(new.name,'/',2)::uuid;
 insert into private.avatar_upload_usage(profile_id,object_count,day_start,day_count) values(actor,1,instant,1)
 on conflict(profile_id) do update set object_count=avatar_upload_usage.object_count+1,
  day_start=case when avatar_upload_usage.day_start<=instant-interval '1 day' then instant else avatar_upload_usage.day_start end,
  day_count=case when avatar_upload_usage.day_start<=instant-interval '1 day' then 1 else avatar_upload_usage.day_count+1 end
 where avatar_upload_usage.object_count<5 and (avatar_upload_usage.day_start<=instant-interval '1 day' or avatar_upload_usage.day_count<20)
 returning profile_id into charged;
 if charged is null then raise exception 'Profile photo limit reached. Remove unused photos or try again tomorrow.' using errcode='54000'; end if;
 return new;
end $$;
revoke all on function private.enforce_avatar_upload_quota() from public,anon,authenticated;
create trigger enforce_avatar_upload_quota before insert or update of bucket_id,name on storage.objects
 for each row execute function private.enforce_avatar_upload_quota();
create trigger release_avatar_upload_quota after delete on storage.objects
 for each row execute function private.enforce_avatar_upload_quota();
