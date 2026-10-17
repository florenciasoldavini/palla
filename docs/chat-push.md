# Chat push notifications

**Status: pending setup and end-to-end delivery testing on both platforms (2026-10-15).**

Tracking issue: [#7 — Finish chat push setup and verify delivery on iOS and Android](https://github.com/florenciasoldavini/palla/issues/7).

The implementation and backend exist, but actual push delivery must not be marked complete until Apple/Firebase setup, native builds, and the acceptance checklist below are finished. The current Expo Go simulators can test normal chat; they do not test this push integration.

Palla's intended behavior is to send an OS notification for a new direct message. Individual conversation muting is not included. This is separate from the notifications-bell screen, which still contains the deferred session-update placeholder.

## Behavior

- A native Palla development/production build asks for notification permission after authenticated onboarding and the splash screen finish. Denial leaves chat usable; permission is not repeatedly requested when the OS disallows asking again. Returning from Settings refreshes permission and token registration.
- Each installation has a SecureStore UUID. Its Expo push token belongs to the currently authenticated account and is stored in a private database table. Several devices can receive messages for the same account, with a cap of20 installations.
- Alerts show the sender’s saved profile name as the title and a message preview as the body, matching the approved mockup: **Carlos M. — Perfect, see you at the club! 🎾** The OS displays the app name Palla separately. Names and previews can appear on the lock screen when system preview settings allow it; this release adds no app-specific preview toggle.
- Sender names and message text come from trusted database records at delivery claim time, so the recipient’s name is not used accidentally and an unsent draft is never included. The worker collapses line breaks/control characters and bounds names to60 graphemes/256 UTF-8 bytes and previews to180 graphemes/768 bytes, with an ellipsis when shortened. Emoji clusters remain intact. Missing/blank content falls back to **New message — Sent you a message.**
- In the foreground, the currently open conversation suppresses the banner and sound. Incoming messages elsewhere can show a banner. A message read before the worker claims it is skipped. Presence alone does not suppress alerts.
- Tapping an alert opens its conversation only after authentication, onboarding and a fresh membership lookup. Routing data contains typed IDs, never an arbitrary navigation URL; names and preview text are sent only in the alert title/body. Duplicate response handling is guarded; an offline lookup retains the response for a later foreground retry.
- Signing out disables this installation before its authenticated session is discarded and clears local delivered alerts. Registration and sign-out are serialized. If server cleanup fails, sign-out stays pending until the user retries with a connection; the profile shows a friendly error. A notification already handed to APNs/FCM cannot be recalled.
- Expo Go is explicitly excluded from registration and notification listeners on both platforms. It can continue to run normal chat. Web is also excluded.

## Notification icon assets

The supplied Palla icon set is configured in `app.json`. iOS uses the cream racket/P and lime-ball app icon on Court Green. Android uses the white transparent `assets/images/app-icons/palla-notification-icon.png` mask, with the existing lime notification tint. Source/normalization details are in `assets/images/app-icons/README.md`.

These replace the placeholder assets used during early implementation; the mockup’s letter-P icon was illustrative. A new native build is required to see the supplied icons. Native notification appearance still remains pending on both platforms alongside the delivery checklist below.

## Backend

`private.chat_push_devices` stores installation, owner, token, platform, enabled flag and renewal time. `private.chat_push_jobs` stores a unique message/installation job, recipient and destination snapshot, state, attempt count, provider ticket, retry time and bounded error code. Both tables have RLS, no client table grants, and a service-role policy. Authenticated registration/revocation RPCs use the trusted `auth.uid()` and completed profile. Device tokens are not returned to other users.

A message INSERT transaction creates jobs only for the recipient's currently enabled devices. Edits, reactions and retries of the same persisted message do not create additional jobs. New jobs wake `chat-push` using pg_net; a minute cron sweep recovers missed wakeups and retries. No registered devices means no delivery jobs or outbound Expo requests. Claims join the message sender’s profile and current persisted message body; names/text are not copied into queue tables or logged by the worker.

The Edge Function accepts only its Vault credential, checked by a service-role-only RPC before any work is claimed. The client cannot invoke the delivery APIs. The private credential never enters app configuration. `supabase/config.toml` preserves this custom authentication on future CLI deployments.

Claims use row locks, a two-minute lease and an attempt number to reject stale completions. Each pass handles at most100 sends and100 receipt checks. Transport failures and rate limits retry up to five sends. Provider tickets are not proof of device delivery; receipts are checked after15 minutes, and `DeviceNotRegistered` disables only the matching token/owner snapshot. Missing receipts retry until daily cleanup retires old receipt jobs. Pending sends expire after24 hours; daily cleanup retains at most seven days of job history and disables devices inactive for60 days. Ambiguous transport failures can result in an additional OS alert on retry; exactly-once delivery is not promised. Push delivery does not change chat's delivered/read check marks.

The scheduler endpoint is stored as `chat_push_function_url` in Vault during deployment; `chat_push_worker_secret` is generated inside PostgreSQL. The worker uses Supabase's server-only service role. Optional `EXPO_ACCESS_TOKEN` supports Expo Enhanced Push Security. Do not place any of these secrets in Expo public variables.

## Activation still required

The database migrations, worker and schedules are deployed to Palla. The hosted worker was checked with an empty queue (HTTP200), and unauthenticated requests return401. **Actual APNs/FCM delivery is not activated or verified:** no Apple Developer membership, Firebase app/credentials, or push-capable Palla build is available yet. There are currently no registered push devices.

- [ ] Create a Firebase project for Palla (the existing Palla Google Cloud project can be used), then register the Android app as `com.florenciasoldavini.palla`. Download its `google-services.json`; keep it outside version control. Provide its path as `GOOGLE_SERVICES_JSON` locally, or as an EAS file environment variable for each native build environment. The generic environment-sync script does not upload file variables.
- [ ] Configure Firebase Cloud Messaging v1 credentials through Palla's EAS credentials settings. Upload the Firebase service-account credential there, never to the client source or public environment variables.
- [ ] Enroll in Apple Developer, then configure Palla's iOS signing and APNs push key through EAS. The bundle ID is `com.florenciasoldavini.palla`. Developer membership and credential creation require the account owner's participation.
- [ ] Prefer enabling Enhanced Push Security on the existing Expo project `96d4f9c0-039c-4a09-9e0a-1626afbcf9cd`. Store the associated Expo access token as the server-only `EXPO_ACCESS_TOKEN` Supabase Function secret. Recheck the worker after enabling this so requests are not rejected by Expo.
- [ ] Build/install Palla development builds with the existing `development` EAS profile. Native notification configuration requires a new binary. Use physical iOS and Android devices for the final SDK54 delivery acceptance run; simulator smoke checks do not establish remote push delivery.
- [ ] Sign into two disposable accounts and allow notifications. Verify foreground other-chat alert, same-chat suppression, background delivery, terminated-app tap, correct account routing, denial/Settings recovery, sign-out cleanup, and subsequent token renewal. Confirm no notification is generated for your own outgoing message or an edit/reaction. Check tickets and receipts without logging tokens or message bodies.

References: [Expo SDK54 Notifications source](https://github.com/expo/expo/blob/sdk-54/docs/pages/versions/v54.0.0/sdk/notifications.mdx), [Expo push setup](https://docs.expo.dev/push-notifications/push-notifications-setup/), [FCM credentials](https://docs.expo.dev/push-notifications/fcm-credentials/), [Supabase scheduling](https://supabase.com/docs/guides/functions/schedule-functions).

## Native delivery acceptance — still pending

Run these checks after setup, using Palla development builds and two disposable accounts. Record each platform separately; passing automated tests or simulator navigation does not complete these checks. Simulator/emulator checks can supplement the run, but final APNs/FCM delivery requires physical-device evidence for both platforms.

| Check                                                                                                | iOS     | Android |
| ---------------------------------------------------------------------------------------------------- | ------- | ------- |
| Permission allowed registers the correct account; denial leaves chat usable                          | Pending | Pending |
| Enabling permission later in Settings registers the device without repeated prompts                  | Pending | Pending |
| Sender name and message preview match the saved message; long/emoji previews remain readable         | Pending | Pending |
| OS lock-screen preview/privacy settings are honored                                                  | Pending | Pending |
| Other-screen/chat foreground alert appears; the open chat suppresses banner and sound                | Pending | Pending |
| Incoming message arrives while backgrounded and while terminated                                     | Pending | Pending |
| Notification tap opens the right chat after cold start and respects authentication/onboarding/access | Pending | Pending |
| Offline tap recovers after reconnect without duplicate navigation                                    | Pending | Pending |
| Sign-out, account switch, token renewal/reinstall and multiple devices retain the correct owner      | Pending | Pending |
| No alerts for own messages, edits, reactions or messages read before the worker claims them          | Pending | Pending |
| Actual Expo tickets/receipts, bounded retries and invalid-token cleanup are checked                  | Pending | Pending |
| Existing chat delivered/read checks keep their meaning                                               | Pending | Pending |

For each run, add the date, build/environment, device/OS, results and evidence to `docs/native-testing.md` and issue #7. Keep failures and blocked platforms explicitly unverified. Remove the pending status and close the issue only after both platforms pass. Individual chat muting and session notification feeds remain outside this follow-up.

## Verification and operational note

`supabase/tests/chat_push.sql` passes locally and against Palla in a rollback-only transaction: own-account registration, malformed/spoofed registration rejection, direct-token-table denial, worker denial for clients/anonymous users, bounded claims, receipts, read suppression and sign-out/account-switch cleanup. No fixture accounts, messages or fake device registrations remain. Automated client/worker tests cover payload validation, same-chat/other-account suppression, Expo Go exclusion, permission denial, registration/sign-out races, provider failure retry, invalid-device receipts, sender/preview payloads, whitespace/fallback handling and bounded Unicode previews.

The Supabase security advisor reports no new table/function authorization warnings. It does report that pg_net's extension metadata is in `public` (its HTTP objects are in `net`). Relocating this non-relocatable extension would require dropping/recreating it; automatic approval review rejected that optional infrastructure cleanup due to disruption risk. The extension remains in place and notification delivery does not depend on relocating it. Existing Places/Auth warnings are unchanged.
