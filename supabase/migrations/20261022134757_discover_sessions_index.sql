-- Discovery scans upcoming public occurrences in chronological order.
create index if not exists sessions_public_discovery_start_idx
  on public.sessions(starts_at,id)
  where status='published' and visibility='public';
