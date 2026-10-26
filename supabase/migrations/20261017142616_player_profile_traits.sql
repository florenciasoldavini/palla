-- Optional playing identity, separate from organizer hosting details.
alter table public.profiles
  add column dominant_hand text constraint profiles_dominant_hand_check check (dominant_hand in ('right','left')),
  add column preferred_court_side text constraint profiles_court_side_check check (preferred_court_side in ('left','right','flexible'));
grant update (dominant_hand, preferred_court_side) on public.profiles to authenticated;
-- Existing owner-only profile RLS remains authoritative.
