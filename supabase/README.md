# Supabase

Palla uses Supabase for authentication, PostgreSQL, Row Level Security, Realtime, Storage, and Edge Functions.

The onboarding migration defines `profiles`, `organizers`, and the transactional `complete_onboarding` RPC. It has been applied to the connected Palla project. See `docs/onboarding.md` for the UI integration status. The retained welcome-email function source uses profiles but is not deployed or invoked automatically.

Authorization regression checks are in `tests/onboarding.sql`; run them only against a disposable local/development database. They create fixtures inside a transaction and roll them back.

Add further product schema through feature-specific migrations only when each feature is implemented. Every table in an exposed schema must enable RLS and include authorization tests.

Client applications use only the public project URL and publishable key. Secret keys, service-role credentials, email credentials, paid-provider credentials, and privileged workflows must remain in trusted server environments.
