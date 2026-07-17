drop policy if exists "user_avatars_select_authenticated"
on storage.objects;

drop policy if exists "user_avatars_select_own"
on storage.objects;

create policy "user_avatars_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'user-avatars'
  and (storage.foldername(name))[1] = 'users'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and (storage.foldername(name))[3] = 'avatar'
);
