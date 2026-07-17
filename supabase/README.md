# Supabase

Palla uses Supabase for authentication, PostgreSQL, Row Level Security, Realtime, Storage, and Edge Functions.

No database schema is defined yet. The welcome-email Edge Function is retained for future use and requires the eventual user profile schema to include a nullable `welcome_email_sent_at` timestamp.

Add product schema through feature-specific migrations only when each feature is implemented. Every table in an exposed schema must enable RLS and include authorization tests.

Client applications use only the public project URL and publishable key. Secret keys, service-role credentials, email credentials, paid-provider credentials, and privileged workflows must remain in trusted server environments.
