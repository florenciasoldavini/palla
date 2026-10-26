begin;
insert into auth.users(id) values('97600000-0000-4000-8000-000000000001');
insert into public.profiles(id,first_name) values('97600000-0000-4000-8000-000000000001','Avatar QA');
do $$declare root text:='users/97600000-0000-4000-8000-000000000001/avatar/';begin
 for n in 1..5 loop insert into storage.objects(bucket_id,name) values('user-avatars',root||n||'.jpg');end loop;
 begin insert into storage.objects(bucket_id,name) values('user-avatars',root||'6.jpg');raise exception 'Quota bypassed';exception when program_limit_exceeded then null;end;
 delete from storage.objects where bucket_id='user-avatars' and name=root||'1.jpg';
 insert into storage.objects(bucket_id,name) values('user-avatars',root||'6.jpg');
 assert (select object_count from private.avatar_upload_usage where profile_id='97600000-0000-4000-8000-000000000001')=5;
 delete from storage.objects where bucket_id='user-avatars' and name like root||'%';
 for n in 7..20 loop
  insert into storage.objects(bucket_id,name) values('user-avatars',root||n||'.jpg');
  delete from storage.objects where bucket_id='user-avatars' and name=root||n||'.jpg';
 end loop;
 begin insert into storage.objects(bucket_id,name) values('user-avatars',root||'21.jpg');raise exception 'Delete reset daily quota';exception when program_limit_exceeded then null;end;
 update private.avatar_upload_usage set day_start=now()-interval '2 days';
 insert into storage.objects(bucket_id,name) values('user-avatars',root||'21.jpg');
 begin update storage.objects set name=root||'moved.jpg' where bucket_id='user-avatars' and name=root||'21.jpg';raise exception 'Move accepted';exception when insufficient_privilege then null;end;
end$$;
rollback;
