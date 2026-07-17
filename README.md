# Palla

Mobile-first platform for discovering, organizing, and joining recurring social padel sessions (canchas abiertas).

The application supports iOS, Android, and static web output from the same Expo Router foundation.

## Foundation

- Expo SDK 54, React Native, TypeScript, and Expo Router
- Supabase Auth, PostgreSQL, RLS, Realtime, Storage, and Edge Functions
- TanStack Query for server state
- React Hook Form and Zod for forms
- NativeWind and Gluestack-based reusable UI primitives
- SecureStore-backed native sessions
- Expo Notifications, Sentry, and PostHog dependencies
- Vitest-ready unit testing and Supabase database test structure
- EAS build profiles, Vercel static web output, environment synchronization, CI, ESLint, and Prettier

Product-specific session features and database tables are intentionally not implemented yet.

## Requirements

- Node.js 22+
- npm 10+
- Expo Go for the first local run

## Setup

```bash
npm install
cp .env.example .env.local
npm run env:check
npm start
```

Use `npm run ios`, `npm run android`, or `npm run web` for a platform-specific development target.

## Verification

```bash
npm run verify
```

The verification pipeline checks environment documentation, TypeScript, linting, unit tests, formatting, and the static web export.

## Architecture

- `app/` contains Expo Router routes only.
- `features/` owns feature components, hooks, repositories, services, validation, and types.
- `components/` contains genuinely reusable UI primitives.
- `screens/` composes feature and shared UI for routes.
- `lib/` contains configured infrastructure clients.
- `repositories/` owns shared external transport and persistence helpers.
- `services/` owns cross-feature workflows.
- `supabase/` contains Edge Functions, migrations, and database tests.

Routes are separated into `(auth)`, `(player)`, and `(organizer)` groups. Business logic must remain outside route files.

## Environments

Development, preview, and production values are described in `env-sync.config.json`. `.env.local` is ignored and remains the local source of truth. Regenerate `.env.example` with `npm run env:example`.

No production Supabase, EAS, Vercel, Sentry, or PostHog project identifiers are committed.
