# Organizer attendance

Current scope is organizer-only: read confirmed attendees for an occurrence, mark an arrival, and undo a mistaken arrival. Player registration screens, joining/cancelling APIs, invitations, QR scanning, and notification delivery remain deferred. Organizer waitlist promotion is implemented separately; see [organizer waitlists](organizer-waitlists.md).

## Backend

Migration `20261014180900_session_registrations.sql` creates the roster foundation in `public.registrations`. Each player has at most one registration per occurrence. Lifecycle fields retain the existing confirmed/waitlisted/cancelled contract; `checked_in_at` and `checked_in_by` form a nullable pair, allowed only for confirmed registrations.

Clients have SELECT only, filtered to their owned sessions. Player and anonymous roster reads are denied. Creating/changing registrations is reserved to trusted backend/service-role workflows until actual registration is implemented. No organizer add-attendee UI or player join RPC is included. Existing sessions start with an empty real roster; illustrative participants are not migrated into real data.

`get_organizer_roster(session_id)` requires the active owning organizer and returns only confirmed entries plus minimal player identity (first/last name, avatar URL, category). Phone/contact fields are excluded. Queue bigint values are explicitly serialized as strings. Repository/service adapters live under `src/features/registrations/`; UI must consume them through feature hooks.

`set_registration_attendance(registration_id, arrived, expected_version)` derives the actor from Auth, locks the occurrence before the registration, permits only active owning organizers and published/confirmed entries, and rejects conflicting stale changes. Identical retries preserve the original timestamp. Undo clears timestamp/actor together. No QR or time-window policy is introduced.

Registration inserts lock the occurrence and reject confirmed capacity overflow. Organizer capacity reductions below the confirmed roster are rejected. Trusted backend updates must also lock the occurrence before registration rows; PostgreSQL deadlock detection remains a fallback, not the desired mutation order. Profile deletion is restricted while referenced registrations remain, rather than silently deleting occupied places. A future account-deletion workflow must resolve registrations explicitly.

Organizer session cancellation changes confirmed/waitlisted entries to cancelled atomically, with the organizer as actor, preserving registration history and clearing active arrival marks. Completed/cancelled sessions cannot receive new attendance changes.

## Verification

`supabase/tests/organizer-attendance.sql` uses rollback-only fictional accounts in an isolated PostgreSQL 16 database. It covers owner/player/other-owner/anonymous authorization, forbidden direct updates, capacity overflow/reduction, arrival, undo, same-action retry, stale opposite-action rejection, and session cancellation. A two-connection local test confirmed that only one insertion can take the last available place. TypeScript contract tests cover actor/timestamp pairing, cancelled/waitlisted arrival rejection, bigint precision, and required optimistic versions.

The existing occurrence-detail Active roster and Court check-in sections now consume the organizer roster through a TanStack Query hook. Mark arrived saves through the attendance RPC; confirmed undo clears the arrival. Actions are disabled during saves and outside published sessions, and failures show a friendly reload message. The development occurrence preview exercises the same presentation components with simulated writes. Native verification details are recorded in `docs/native-testing.md`; fixture tests do not establish live account persistence.

Deployment: migration applied to the Palla Supabase project. Remote checks confirmed RLS enabled, authenticated SELECT only, no authenticated direct UPDATE, no anonymous SELECT, and no anonymous attendance RPC access. `npm run verify` passed 58 tests, typecheck and formatting; lint retains 13 existing warnings. SQL fixtures and last-place concurrency test passed locally.

## Active roster presentation

Player rows use category tags alongside names and ghost message/options icon buttons, matching the supplied Stitch reference without the You badge or Confirmed chip. Available avatar URLs render with initials as fallback. Message/options controls explain that their actions are coming soon; they do not send messages or change registrations. Payment tracking is not implemented: real roster rows show a neutral Coming soon label. The development occurrence preview alone shows illustrative paid checkmarks and amounts.

## Registration occupancy

The published occurrence summary shows confirmed registrations against capacity (for example, `3/4 filled` or `4/4 filled · Full`). It reads the same actor/session-scoped TanStack Query roster as Active roster and Court Check-in; waitlisted and cancelled registrations do not count. Promotion invalidations refresh this shared data, so the summary and roster update together. No additional counter column or migration is required.

The badge shows `Loading players…` before the first roster result and `Count unavailable` on roster failure, rather than presenting unknown occupancy as zero. A successful empty roster shows `0/<capacity> filled`. Cancelled/completed occurrence status labels remain unchanged. Native fixture checks and limits are recorded in `native-testing.md`.

## Available roster slots

Published occurrences render one dashed slot card for each unfilled place (`capacity - confirmed attendees`), after the player cards. Slot numbers are display positions, not assigned courts or reserved seats. A successful empty roster shows all available slots instead of a second empty-state panel. Slots are hidden while loading, on error, and for cancelled/completed sessions, and disappear as promotions fill capacity. Direct invitations remain an explicit Coming soon placeholder and never send an invitation.

`AvailableRosterSlot` uses the shared muted row card with a dashed border, a decorative user-plus icon, “Slot <number>: Available” copy and an Invite directly action. The action opens a native Coming soon dialog explaining that no invitation was sent. `AttendanceSections` receives capacity from its caller, clamps the available count to zero, and numbers slots after the confirmed attendees. No slot records or reservations are created. Native fixture evidence and larger-text checks are recorded in `native-testing.md`.
