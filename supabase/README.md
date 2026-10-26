# Supabase

Palla uses Supabase for authentication, PostgreSQL, Row Level Security, Realtime, Storage, and Edge Functions.

The onboarding migration defines `profiles`, `organizers`, and the transactional `complete_onboarding` RPC. It has been applied to the connected Palla project. See `docs/onboarding.md` for the UI integration status. The retained welcome-email function source uses profiles but is not deployed or invoked automatically.

Authorization regression checks are in `tests/onboarding.sql`; run them only against a disposable local/development database. They create fixtures inside a transaction and roll them back.

Add further product schema through feature-specific migrations only when each feature is implemented. Every table in an exposed schema must enable RLS and include authorization tests.

Client applications use only the public project URL and publishable key. Secret keys, service-role credentials, email credentials, paid-provider credentials, and privileged workflows must remain in trusted server environments.

## Session reviews and notification inbox

The October 19 review migrations add automatic completion, review/report moderation RPCs, the private notification catalog/preferences/inbox and push queue, query indexes, and session timing in review context. Their filenames match the versions already applied to the connected Palla project:

- `20261019140758_session_reviews_and_notification_inbox.sql`
- `20261019142014_review_query_indexes.sql`
- `20261019161330_review_session_summary.sql`

For another environment, apply the migrations in order and deploy the updated `chat-push` Edge Function (including `review-worker.ts` and its `deno.json`). It shares the existing worker authentication/secrets and installation registry; no new client environment variables are required. The review completion/invitation cron runs every five minutes, and the existing worker schedule dispatches both chat and review queues.

The connected project already has these migrations and the updated worker. The rollback-only `tests/session-reviews.sql` and `tests/chat_notification_preferences.sql` cover the new RPC/RLS boundaries and preserve the previous chat opt-out API. See [session reviews](../docs/session-reviews.md) for behavior and [push setup](../docs/chat-push.md) for provider activation and remaining live delivery testing.

## Session announcements

Apply `20261019174936_session_announcements.sql` and `20261019180014_announcement_message_validation.sql`, then deploy `session-announcements` (JWT verification on) and redeploy `chat-push` including `review-worker.ts` and `deno.json`. The existing worker secret/cron, installation registry, notification queue and preference catalog are reused. No new environment variables. See [session announcements](../docs/session-announcements.md) for audience, history, removal and delivery rules. Run the rollback-only `supabase/tests/session-announcements.sql` and existing review tests after deployment.

Session cancellations add the private event/recipient notification foundation and a structured reason code on sessions. Apply the cancellation migrations and redeploy `chat-push` with `index.ts`, `worker.ts`, `review-worker.ts` and `deno.json` (explicit import-map path). Keep the existing custom worker-secret authorization. No new environment variables or schedules are required. The application only calls single-occurrence cancellation, while backend future-scope compatibility remains. See [cancellation behavior and QA](../docs/session-cancellations.md).
