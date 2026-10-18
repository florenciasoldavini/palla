# Palla

Mobile-first platform for discovering, organizing, and joining recurring social padel sessions (canchas abiertas).

Palla targets native iOS and Android. The Expo foundation retains legacy web output, but browser use is not a product requirement.

## Foundation

- Expo SDK 54, React Native, TypeScript, and Expo Router
- Supabase Auth, PostgreSQL, RLS, Realtime, Storage, and Edge Functions
- TanStack Query for server state
- React Hook Form and Zod for forms
- NativeWind and Gluestack-based reusable UI primitives
- SecureStore-backed native sessions
- Expo Notifications and Sentry dependencies
- Vitest-ready unit testing and Supabase database test structure
- EAS build profiles, Vercel static web output, environment synchronization, CI, ESLint, and Prettier

Product-specific session features and database tables are intentionally not implemented yet.

## Product plan

- [Design system](docs/design-system.md)
- [MVP scope and decisions](docs/mvp.md)
- [Domain contracts and database plan](docs/domain-model.md)
- [Chat push setup and pending native delivery checklist](docs/chat-push.md) — tracked in [issue #7](https://github.com/florenciasoldavini/palla/issues/7)

Feature-owned `domain.ts` files contain TypeScript models and Zod record/input schemas. Account onboarding now uses the implemented `profiles` and `organizers` tables; session screens still use illustrative data. See [account onboarding](docs/onboarding.md) for setup and verification details.

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

Use `npm run ios` and `npm run android` for native development. Validate UI and flows on both iOS Simulator and Android Emulator. Do not substitute browser testing.

## Verification

```bash
npm run verify
```

The verification pipeline checks environment documentation, TypeScript, linting, unit tests, and formatting. Native UI/flow validation on both iOS Simulator and Android Emulator is required separately; passing this pipeline does not establish native behavior. See [native testing](docs/native-testing.md) for checks, evidence, and current blockers.

## Architecture

- `src/app/` contains Expo Router routes and layouts only.
- `src/features/` owns each feature's screens, components, hooks, repositories, services, validation, and types.
- `src/components/` contains genuinely reusable design-system, brand, and application-shell components.
- `src/infrastructure/` contains shared persistence and external-service adapters.
- `src/lib/` contains configured infrastructure clients.
- `supabase/` contains Edge Functions, migrations, and database tests.

Routes are separated into `(auth)`, `(player)`, and `(organizer)` groups. Route files adapt URLs to feature-owned screens; business logic remains outside the route tree.

## Environments

Development, preview, and production values are described in `env-sync.config.json`. `.env.local` is ignored and remains the local source of truth. Regenerate `.env.example` with `npm run env:example`.

No production Supabase, EAS, Vercel, or Sentry project identifiers are committed.

Profile overview and account-menu behavior: [docs/profile.md](docs/profile.md).
