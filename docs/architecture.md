# Architecture

Palla uses feature-first boundaries on top of Expo Router. Route files are adapters that select screens; screens compose features; features own business workflows and data access.

Server state belongs in TanStack Query. Form state belongs in React Hook Form. Shared local global state should only be introduced when a concrete cross-screen client-state requirement appears.

The Supabase browser/native client is an untrusted public client. Row Level Security is the authorization boundary, and Edge Functions own privileged workflows.
