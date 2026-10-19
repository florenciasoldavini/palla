# Session reviews and review notifications

## Current implementation

Players rate a completed session with **one required 1–5 rating** and an optional comment of up to **2,000 characters**. There are no manual tags or multi-step form. The review sheet opens from the notification inbox; no public session page is assumed. Review lists and their placement on public session/host profiles remain a separate UI task.

The bell opens the active mode’s notifications. Players see review invitations; organizers see new reviews of sessions they hosted. All/Unread filters, pagination, individual read state and loading/error/empty states are included. Read invitations remain in All, allowing the player to reopen their review. A host can open the received review privately and report it.

The player’s My games screen is still a placeholder. Its future past-booking detail should reuse `ReviewSheet` with the registration ID; do not build a public session route just to launch a review. Until that feature exists, the invitation in Notifications is the review entry point.

## Eligibility and lifecycle

- One review per confirmed registration/dated session occurrence; never the host’s own registration.
- The session must have ended and must not be cancelled. Host check-in is not required.
- Submission and edits are allowed before `sessions.ends_at + 14 days`, using the scheduled end rather than the completion job’s execution time.
- Reviews do **not** change `registrations.checked_in_at` or `checked_in_by`. A review can describe an experience that did not include playing; it is not evidence of attendance.
- A server job every five minutes changes ended, published sessions to completed and stamps `completed_at`. This represents elapsed scheduled time, not verified attendance.
- Initial publication is immediate. The association with registration, session, host and author is assigned by the server.
- Edits use an optimistic timestamp to reject overwriting another edit. Retrying an identical initial submission returns the existing review.
- Authors may soft-delete even after the edit window. Removed reviews leave public averages and cannot be recreated for that registration.
- Editing a hidden review during the window republishes it. Existing report evidence and moderation decisions remain audited.
- Every published review counts equally in host/session averages, including different sessions reviewed by the same player. Hidden and removed reviews do not count.

## Data and authorization

`public.session_reviews` contains the registration/session/host/author IDs, rating, comment, status and timestamps. Registration is unique. RLS allows public reads of published reviews and private reads by the author/responsible host. Clients cannot insert, update or delete the table directly; ownership and eligibility checks are in restricted RPCs.

`private.review_reports` stores one report per review, submitted only by its responsible host. Reasons: harassment/offensive content, personal information, spam/promotion, fake/manipulated review, other. Details are optional and limited to 2,000 characters. A content snapshot preserves what was reported. Reporting does not hide the review.

`private.review_moderation_log` audits each restricted moderation decision. There is no moderator dashboard in this branch. Authorized operators review pending reports in Supabase and invoke the service-role-only `moderate_session_review` RPC with the review ID, `hide`, `restore` or `dismiss`, a real moderator profile ID, and a required decision note. Never expose service credentials in the app. Removed reviews cannot be restored through moderation.

The new private tables intentionally have RLS enabled with no client policies; only the ownership-checked functions or trusted worker can access them. The Supabase advisor’s “RLS enabled, no policy” information notices are expected for these deny-by-default tables ([explanation](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)).

## Notification catalog and preferences

`private.notification_types` is the single source of truth for a type’s audience, default push state and ordering:

| Type               | Audience  | Default |
| ------------------ | --------- | ------- |
| `chat_messages`    | shared    | on      |
| `review_reminders` | player    | on      |
| `new_reviews`      | organizer | on      |

`private.notification_preferences` stores overrides by `(profile_id, notification_type)` with `push_enabled`. Existing chat opt-outs are preserved, and the previous chat preference RPCs remain compatible. Missing overrides inherit catalog defaults. The app maps known type keys to labels/descriptions only; it does not maintain another audience/default definition.

Settings are filtered on the server by active mode. Player mode shows chat messages and review reminders; organizer mode shows chat messages and new reviews. Organizer-only access requires an active organizer record. Switching modes does not reset preferences or determine delivery: delivery uses the event’s notification type and account preference.

In-app inbox items are independent of push settings. Turning push off skips matching pending deliveries without removing inbox items. Turning it back on does not create a backlog.

## Scheduling and delivery

- One player invitation approximately one hour after the scheduled end (up to five additional minutes due to the scheduled pass).
- Recheck confirmed registration, session status, deadline and absence of any review before creating the invitation.
- Exactly one host inbox item/push job on first publication. Edits and republication do not create another alert.
- Deduplication keys protect both invitation and first-publication events.
- Review push jobs use the existing installation registry and authenticated `chat-push` Edge Function, with an independent queue and Android Reviews channel.
- Before claiming a delivery, recheck preferences, unread state, eligibility/review status and device ownership/token validity. Retries are bounded and receipts are processed. Notification targets are resolved through an ownership-checked RPC before navigation; arbitrary push URLs are never followed.
- Neither enabling push nor registering another device re-enqueues old notifications.

Actual APNs/FCM delivery still requires the Apple Developer/Firebase setup documented in [chat-push.md](chat-push.md). Automated transport tests and simulator UI checks cannot confirm OS delivery until that setup is complete.

## Verification

`supabase/tests/session-reviews.sql` creates isolated fixtures, exercises real hosted RPCs/RLS, and rolls everything back. It checks eligibility, time windows, rating bounds, idempotency, edit conflicts, attendance independence, per-occurrence averages, read states, role-specific preferences, host-only reports, moderation, republication, removal and alert deduplication.

Client schema and Expo transport tests run in `npm run verify`. The development-only `palla://sessions-preview/reviews` route uses the real presentation components with local fake records; it never posts account reviews. Optional `mode=organizer` and `state=loading|error|empty|save-error` parameters cover alternate states. For a connected app-navigation preview, open `palla://navigation-preview/player/profile` or `palla://navigation-preview/organizer/profile`: the header bell opens sample review notifications, the profile Notifications menu opens push preferences, and Back returns to the tabbed profile. The unread header dot uses a sample count in this development-only layout.

Native verification results are recorded in `docs/native-testing.md`. Successful preview submission verifies UI behavior; hosted rollback tests verify persistence/authorization separately. Live account-to-account review delivery and OS push delivery require a separately prepared session/account/device test.

### Session summary in the review sheet

A shared summary shows a compact court thumbnail, title, host, date and time above a divider and the rating question. Date/time use the session timezone, returned with starts_at by the existing authorized review-context RPC; there are no new tables or stored columns. The thumbnail is generic illustrative padel artwork until sessions have their own photos. Enlarged text stacks the summary so titles remain readable. Reviewed notifications use a compact neon pill with a dark checkmark. Removed reviews retain neutral text; expired unreviewed invitations open the explanation below.

### Expired invitations

An unreviewed invitation at or beyond its 14-day deadline opens the informational Review period ended sheet. It explains the writing/editing limit, names the session and closing date, and offers Got it / close; no rating controls or comment input appear. Inbox text no longer includes Review window closed. The inbox checks the deadline on tap independently of cached eligibility; the live review controller also checks the authorized context, covering notification push links. Existing authored reviews remain viewable/removable after their edit deadline, and host received reviews remain available. No database changes are required.
