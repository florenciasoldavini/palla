-- Personal player bio; independent from the organizer hosting description.
-- Existing profile ownership RLS remains authoritative.
alter table public.profiles
  add column bio text constraint profiles_bio_length check (bio is null or char_length(bio) <= 500);

grant update (bio) on public.profiles to authenticated;
