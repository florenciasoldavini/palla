-- Argentine categories are self-reported and distinct from legacy decimal ratings.
-- Retain playing_level without conversion to avoid reinterpreting old data.
alter table public.profiles
  add column playing_category smallint,
  add column category_status text not null default 'unknown',
  add constraint profiles_playing_category_check check (
    (category_status = 'known' and playing_category is not null and playing_category between 1 and 8)
    or (category_status in ('beginner', 'unknown', 'not_playing') and playing_category is null)
  );
grant update (playing_category, category_status) on public.profiles to authenticated;
comment on column public.profiles.playing_category is 'Self-reported Argentine category: 1 strongest, 8 entry category; not a federation ranking.';
comment on column public.profiles.playing_level is 'Legacy provisional decimal rating; not used for Argentine categories.';
-- Remove the old signature so PostgREST has one unambiguous RPC.
-- Default arguments keep older three-argument callers compatible.
drop function public.complete_onboarding(text,text,text);
create function public.complete_onboarding(p_first_name text, p_last_name text, p_mode text, p_category_status text default null, p_playing_category integer default null)
returns public.profiles language plpgsql security invoker set search_path = '' as $$
declare result public.profiles;
begin
  if auth.uid() is null then raise exception 'Sign in to complete your profile'; end if;
  if p_mode not in ('player', 'organizer') or p_mode is null then raise exception 'Choose player or organizer'; end if;
  if p_mode = 'organizer' and exists (select 1 from public.organizers where profile_id = auth.uid() and status = 'suspended') then
    raise exception 'Organizer access is suspended. Choose player or contact support.';
  end if;
  if p_category_status is not null and (p_category_status not in ('known', 'beginner', 'unknown', 'not_playing')
    or (p_category_status = 'known' and (p_playing_category is null or p_playing_category not between 1 and 8))
    or (p_category_status <> 'known' and p_playing_category is not null)
    or (p_mode = 'player' and p_category_status = 'not_playing')) then
    raise exception 'Choose a valid playing category';
  end if;
  update public.profiles set
    category_status = coalesce(p_category_status, category_status),
    playing_category = case when p_category_status is null then playing_category else p_playing_category end,
    first_name = nullif(btrim(p_first_name), ''), last_name = nullif(btrim(p_last_name), ''), preferred_mode = p_mode, onboarding_completed_at = now()
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
revoke all on function public.complete_onboarding(text,text,text,text,integer) from public, anon;
grant execute on function public.complete_onboarding(text,text,text,text,integer) to authenticated;
