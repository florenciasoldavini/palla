insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'user-avatars',
  'user-avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "user_avatars_select_authenticated" on storage.objects;
drop policy if exists "user_avatars_insert_own" on storage.objects;
drop policy if exists "user_avatars_update_own" on storage.objects;
drop policy if exists "user_avatars_delete_own" on storage.objects;

create policy "user_avatars_select_authenticated"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'user-avatars'
);

create policy "user_avatars_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'user-avatars'
  and (storage.foldername(name))[1] = 'users'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and (storage.foldername(name))[3] = 'avatar'
);

create policy "user_avatars_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'user-avatars'
  and (storage.foldername(name))[1] = 'users'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and (storage.foldername(name))[3] = 'avatar'
)
with check (
  bucket_id = 'user-avatars'
  and (storage.foldername(name))[1] = 'users'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and (storage.foldername(name))[3] = 'avatar'
);

create policy "user_avatars_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'user-avatars'
  and (storage.foldername(name))[1] = 'users'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and (storage.foldername(name))[3] = 'avatar'
);
