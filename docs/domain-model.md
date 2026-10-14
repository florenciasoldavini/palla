# Palla domain and database plan

The Zod schemas under each feature define complete record contracts and user-input contracts. TypeScript types are inferred from those schemas. Implemented tables are profiles, organizers, venues, session_series, sessions, and registrations. Registrations currently support the organizer roster and attendance backend; player registration workflows and notifications remain future plans. Add migrations and authorization tests with each implemented feature, as required by AGENTS.md.

## Contract conventions

- Use snake_case for persistence-shaped records. UUIDs are strings; timestamps are ISO 8601 strings with a timezone offset, not JavaScript Date objects.
- Editable records have `created_at` and `updated_at`; the database maintains these values. The outbox has only `created_at` because its delivery timestamps describe its lifecycle.
- Required nullable fields explicitly use null. Forms should map blank optional strings to null before validation.
- Strict input schemas reject unexpected properties. Ownership, approvals, lifecycle timestamps, and queue order come from trusted operations, never request bodies.
- Zod validates shape and local invariants. It does not establish authorization, referential integrity, uniqueness, available capacity, or deadline compliance against database state.
- Foreign keys use UUIDs. SQL timestamps use `timestamptz`; dates use `date`; positive capacities/durations use `smallint`; prices/notice durations use `integer`.

## Profiles

Contract: `src/features/profile/domain.ts`.

`profiles.id` is both primary key and foreign key to `auth.users.id`. Store first/last name, avatar URL, optional phone number, self-reported Argentine category and category status, a player/organizer starting-mode preference, onboarding completion time, and welcome-email delivery time. Names may be absent before onboarding; completion requires a first name. Authentication credentials and email remain in Supabase Auth.

Players access their own record. Participant lists expose only necessary identity fields through a restricted operation. No public profile directory. Do not add editable authorization roles here.

The onboarding migration creates this table. The auth adapter reads profiles and maps `avatar_url` plus ISO timestamps into the existing profile UI model. No legacy `users` table exists in the connected Palla database; profiles are created idempotently on the first authenticated load. The retained welcome-email source uses profiles but is not deployed or automatically invoked.

## Organizers

Contract: `src/features/organizer/domain.ts`.

`profile_id` is the primary key and foreign key to profiles. Store display name, optional bio, `active | suspended` status, and nullable approval timestamp (self-service activation does not require approval). Completed accounts can activate organizer access immediately through self-service onboarding. Trusted admin operations may suspend or restore access; clients cannot edit administrative status. An organizer-editable input contains only display name and bio.

Use trusted organizer state for authorization. Public session details may expose display name/bio without exposing administrative state. Suspended organizers cannot publish new sessions; handling already-published sessions requires an explicit admin workflow.

## Venues

Contract: `src/features/venues/domain.ts`.

Store ID, nullable Google Place ID, nullable organizer-supplied name/address, arrival instructions, creator profile ID, and active flag. Require a Place ID or both name and address. A Google-backed record may rely entirely on fetched display details. Name/address fields are for independently supplied data, not unrestricted caching of Google responses.

Make non-null Place IDs unique. `created_by` is attribution, not exclusive club ownership. Active organizers may create venues through validation and duplicate checks. Protect shared corrections and deactivation through trusted operations. Read active venues linked to published sessions publicly; avoid exposing creator IDs through that public interface.

## Session series

Contract: `src/features/sessions/domain.ts`, `sessionSeriesSchema`.

The deployed session_series table stores the owning organizer, the creation form's draft_input JSON, draft/active/paused/ended status, normalized content and recurrence template, timestamps, and normalized visibility, categories, waitlist settings, and optional timing offsets in minutes. Incomplete drafts have no occurrences. Publishing generates at most 52 occurrences atomically; a one-off also has a series identity. Normalized occurrence details live in sessions and are authoritative. sessionSeriesSchema validates the actual persisted record. The actual record schema reflects the deployed template columns; drafts may have an incomplete template. Published occurrences retain independent copies of content and participation settings.

Only the owning active organizer manages a series. Scheduling is fixed to America/Argentina/Buenos_Aires in this slice; other timezone/DST behavior is deferred. Original occurrence dates identify scope and remain stable after edits. See organizer-sessions.md for transaction, version, and recurrence rules.

## Sessions

Contract: `src/features/sessions/domain.ts`, `sessionSchema`.

