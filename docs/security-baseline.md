# Security baseline

- Store only public Supabase publishable credentials in Expo environment variables.
- Keep service-role keys and third-party secrets in server-side secret stores.
- Enable and test RLS for every exposed table.
- Scope policies to the authenticated user or an explicit trusted relationship.
- Never authorize from editable user metadata.
- Validate Edge Function inputs and enforce rate or spending limits before paid provider calls.
- Keep `.env.local`, generated native projects, and deployment metadata out of Git.
