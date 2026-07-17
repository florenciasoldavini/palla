revoke all on all tables in schema public from anon, authenticated;

grant select, insert, update on table public.users to authenticated;

alter table public.users enable row level security;

drop policy if exists "users_select_own_profile" on public.users;
drop policy if exists "users_insert_own_profile" on public.users;
drop policy if exists "users_update_own_profile" on public.users;

create policy "users_select_own_profile"
on public.users
for select
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = id
);

create policy "users_insert_own_profile"
on public.users
for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and (select auth.uid()) = id
  and (select auth.jwt() ->> 'email') is not null
  and lower(email) = lower((select auth.jwt() ->> 'email'))
  and role = 'user'
);

create policy "users_update_own_profile"
on public.users
for update
to authenticated
using (
  (select auth.uid()) is not null
  and (select auth.uid()) = id
)
with check (
  (select auth.uid()) is not null
  and (select auth.uid()) = id
  and (select auth.jwt() ->> 'email') is not null
  and lower(email) = lower((select auth.jwt() ->> 'email'))
  and role = (
    select u.role
    from public.users u
    where u.id = (select auth.uid())
  )
);
