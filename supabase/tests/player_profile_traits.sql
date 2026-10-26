-- Synthetic accounts only; all writes rolled back.
begin;
insert into auth.users(id) values ('95700000-0000-4000-8000-000000000001'), ('95700000-0000-4000-8000-000000000002');
insert into public.profiles(id,first_name) values ('95700000-0000-4000-8000-000000000001','Traits QA'), ('95700000-0000-4000-8000-000000000002','Other QA');
set local role authenticated;
select set_config('request.jwt.claim.sub','95700000-0000-4000-8000-000000000001',true);
do $$ begin
 assert (select dominant_hand is null and preferred_court_side is null from public.profiles where id=auth.uid());
 update public.profiles set dominant_hand='right',preferred_court_side='left' where id=auth.uid();
 assert (select dominant_hand='right' and preferred_court_side='left' from public.profiles where id=auth.uid());
 update public.profiles set dominant_hand='left',preferred_court_side='flexible' where id=auth.uid();
 assert (select dominant_hand='left' and preferred_court_side='flexible' from public.profiles where id=auth.uid());
 begin
  update public.profiles set dominant_hand='both' where id=auth.uid();
  raise exception 'Invalid dominant hand accepted';
 exception when check_violation then null; end;
 begin
  update public.profiles set preferred_court_side='invalid' where id=auth.uid();
  raise exception 'Invalid court side accepted';
 exception when check_violation then null; end;
 update public.profiles set dominant_hand='left' where id='95700000-0000-4000-8000-000000000002';
 assert not found, 'Other profile must not be editable';
 assert (select count(*) from public.profiles)=1, 'Only own profile is visible';
 update public.profiles set dominant_hand=null,preferred_court_side=null where id=auth.uid();
end $$;
reset role;
rollback;
