-- Run against a development database. All fixtures are rolled back.
begin;
insert into auth.users (id) values ('00000000-0000-4000-a000-000000000001'), ('00000000-0000-4000-a000-000000000002');
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-a000-000000000001', true);
insert into public.profiles (id) values ('00000000-0000-4000-a000-000000000001');
select public.complete_onboarding('Flor', null, 'player');
do $$ begin
  if (select preferred_mode from public.profiles) <> 'player' then raise exception 'Player setup failed'; end if;
  if exists (select 1 from public.organizers) then raise exception 'Player unexpectedly became organizer'; end if;
end $$;
select public.complete_onboarding('Flor', 'Example', 'organizer');
select public.complete_onboarding('Flor', 'Example', 'organizer');
do $$ begin
  if (select count(*) from public.organizers) <> 1 then raise exception 'Organizer setup is not idempotent'; end if;
  if (select status from public.organizers) <> 'active' then raise exception 'Organizer is not immediately active'; end if;
  begin
    update public.organizers set status = 'suspended';
    raise exception 'Client can edit organizer status';
  exception when insufficient_privilege then null; end;
  begin
    update public.profiles set welcome_email_sent_at = now();
    raise exception 'Client can edit email delivery state';
  exception when insufficient_privilege then null; end;
  begin
    perform public.complete_onboarding('', null, 'player');
    raise exception 'Empty name was accepted';
  exception when check_violation then null; end;
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-a000-000000000002', true);
insert into public.profiles (id) values ('00000000-0000-4000-a000-000000000002');
do $$ begin
  if (select count(*) from public.profiles) <> 1 then raise exception 'Other user profile leaked'; end if;
  if exists (select 1 from public.organizers) then raise exception 'Other organizer leaked'; end if;
  update public.profiles set first_name = 'Intruder' where id = '00000000-0000-4000-a000-000000000001';
  if found then raise exception 'Other profile was updated'; end if;
  begin
    insert into public.organizers (profile_id, display_name) values ('00000000-0000-4000-a000-000000000002', 'Incomplete');
    raise exception 'Incomplete user can become organizer';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
update public.organizers set status = 'suspended' where profile_id = '00000000-0000-4000-a000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-a000-000000000001', true);
do $$ begin
  begin
    perform public.complete_onboarding('Flor', null, 'organizer');
    raise exception 'Suspension bypassed';
  exception when raise_exception then
    if sqlerrm not like 'Organizer access is suspended%' then raise; end if;
  end;
end $$;
select public.complete_onboarding('Flor', null, 'player');
reset role;
set local role anon;
do $$ begin
  begin
    perform 1 from public.profiles;
    raise exception 'Anonymous profile access allowed';
  exception when insufficient_privilege then null; end;
  begin
    perform public.complete_onboarding('Visitor', null, 'player');
    raise exception 'Anonymous onboarding allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
select 'All onboarding authorization checks passed; fixtures rolled back.' as result;
