# Session announcements

Hosts publish one-way plain-text announcements from **Message players** in a dated session. Both writing and reading use the shared `AppBottomSheet`; the notification inbox keeps a two-line preview and opens the reader. **Message host** starts or opens the existing organizer/player conversation. Announcements do not insert chat messages and chat block/mute preferences do not filter them.

## Rules

- Only the session's active organizer can publish, before the scheduled end of a published occurrence. Cancelled/completed sessions and drafts cannot send.
- Required message, up to 1,000 characters. No title, attachments, replies, reactions, preview step, or series-wide send.
- A short native confirmation names the confirmed-player count. If that count changes before publishing, reject and refresh the count while retaining the message.
- Capture confirmed registrations at publication. Exclude the host, waitlisted players and cancelled registrations. Reject an empty audience.
- Send retries reuse an author-scoped request ID. A changed message gets a new ID. Server locking and a limit of ten announcements per host per minute prevent duplicate/flood sends.
- New confirmed registrants can read prior session announcements without retrospective inbox or push delivery. Original recipients retain access after cancelling, but cannot read subsequent announcements unless they register again.
- No editing. The author may remove with confirmation: content is replaced with a tombstone in the session and inbox. Already delivered pushes cannot be recalled. Pending pushes are skipped.
- Session history shows the original recipient count, not delivery/read receipts. Discarding a nonempty draft requires confirmation. Failures retain the draft and show a toast.

## Data and permissions

`public.session_announcements` stores the occurrence, author, body, request ID, creation/removal timestamps. `private.session_announcement_recipients` stores the immutable audience, unique by announcement/player, with the original registration ID. Neither table grants client access. RLS is enabled and deny-by-default; ownership-checked RPCs are the only client entry points. The author/request and occurrence/date indexes cover sends and history; recipient and foreign-key indexes cover access checks.

The `session-announcements` Edge Function verifies the authenticated user with Auth.getUser and calls the transaction under that user's JWT; it needs no service-role client. The transaction independently validates active host ownership, status, message, recipient count and rate limits. The database remains protected if a client calls the RPC directly. The function returns safe validation messages without logging announcement text or credentials.

The notification inbox adds `announcement_id` and a type-target constraint. Notification read state stays in `private.app_notifications`; it is not duplicated in the recipient table. Notification targets are resolved through the existing ownership-checked RPC, including push taps.

## Settings and delivery

The existing database catalog adds `session_announcements`, audience **player**, default push **on**. The player's Notifications page displays **Session announcements** under Sessions; organizer mode does not display it. An organizer attending another host's session receives the event as a player regardless of current mode. Account overrides remain keyed by notification type; no new preference table or client-side visibility catalog.

Publishing atomically creates inbox items and queues eligible registered devices through the existing notification push jobs. The worker uses Android's Announcements channel and a typed `announcement_notification` target. Existing review worker RPC names remain compatible, but now dispatch both reviews and announcements.

Push delivery rechecks the preference, unread state, device ownership, removal, confirmed registration and session end/cancellation. Turning push off preserves inbox/history; turning it back on creates no backlog. Pending push alerts expire at the session end or the existing 24-hour queue limit. Automatic cancellations/time changes/promotions remain separate future notification types.

## Deployment and verification

Apply the announcement migrations, deploy `session-announcements`, and redeploy `chat-push` with its `review-worker.ts` and `deno.json`. No new dependencies, secrets, or environment variables. Actual APNs/FCM delivery still depends on the provider setup in `docs/chat-push.md`.

`supabase/tests/session-announcements.sql` uses isolated rollback-only fixtures to verify ownership, audience exclusions/snapshots, retries, validation, late registration history, read state, mode-specific preferences, opt-outs and removal. Existing review SQL tests exercise the extended inbox and worker for regressions. Unit tests cover message bounds, typed push targets and the announcement transport channel.

The development-only `palla://sessions-preview/announcements?mode=organizer` and `mode=player` routes use the production presentation components without account writes. `state=settings|error|reader-error|reader-loading|save-error|removed|long|no-players|ended` supports native QA. Preview message-host actions are labelled simulations; they do not create conversations. Actual player session detail is not yet implemented; the read/list RPC is ready for it, while current player entry is Notifications.

Authenticated delivery was also verified over HTTP with explicit user approval: temporary host/player Auth accounts and a private session exercised publishing through the deployed Edge Function, retry deduplication, player inbox/detail/read state, role-filtered settings, unauthorized sends and removal. All QA authentication and product records were deleted afterward and zero remaining fixtures verified. This confirms in-app delivery; it does not confirm APNs/FCM transport or a native Message host conversation launch.
