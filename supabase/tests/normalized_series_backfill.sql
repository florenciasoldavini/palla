-- Isolated database only: reconstruct the prior series schema inside a rollback transaction.
begin;
alter table public.session_series disable trigger guard_series_change;
alter table public.session_series drop constraint series_published_template, drop constraint series_date_bounds, drop constraint series_weekday, drop constraint series_one_off, drop constraint session_series_status_check;
alter table public.session_series drop column venue_id, drop column title, drop column description, drop column court_label, drop column capacity, drop column recurrence, drop column timezone, drop column weekday, drop column local_start_time, drop column duration_minutes, drop column starts_on, drop column ends_on, drop column participant_gender_policy;
alter table public.sessions drop column participant_gender_policy;
update public.session_series set status='published' where status='active';
alter table public.session_series add constraint session_series_status_check check (status in ('draft','published'));
insert into auth.users(id) values ('00000000-0000-4000-8000-000000000e21');
insert into public.profiles(id,first_name) values ('00000000-0000-4000-8000-000000000e21','Backfill QA');
insert into public.organizers(profile_id,display_name) values ('00000000-0000-4000-8000-000000000e21','Backfill QA');
insert into public.venues(id,created_by,name,address) values ('00000000-0000-4000-8000-000000000e22','00000000-0000-4000-8000-000000000e21','QA club','QA address');
insert into public.session_series(id,organizer_id,status,draft_input,updated_at) values ('00000000-0000-4000-8000-000000000e23','00000000-0000-4000-8000-000000000e21','published','{"title":"Original template","description":"","courtLabel":"Court 1","capacity":"4","repeat":"weekly","date":"2026-01-03","lastDate":"2026-01-17","startTime":"19:00","endTime":"20:30"}','2026-01-01T00:00:00Z');
insert into public.sessions(id,organizer_id,series_id,occurrence_date,venue_id,title,capacity,price_minor,starts_at,ends_at,status,cancelled_at,updated_at) values ('00000000-0000-4000-8000-000000000e24','00000000-0000-4000-8000-000000000e21','00000000-0000-4000-8000-000000000e23','2026-01-03','00000000-0000-4000-8000-000000000e22','Individual exception',8,12300,'2026-01-03T19:00:00-03:00','2026-01-03T20:30:00-03:00','cancelled','2025-12-30T00:00:00Z','2026-01-01T00:00:00Z');
\ir ../migrations/20261014154329_normalized_session_series.sql
do $$ begin
 assert (select status='active' and title='Original template' and capacity=4 and weekday=6 and duration_minutes=90 and participant_gender_policy='all' and updated_at='2026-01-01T00:00:00Z' from public.session_series where id='00000000-0000-4000-8000-000000000e23'), 'Template backfill failed or changed version';
 assert (select title='Individual exception' and capacity=8 and price_minor=12300 and status='cancelled' and participant_gender_policy='all' and updated_at='2026-01-01T00:00:00Z' from public.sessions where id='00000000-0000-4000-8000-000000000e24'), 'Occurrence history changed';
end $$;
rollback;
