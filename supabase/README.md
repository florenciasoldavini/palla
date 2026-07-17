# Supabase

Palla uses Supabase for authentication, PostgreSQL, Row Level Security, Realtime, Storage, and Edge Functions.

The imported foundation contains only the reusable user profile/auth bootstrap, its owner-scoped avatar storage policies, and the welcome-email workflow. It does not contain Palla session, registration, cancellation, waitlist, attendance, payment, notification, or review tables.

Add product schema through feature-specific migrations only when each feature is implemented. Every table in an exposed schema must enable RLS and include authorization tests.

Client applications use only the public project URL and publishable key. Secret keys, service-role credentials, email credentials, paid-provider credentials, and privileged workflows must remain in trusted server environments.
