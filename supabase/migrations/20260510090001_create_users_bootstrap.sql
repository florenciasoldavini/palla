create extension if not exists pgcrypto with schema extensions;

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where t.typname = 'user_role'
      and n.nspname = 'public'
  ) then
    create type public.user_role as enum ('admin', 'user');
  end if;
end
$$;

create table if not exists public.users (
  id uuid primary key,
  first_name text not null,
  last_name text,
  avatar text,
  email text not null unique,
  phone_number text,
  role public.user_role not null default 'user',
  created_at timestamp(3) not null default current_timestamp,
  updated_at timestamp(3),
  deleted_at timestamp(3)
);
create index if not exists users_email_idx on public.users(email);