The deployed sessions table stores owner/venue, a required series ID and original occurrence date, copied content, explicit allowed-category arrays, visibility, waitlist settings, start/end instants, optional registration opening/closing and player cancellation deadlines, and published/cancelled/completed status. Drafts live only in session_series. The reusable session input contract also retains legacy optional-series flexibility. Cancellation has a timestamp and optional reason.

The original occurrence date stays fixed when a session is rescheduled. Enforce unique `(series_id, occurrence_date)` for recurring sessions. Require paired series/date, end after start, and deadlines no later than start. Reject capacity reductions below confirmed participation. Never impose uniqueness on venue/time: different organizers can have independently arranged courts.

Organizer inventory is currently private to the owning organizer. A restricted public session-detail interface remains part of the planned player-discovery feature. Only the owning organizer can manage them. Validate the series owner when attaching a session to a series. Counts come from registration state, not a separately writable spots-remaining field.

Settings, defaults, validation, and recurring timing semantics are documented in [session-creation-settings.md](session-creation-settings.md). Visibility metadata does not yet expose a player discovery API or change owner-only inventory access.

## Registrations

Contract: `src/features/registrations/domain.ts`.

The organizer-only roster/attendance backend is implemented by `20261014180900_session_registrations.sql`; see [organizer attendance](organizer-attendance.md). Arrival timestamps and actors are a nullable pair. Player registration transactions below remain planned, not implemented.

Store session/player foreign keys, `confirmed | waitlisted | cancelled`, current join time, waitlist sequence, confirmation time, cancellation actor/time, and optional reason. Enforce unique `(session_id, player_id)`. The server resets lifecycle fields on rejoin and assigns a new queue sequence.

Use Postgres bigint for queue order, serialized explicitly as a decimal string by the repository/backend adapter so JavaScript does not lose precision. Position is derived from eligible waiting entries. Confirmed records require a confirmation time; waiting records require a queue sequence and no confirmation time; cancellations require actor/time. A cancelled record may retain its prior confirmation/queue history.

Players read their own participation. Organizers read participation only for owned sessions. Public availability exposes aggregate counts, not participant records.

Join, cancel, promote, and organizer cancellation must lock the affected session in one transaction. Recheck active organizer state, published session status, profile completion, capacity, and relevant deadlines. Status changes and notification enqueueing commit together. Retry requests must not create duplicate participation or duplicate notifications. Direct client writes must not bypass these operations. Privileged entrypoints must explicitly authorize the caller and restrict execution privileges.

Account deletion must resolve future confirmed spots and promote eligible waitlisted players before removing participation. Do not silently cascade-delete active participation and strand available places.

## Notification outbox

Contract: `src/features/notifications/domain.ts`.

Place the delivery table in a non-exposed private schema. Store recipient, optional registration reference, event payload, unique deduplication key, delivery status, attempts, scheduled delivery time, worker lease, sent timestamp, provider reference, last error, and creation time.

The typed payload is a discriminated union containing `event_type` and, for session events, the session reference and display snapshot. For SQL, retain an indexed `session_id` foreign key and `event_type` column alongside the JSON payload; the backend adapter derives them from the payload and ensures they agree. Zod records intentionally avoid duplicate independently writable representations.

Only workers/admin operations access this table. Claim work atomically, retry with bounded backoff, and recover expired leases. Sent records have a sent timestamp; processing records have a lease. Resolve recipient email through trusted auth access. Do not expose worker errors or email addresses to public clients.

Use a distinct deduplication key per transition, including rejoin after cancellation. Before sending a scheduled reminder, check current session/registration state. Provider delivery is outside the database transaction; use provider idempotency where supported to handle crash recovery.

## Database indexes and access

Index foreign keys used in joins and authorization predicates. Add indexes for published sessions by start time, organizer sessions by owner/start time, player participation by player/status, waiting registrations by session/queue sequence, and pending outbox work by available time. Verify plans against actual queries before adding more.

Enable RLS on every exposed table and grant only required operations. RLS filters rows; protect server-owned columns with column grants or restricted operations. Public responses must select safe fields explicitly. Authorization tests should cover anonymous, player, owner organizer, unrelated organizer, suspended organizer, and privileged worker paths.

## Implementation order

1. Inspect remote state; implement profiles and trusted organizer access with migration-compatible auth adapters.
2. Implement venue selection and standalone sessions, public discovery, and details.
3. Implement transactional registration, cancellation, and waitlist promotion with concurrency tests.
4. Implement recurring series and idempotent occurrence generation.
5. Implement the private outbox and notifications alongside event-producing transactions.

No remote database changes are authorized by these local contracts alone. The MVP decisions are recorded in [MVP scope](mvp.md).
