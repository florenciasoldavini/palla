-- Profiles own identity and a starting-mode preference; organizers own capability.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text check (first_name is null or length(btrim(first_name)) between 1 and 80),
  last_name text check (last_name is null or length(btrim(last_name)) between 1 and 80),
  avatar_url text,
  phone_number text check (phone_number is null or length(phone_number) <= 40),
  playing_level numeric(2,1) check (playing_level between 1 and 7 and mod(playing_level, 0.5) = 0),
  preferred_mode text not null default 'player' check (preferred_mode in ('player', 'organizer')),
  onboarding_completed_at timestamptz,
  welcome_email_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (onboarding_completed_at is null or first_name is not null)
);

create table public.organizers (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  display_name text not null check (length(btrim(display_name)) between 1 and 100),
  bio text check (bio is null or length(bio) <= 1000),
  status text not null default 'active' check (status in ('active', 'suspended')),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.organizers enable row level security;
revoke all on public.profiles, public.organizers from anon, authenticated;
grant select on public.profiles, public.organizers to authenticated;
grant insert (id, first_name, last_name, avatar_url, phone_number) on public.profiles to authenticated;
grant update (first_name, last_name, avatar_url, phone_number, playing_level, preferred_mode, onboarding_completed_at) on public.profiles to authenticated;
grant insert (profile_id, display_name, bio) on public.organizers to authenticated;
grant update (display_name, bio) on public.organizers to authenticated;
grant all on public.profiles, public.organizers to service_role;

create policy profiles_read_own on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy profiles_insert_own on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy organizers_read_own on public.organizers for select to authenticated using ((select auth.uid()) = profile_id);
create policy organizers_insert_own on public.organizers for insert to authenticated with check (
  (select auth.uid()) = profile_id and status = 'active' and approved_at is null
  and exists (select 1 from public.profiles p where p.id = profile_id and p.onboarding_completed_at is not null)
);
create policy organizers_update_own on public.organizers for update to authenticated using ((select auth.uid()) = profile_id and status = 'active') with check ((select auth.uid()) = profile_id and status = 'active');

create schema if not exists private;
create function private.stamp_profile_update() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at := now();
  if old.onboarding_completed_at is not null then
    new.onboarding_completed_at := old.onboarding_completed_at;
  elsif new.onboarding_completed_at is not null then
    new.onboarding_completed_at := now();
  end if;
  return new;
end;
$$;
revoke all on function private.stamp_profile_update() from public;
create trigger stamp_profile_update before update on public.profiles for each row execute function private.stamp_profile_update();

-- Invoker privileges plus RLS keep this transaction scoped to the caller.
create function public.complete_onboarding(p_first_name text, p_last_name text, p_mode text)
returns public.profiles language plpgsql security invoker set search_path = '' as $$
declare result public.profiles;
begin
  if auth.uid() is null then raise exception 'Sign in to complete your profile'; end if;
  if p_mode not in ('player', 'organizer') or p_mode is null then raise exception 'Choose player or organizer'; end if;
  if p_mode = 'organizer' and exists (select 1 from public.organizers where profile_id = auth.uid() and status = 'suspended') then
    raise exception 'Organizer access is suspended. Choose player or contact support.';
  end if;
  update public.profiles set first_name = nullif(btrim(p_first_name), ''), last_name = nullif(btrim(p_last_name), ''), preferred_mode = p_mode, onboarding_completed_at = now()
  where id = auth.uid() returning * into result;
  if result.id is null then raise exception 'Profile not found. Reload and try again.'; end if;
  if p_mode = 'organizer' then
    insert into public.organizers (profile_id, display_name)
    values (auth.uid(), concat_ws(' ', result.first_name, result.last_name))
    on conflict (profile_id) do nothing;
  end if;
  return result;
end;
$$;
revoke all on function public.complete_onboarding(text,text,text) from public, anon;
grant execute on function public.complete_onboarding(text,text,text) to authenticated;
