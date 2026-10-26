# Host registration notifications

A successful player join and player-initiated cancellation each create an organizer inbox entry in the same transaction as the registration change. The existing private notification catalog adds two organizer-only types: `new_registrations` and `player_cancellations`. Both push preferences default on. Player mode never exposes these settings; account preferences persist across mode changes. Inbox entries remain available when push is disabled.

The existing notification row stores a snapshot of the player's name. Its deduplication key combines the type, registration ID and confirmation/cancellation timestamp. Retrying the same operation creates no duplicate; cancelling and rejoining creates separate events. There is no historical backfill. Host removals, whole-occurrence cancellations and automatic waitlist promotions do not emit these player events.

Tapping either entry opens the organizer occurrence detail and marks the entry read. Push targets are resolved through the authenticated notification-target RPC, not arbitrary URLs from payloads. Another account cannot resolve the target. The detail retains its normal authorization checks.

The existing private outbox and scheduled push worker handle delivery. Enqueue and claim recheck the individual preference, unread state, active organizer and future published session. Pending/sending jobs are skipped after opt-out; opting back in does not replay skipped jobs. Android uses the registrations channel. Foreground presentation checks the matching preference and recipient account. Existing receipt handling, bounded retry and invalid-token cleanup are reused. Already submitted provider alerts cannot be recalled.

## Verification — 21 October 2026

- `npm run verify`: 230 tests passed; 14 existing lint warnings, no errors.
- Rollback SQL: `supabase/tests/registration-host-notifications.sql` covers catalog visibility, organizer-only saves, independent defaults, authorization, duplicate retries, rejoin events, mute/inbox independence, pending-job suppression, waitlist promotion and host-removal exclusions. Existing player registration/cancellation regression SQL also passed after the migration.
- Native: iPhone 17 Pro / iOS 26.5 and Pixel 8 / Android 17 API 37. Both existing test accounts joined and cancelled temporary sessions through the native app. The opposite host received both inbox entries; tapping opened the correct occurrence and back returned to the inbox with the entry read. Host/player settings visibility and a real preference save/restore were checked.
- Push transport unit tests verify the registrations channel and typed organizer payload for both events. A real iOS outbox job reached Expo but failed with `InvalidCredentials`. The Android emulator had no registered push token. Remote OS delivery, foreground banners, background/cold-start push taps and receipts remain unverified until the existing APNs/FCM setup is completed; see [chat-push.md](chat-push.md).
- Temporary sessions, registrations, venues, notifications and outbox jobs were deleted; the test preference override was removed. Backend migration applied and shared push worker deployed. Supabase advisors showed no new security or performance findings.
