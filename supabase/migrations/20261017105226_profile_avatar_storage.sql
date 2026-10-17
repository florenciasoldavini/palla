-- Profile photos are public presentation assets. Writes are restricted to their owner.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('user-avatars', 'user-avatars', true, 5242880,
  array['image/jpeg','image/png','image/webp','image/heic','image/heif'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Upload own profile photo" on storage.objects for insert to authenticated
with check (bucket_id = 'user-avatars' and (storage.foldername(name))[1] = 'users'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and (storage.foldername(name))[3] = 'avatar'
  and array_length(storage.foldername(name), 1) = 3);
create policy "Read own avatar metadata" on storage.objects for select to authenticated
using (bucket_id = 'user-avatars' and (storage.foldername(name))[1] = 'users'
  and (storage.foldername(name))[2] = (select auth.uid())::text);
create policy "Delete unused own profile photo" on storage.objects for delete to authenticated
using (bucket_id = 'user-avatars' and (storage.foldername(name))[1] = 'users'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and (storage.foldername(name))[3] = 'avatar'
  and not exists (select 1 from public.profiles p where p.id = (select auth.uid())
    and p.avatar_url like '%/storage/v1/object/public/user-avatars/' || name));
