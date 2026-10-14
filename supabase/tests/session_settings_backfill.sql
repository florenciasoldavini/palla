-- Isolated database only. Transactional schema reconstruction verifies backfill preservation.
begin;
-- Restore the pre-normalization template shape so this historical migration test
-- remains runnable against the latest isolated database. All DDL rolls back.
alter table public.session_series disable trigger guard_series_change;
alter table public.session_series drop constraint series_published_template, drop constraint series_date_bounds, drop constraint series_weekday, drop constraint series_one_off, drop constraint session_series_status_check;
alter table public.session_series drop column venue_id, drop column title, drop column description, drop column court_label, drop column capacity, drop column recurrence, drop column timezone, drop column weekday, drop column local_start_time, drop column duration_minutes, drop column starts_on, drop column ends_on, drop column participant_gender_policy;
alter table public.sessions drop column participant_gender_policy;
update public.session_series set status='published' where status='active';
alter table public.session_series add constraint session_series_status_check check (status in ('draft','published'));
alter table public.sessions drop column visibility, drop column allowed_categories, drop column waitlist_enabled, drop column waitlist_promotion_mode, drop column waitlist_capacity, drop column registration_opens_at, alter column registration_closes_at set not null, alter column cancellation_deadline_at set not null;
alter table public.session_series drop column visibility, drop column allowed_categories, drop column waitlist_enabled, drop column waitlist_promotion_mode, drop column waitlist_capacity, drop column registration_opens_minutes_before, drop column registration_closes_minutes_before, drop column cancellation_notice_minutes;
alter table public.sessions enable trigger guard_session_change;
alter table public.session_series enable trigger guard_series_change;
drop function public.valid_session_categories(smallint[]);

alter table public.sessions add column category_min smallint, add column category_max smallint;
insert into auth.users(id) values ('00000000-0000-4000-8000-000000000f21');
insert into public.profiles(id,first_name) values ('00000000-0000-4000-8000-000000000f21','Backfill QA');
insert into public.organizers(profile_id,display_name) values ('00000000-0000-4000-8000-000000000f21','Backfill QA');
insert into public.venues(id,created_by,name,address) values ('00000000-0000-4000-8000-000000000f22','00000000-0000-4000-8000-000000000f21','QA club','QA address');
insert into public.session_series(id,organizer_id,status,draft_input,updated_at) values ('00000000-0000-4000-8000-000000000f23','00000000-0000-4000-8000-000000000f21','published','{"categoryMode":"range","categoryMin":"5","categoryMax":"7","registrationHours":"2","cancellationHours":"24"}','2026-01-01T00:00:00Z');
insert into public.sessions(id,organizer_id,series_id,occurrence_date,venue_id,title,capacity,category_min,category_max,price_minor,starts_at,ends_at,registration_closes_at,cancellation_deadline_at,status,cancelled_at,updated_at) values ('00000000-0000-4000-8000-000000000f24','00000000-0000-4000-8000-000000000f21','00000000-0000-4000-8000-000000000f23','2026-01-01','00000000-0000-4000-8000-000000000f22','Backfill QA',4,5,7,12300,'2026-01-01T19:00:00-03:00','2026-01-01T20:30:00-03:00','2026-01-01T17:00:00-03:00','2025-12-31T19:00:00-03:00','cancelled','2025-12-30T00:00:00Z','2026-01-01T00:00:00Z');
\ir ../migrations/20261014151114_session_creation_settings.sql
do $$ begin
 assert (select allowed_categories=array[5,6,7]::smallint[] and visibility='private' and status='cancelled' and price_minor=12300 and updated_at='2026-01-01T00:00:00Z' and registration_closes_at='2026-01-01T17:00:00-03:00' from public.sessions where id='00000000-0000-4000-8000-000000000f24'), 'Existing cancelled row changed';
 assert (select allowed_categories=array[5,6,7]::smallint[] and registration_closes_minutes_before=120 and cancellation_notice_minutes=1440 and updated_at='2026-01-01T00:00:00Z' from public.session_series where id='00000000-0000-4000-8000-000000000f23'), 'Existing series defaults changed';
end $$;
rollback;
