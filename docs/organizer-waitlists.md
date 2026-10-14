# Organizer waitlists

Scope: organizer-only management in the existing occurrence-detail Waitlist Queue card. Player registration screens and joining/cancellation APIs remain deferred. No reliability scores, queue removal controls, QR scanning, payments or notifications are added to this UI.

## Structure and behavior

Waitlisted players use the existing `registrations` table with `status = waitlisted`, `joined_at` and a server-assigned `waitlist_sequence`. There is no additional waitlist table. Category chips use the actual Argentine category; joined-age copy comes from `joined_at` and updates each minute. Every promotion action has the same neon style and upward icon. The automatic/manual icon uses the text color. Avatars currently use initials; reliability values are omitted because no reliability data exists.

Manual mode allows the active owning organizer to choose an eligible queued player when there is capacity. Promotion changes the registration to confirmed, sets `confirmed_at`, preserves its queue sequence as history, and refreshes the confirmed roster/check-in list. Repeating the same successful promotion is harmless. Conflicting stale requests are rejected.

Automatic mode fills all available places with the first eligible waiting players, ordered by queue sequence, join time, then registration ID. It runs atomically when a confirmed registration is cancelled, a queued registration is inserted, capacity increases, or relevant session eligibility/settings change. Enabling automatic mode can immediately fill available places, so the UI explains this before confirmation. The mode change applies to the current occurrence only; series defaults and other dates are untouched. No background scheduler is required for these event-triggered operations.

The user chose promotion to stop at the registration deadline. Both modes require a published session, enabled waitlist, an open registration window, a time before the effective close (`registration_closes_at`, or session start if null), available capacity, and an active owning organizer. Strict category enforcement checks the current profile category. Unknown/ineligible categories remain queued and are skipped automatically. Gender policy is stored but profiles do not yet collect gender; the future trusted joining workflow must enforce gender eligibility before accepting a registration. No player joining API is exposed by this feature.

Waitlist insertion assigns queue sequence under the occurrence lock and respects enabled/window/capacity settings. Trusted backend registration mutations must lock the occurrence before registration rows, matching organizer operations. Session cancellation does not promote anyone; its existing trigger cancels all confirmed/waitlisted entries. Changing the waitlist to disabled preserves its queue/history but prevents promotion. The backend retains a restricted organizer removal operation for future use; it has no control in this UI, as requested.

## API and authorization

Migration: `20261014192130_organizer_waitlists.sql`, deployed to Palla Supabase.

- `get_organizer_waitlist(session_id)`: queue entries with minimal player identity/category, eligibility, current occurrence mode/version, confirmed count/capacity and a promotion-block reason.
- `manage_organizer_waitlist(registration_id, action, expected_version)`: authorized, versioned promotion (or an organizer removal operation reserved for future UI).
- `set_organizer_waitlist_mode(session_id, mode, expected_version)`: authorized, versioned current-occurrence mode change and automatic fill.

Public wrappers are SECURITY INVOKER; privileged implementations and automatic-fill triggers are private with an empty search path. Anonymous access, direct authenticated registration writes, and direct authenticated automatic-fill calls are denied. Authorization comes from trusted organizer ownership/status, not user metadata. The app follows components → hooks → services → repositories, with TanStack Query managing remote state. Waitlist polling refreshes the roster so automatic promotion from another operation becomes visible.

## Verification

Rollback-only isolated PostgreSQL tests cover owner isolation, manual promotion, full sessions, strict categories, automatic filling after a confirmed cancellation, enabling automatic mode, queue capacity, deadline blocking, retry idempotency, stale updates, and whole-session cancellation. A two-connection test confirms exactly one competing promotion gets the last place. Existing attendance SQL regression checks pass. No live account registrations were created by those tests.

Remote privilege checks confirmed anonymous reads/writes denied, direct automatic fill denied, and no direct authenticated registration UPDATE. Security advisor results contain only the pre-existing Places quota and Auth findings documented in session creation settings; no new waitlist finding was reported.

Native UI evidence and limits are recorded in `docs/native-testing.md`. The development occurrence fixture simulates manual and automatic promotion and updates the same roster/check-in presentation components without writing account data. It is not evidence of live native-to-Supabase persistence. SQL tests verify real backend behavior separately.
