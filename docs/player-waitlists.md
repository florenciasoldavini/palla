# Player waitlists

Full public sessions offer **Join waitlist** when the queue is enabled and below its optional limit. A null limit means unlimited. A full queue shows a disabled **Waitlist full** action; disabled queues retain **Session full**. Existing members see **Leave waitlist** instead of Cancel registration. After promotion they see Cancel registration under the confirmed-place cancellation rules.

The existing join RPC chooses a confirmed place when available or a queued place when full. It derives the player from authentication, locks the occurrence before checking capacity, and applies the existing profile, host, public visibility, active venue/host, registration-window and strict-category rules. The registration guard independently enforces queue limits. Retries return the existing active entry without duplication or promotion. Rejoining after a self-cancellation receives a new sequence at the end; a host-removed entry cannot be reopened by its player.

The existing cancellation RPC also accepts the caller's waitlisted entry. Leaving requires a published, future session but is allowed after registration closure or the confirmed-place cancellation cutoff, including when the host has disabled the queue. It soft-cancels that entry and notifies the host once. A confirmation sheet explains that rejoining goes to the back. A concurrent promotion is resolved using authoritative server status: confirmed-place cancellation rules apply if the player was already promoted.

Manual organizer promotion and automatic filling keep the existing first-eligible queue behavior. A shared queued-to-confirmed trigger emits one player notification for every actual promotion, regardless of which path caused it. A retry does not emit another notification. Promotion does not fabricate a separate host new-registration alert. A promoted player cancelling can still trigger the next automatic promotion.

## Notifications and settings

The central database catalog adds three default-on types:

| Type                  | Visible setting     | Audience  |
| --------------------- | ------------------- | --------- |
| `waitlist_joins`      | Waitlist joins      | Organizer |
| `waitlist_departures` | Waitlist departures | Organizer |
| `waitlist_promotions` | Waitlist promotions | Player    |

In-app entries are independent of push preferences. Host queue activity opens the organizer occurrence detail. Promotion opens the public session detail and invalidates its cached registration state first. Another account cannot resolve the notification target. The existing shared lilac icon tile and catalog mapping render all three types.

Push jobs use the existing outbox and registrations channel. Enqueue and claim check preferences, unread status, the active host and a future published session. Promotion push additionally requires the same confirmation event to remain current, so an old promotion is suppressed after cancellation/rejoining. Its event key uses the confirmation epoch to avoid timezone-dependent comparisons. Opting out skips pending work; opting back in does not replay skipped jobs. Already submitted provider alerts cannot be recalled.

No new product tables or historical backfill are added. Public detail exposes only queue enabled/limit/count metadata, with no queue identities or registration IDs.

## Verification — 21 October 2026

- Migration `20261021163804_player_waitlists_and_notifications.sql` applied; shared push worker deployed.
- `supabase/tests/player-waitlist-flow.sql` passes in a rollback-only transaction: entry limits, disabled/full queues, category checks, retries, leaving after cutoffs, rejoin ordering, manual/automatic promotions, push preferences, stale promotion suppression, target audience and authorization.
- Player join/cancellation, host registration notification and organizer waitlist regression SQL pass. The older organizer test now uses temporary, security-invoker views scoped to its fixture series, so its writes and counts do not include unrelated sessions on a populated project.
- `npm run verify`: 238 tests passed, 14 existing lint warnings and no errors. Tests cover queue availability/leave cutoffs, typed push audiences and both transport paths.
- Native Palla development app: iPhone 17 Pro / iOS 26.5 and Pixel 8 / Android 17 API 37. Both existing test accounts joined, left and rejoined through the native session action. Host queue activity appeared in the inbox. Manual promotion was executed through the iOS host UI and opened the Android player's confirmed session from its notification. Automatic promotion confirmed the iOS player and its inbox action opened the confirmed session.
- Temporary occupancy fixtures used only the existing test accounts; no additional accounts were created. Fixture registrations filled the session, and releasing them provided the promotion opening. All temporary sessions, registrations, venues, notifications and cascading outbox jobs were removed.
- Checked disabled full-queue actions on both platforms and role-specific settings. No text input or keyboard is introduced. Screenshots: ignored `.impeccable/review/native/player-waitlist/`. Safe no-write preview states: `/sessions-preview/public-session?state=waitlist|waitlist-full|waitlisted`.
- Actual foreground/background OS push delivery remains unverified pending the existing APNs/FCM setup; see [chat-push.md](chat-push.md). No new Supabase advisor findings.

## Priority when a place opens

An existing queue takes priority over new direct bookings, including in manual mode. When a player cancels, manual mode leaves the opening for the host to assign: newcomers join the end of the existing queue instead of taking that opening. A full or disabled queue does not allow bypassing the waiting players. With no waiting players, an available place can still be booked directly.

Automatic promotion remains in the transaction that releases the place. New and returning queue entries also run first-eligible automatic filling, so an eligible returning player can be confirmed when earlier entries no longer meet the category rules. The session row lock serializes admission, cancellation, and promotion. Duplicate joins retain their existing registration and queue position.

Session details and Explore use the same rule: reserved vacancies are offered as waitlist entry, not as direct spots. The paged `spots`, `waitlist`, and `joinable` discovery filters match admission. Migration: `20261026143512_waitlist_booking_priority.sql`; deploy it before releasing the matching app UI. Regression: `supabase/tests/waitlist-booking-priority.sql`. Native no-write preview states: `/sessions-preview/public-session?state=waitlist-priority|waitlist-priority-full|waitlist-priority-closed`.
