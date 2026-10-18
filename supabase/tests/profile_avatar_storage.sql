-- Synthetic metadata only, rolled back. No real Storage files or accounts are modified.
begin;
insert into auth.users(id) values ('95600000-0000-4000-8000-000000000001'), ('95600000-0000-4000-8000-000000000002');
insert into public.profiles(id,first_name,avatar_url) values
('95600000-0000-4000-8000-000000000001','Avatar QA','https://test.invalid/storage/v1/object/public/user-avatars/users/95600000-0000-4000-8000-000000000001/avatar/active.jpg'),
('95600000-0000-4000-8000-000000000002','Other QA',null);
insert into storage.objects(bucket_id,name) values ('user-avatars','users/95600000-0000-4000-8000-000000000002/avatar/other.jpg');
set local role authenticated;
select set_config('request.jwt.claim.sub','95600000-0000-4000-8000-000000000001',true);
do $$ begin
 insert into storage.objects(bucket_id,name) values ('user-avatars','users/95600000-0000-4000-8000-000000000001/avatar/active.jpg');
 insert into storage.objects(bucket_id,name) values ('user-avatars','users/95600000-0000-4000-8000-000000000001/avatar/old.jpg');
 begin
  insert into storage.objects(bucket_id,name) values ('user-avatars','users/95600000-0000-4000-8000-000000000002/avatar/intruder.jpg');
  raise exception 'Cross-owner upload allowed';
 exception when insufficient_privilege then null; end;
 assert (select count(*) from storage.objects where bucket_id='user-avatars')=2, 'Other metadata must stay private';
end $$;
-- Storage protects SQL deletion; enable only inside this rollback-only policy test.
select set_config('storage.allow_delete_query','true',true);
do $$ begin
 delete from storage.objects where bucket_id='user-avatars' and name like '%/active.jpg';
 assert not found, 'Current avatar must remain protected';
 delete from storage.objects where bucket_id='user-avatars' and name like '%/other.jpg';
 assert not found, 'Other avatar must remain protected';
 delete from storage.objects where bucket_id='user-avatars' and name like '%/old.jpg';
 assert found, 'Unused own avatar should be removable';
 update public.profiles set avatar_url=null where id=auth.uid();
 delete from storage.objects where bucket_id='user-avatars' and name like '%/active.jpg';
 assert found, 'Removed avatar should be eligible for cleanup';
end $$;
reset role;
rollback;
