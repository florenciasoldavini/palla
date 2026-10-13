# Architecture

Palla uses feature-first boundaries on top of Expo Router. `src/app` contains route adapters only. Feature-owned screens under `src/features` compose shared UI and keep workflows, validation, and data access inside their domain boundary.

Server state belongs in TanStack Query. Form state belongs in React Hook Form. Shared local global state should only be introduced when a concrete cross-screen client-state requirement appears.

The Supabase browser/native client is an untrusted public client. Row Level Security is the authorization boundary, and Edge Functions own privileged workflows.

## Native validation

Palla targets iOS and Android. UI and end-to-end flow acceptance requires the native app in both iOS Simulator and Android Emulator. Browser testing is not part of normal project validation. Report blocked platforms explicitly; passing unit tests or producing a bundle is not simulator verification. See AGENTS.md for the durable testing rules.
