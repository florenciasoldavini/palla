# Session cancellations

## Organizer flow

Cancellation starts only from the existing **Cancel session** button on an upcoming occurrence detail. It opens a dedicated screen with a session summary, confirmed/waitlisted recipient counts, a required reason, and an optional message (up to 1,000 characters). A final native confirmation names the selected date. There is no cancellation control in the editor and no date-scope selector in the app. The repository explicitly sends `p_scope: 'one'`; backend multi-date capability is not exposed by application input.

Reasons have stable codes: `weather`, `venue_issue`, `host_emergency`, `insufficient_players`, and `other`. The reason is self-reported and is stored separately from the message in `sessions.cancellation_reason_code` and `sessions.cancellation_reason`. No reliability adjustment, automatic exemption, fee waiver, refund, or verification claim is made. A later scoring policy can consider venue and other evidence independently.

Loading, errors, unavailable sessions, empty audiences, draft-discard protection, pending-action navigation protection, native confirmation, and success/failure toasts are explicit. Failed saves retain the form. If the session version or recipient count changes, refresh the context and require another confirmation. The next occurrence remains published after a single-date cancellation.

## Atomic backend workflow

`cancel_session_occurrences` is an authenticated invoker wrapper around a private function that validates active host ownership, reason/message, future published status, optimistic version, recipient count, and request identity. A host-row lock serializes request IDs across series; subsequent locks follow the existing series → occurrence → registration order. One transaction records cancellation events, creates recipient notifications, and cancels registrations while preserving history and clearing arrival marks. Any failure rolls the transaction back. Retrying the same request and payload returns the existing event; conflicting reuse is rejected.

`private.session_cancellations` has one row per cancelled occurrence, with a server-generated batch ID, client request ID, original request occurrence, author and creation time. The session remains the source for cancellation time, reason and message. The existing registration-cancellation trigger captures **confirmed and waitlisted** recipients before changing their status, excludes the host and previously cancelled registrations, and inserts unique inbox entries. It also covers legacy cancellation calls and direct authorized status updates. There is no retrospective notification backfill.

`private.app_notifications` adds `cancellation_id` and a recipient-status snapshot. Existing registration associations and unique deduplication keys remain authoritative. The new table and notification storage deny direct client access with RLS and revoked grants; authenticated ownership-checked RPCs provide access. Original recipients can read cancellation details after their registrations become cancelled. Other players cannot read the reason/message through these RPCs.

The backend retains `future` scope for compatibility and later work. Each affected date gets its own inbox item. Server-generated batch IDs and a unique batch/recipient/device push index produce one push per affected player/device, even when several dates are cancelled. The grouped alert opens an unread item in that batch; the other dated items remain in the inbox.

## Player notifications and preferences

Players see a white notification card with a lilac rounded-square calendar icon and a neon unread dot. Tapping opens a bottom sheet with the dated session summary, host, reason and message. Confirmed-player and waitlist-entry cancellation copy is distinct. **Message host** opens the existing conversation, without attaching an organizer-only source-session context.

The database catalog adds `session_cancellations` with player audience and default push enabled. **Session cancellations** appears under Sessions in player mode only. Organizer accounts attending another host's session receive the player notification regardless of active mode. Turning push off never suppresses inbox delivery; turning it back on does not enqueue missed work. Chat blocking/muting does not suppress cancellation notices; existing chat restrictions still apply to Message host.

Cancellation push delivery uses the existing queue/worker, its bounded retries/device checks, a dedicated Android channel, and a typed `cancellation_notification` payload. Delivery is based on the captured recipients and unread state, not a published session or currently confirmed registration. Cancellation alerts can be delivered after the scheduled start, subject to the existing 24-hour queue expiry. Push failure never rolls back cancellation. Inbox history remains after that expiry.

## Deployment and testing

Apply the cancellation, inbox-schedule and request-serialization migrations and redeploy `chat-push` with its existing import map/custom worker authorization. There are no new dependencies, environment variables, secrets, or cron jobs. The migrations and worker were deployed to the connected project after explicit approval.

`supabase/tests/session-cancellations.sql` uses rollback-only fixtures for authorization, reason validation, stale versions/counts, single-date isolation, retry deduplication, recipient snapshots, opt-outs, inbox/detail/read targets, post-cancellation delivery, and backend batch grouping. Existing announcement/review SQL tests remain regression checks. Unit tests enforce required stable reasons, message bounds and the application repository's constant single-date scope, and verify the cancellation push channel/payload.

Development-only native previews use the production occurrence, form, inbox, settings and reader components without account writes: `palla://sessions-preview/cancellations`, `?screen=form`, `?mode=player`, `?mode=player&screen=reader`, and `?state=settings`. Other states: `loading`, `error`, `unavailable`, `empty`, `save-error`, `reader-loading`, `reader-error`, and `waitlisted`. Preview saves and chat launch are clearly labelled simulations. Runtime evidence and platform-specific checks belong in `docs/native-testing.md`. APNs/FCM delivery remains subject to the provider setup in `docs/chat-push.md`.
