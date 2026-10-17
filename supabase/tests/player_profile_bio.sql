-- Rollback-only fictional accounts: no writes to real profiles.
begin;
insert into auth.users(id) values ('95500000-0000-4000-8000-000000000001'), ('95500000-0000-4000-8000-000000000002');
insert into public.profiles(id,first_name) values ('95500000-0000-4000-8000-000000000001','Player bio QA'), ('95500000-0000-4000-8000-000000000002','Other QA');
insert into public.organizers(profile_id,display_name,bio) values ('95500000-0000-4000-8000-000000000001','Organizer QA','Independent hosting description');
set local role authenticated;
select set_config('request.jwt.claim.sub','95500000-0000-4000-8000-000000000001',true);
do $$ begin
  update public.profiles set bio=repeat('a',500) where id=auth.uid();
  assert (select length(bio) from public.profiles where id=auth.uid())=500;
  assert (select bio from public.organizers where profile_id=auth.uid())='Independent hosting description';
  begin
    update public.profiles set bio=repeat('a',501) where id=auth.uid();
    raise exception 'Oversized bio accepted';
  exception when check_violation then null; end;
  update public.profiles set bio='Unauthorized' where id='95500000-0000-4000-8000-000000000002';
  assert not found, 'Other profile update must be denied';
  assert (select count(*) from public.profiles)=1, 'Only own profile is readable';
  update public.profiles set bio=null where id=auth.uid();
  assert (select bio from public.profiles where id=auth.uid()) is null;
end $$;
reset role;
rollback;
