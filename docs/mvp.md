# Palla MVP

Palla helps organizers run recurring social padel sessions and helps players discover and join them. Organizers arrange courts and payment with clubs outside Palla. Palla manages player participation, not court reservations.

## Agreed product boundaries

- Everyone has one account and one profile. Organizing is an additional capability; an organizer can also join another organizer's sessions.
- Unauthenticated explorers can browse published sessions and shared links. Joining requires authentication.
- A venue is a shared club/location. Multiple organizers may host sessions there, including at the same time on different courts.
- Organizers may use multiple venues. Creating a venue does not confer ownership of the club or authority over another organizer's sessions.
- Palla tracks player capacity and waitlists. It does not check court availability or enforce venue/time exclusivity.
- The directory grows from locations used by organizers. It does not require manually entering every club in Buenos Aires.

## MVP flows

1. An organizer creates a weekly series with a venue, schedule, timezone, level range, capacity, price, and cancellation policy.
2. The series generates individual dated sessions. Each occurrence has its own participants and availability.
3. A player opens discovery or a shared session link, checks the details, and signs in to join.
4. Joining confirms a place if capacity is available; otherwise the player joins a first-come waitlist.
5. A player cancels before the deadline. The next eligible waitlisted player is automatically promoted and notified.
6. An organizer views participants and waitlists, and cancels one occurrence or future occurrences with confirmation.
7. Email communicates confirmations, cancellations, promotions, and reminders.

The acceptance scenario is a weekly session filling up, an additional player joining the waitlist, a confirmed player cancelling, and the next player receiving the place and an email.

## Venue selection

Google Places is a candidate discovery provider, not an implemented integration. Organizers search for a club and select it; Palla retains its Place ID as a shared reference. Organizers can also add a missing location with a name and address.

Persist only references and organizer-supplied information initially. Fetch Google-derived display details through a platform adapter. Review current Google pricing, attribution, caching, and storage terms before choosing the integration. Do not copy the provider's directory or assume all place details may be retained indefinitely.

An existing venue must be suggested before creating another. Place IDs should be unique; manually added locations need duplicate review. Shared address changes can affect many sessions, so the MVP should route corrections through a trusted operation rather than let any organizer overwrite shared data.

## Proposed implementation choices

These choices support the agreed scope but still need validation with users:

- Weekly recurrence only, one organizer per series.
- Organizer access assigned through a trusted admin operation; no self-assigned access.
- Self-reported Argentine categories 8va–1ra, plus separate beginner, unknown, and non-playing answers. Lower numbers indicate stronger play. See onboarding.md.
- Prices represent the amount per player; payment happens externally.
- Joining and waitlist promotion close at the registration deadline. Player cancellation closes at its cancellation deadline. Organizer cancellation remains possible afterward.
- Rejoining after cancellation places a player at the end of the waitlist when full.
- Generate a bounded horizon of occurrences, not an infinite series. Choose the horizon during recurrence implementation.
- Changes to future occurrences require explicit scope selection. Existing registrations must be considered before reducing capacity or changing time, venue, or price.

## Deferred features

Court reservations and inventory, payments/refunds, chat, rankings, automatic team matching, complex recurrence, club ownership verification, and extensive analytics are outside the first MVP.

## Quality expectations

Support iOS, Android, and web with consistent tokens and reusable components. Complete loading, empty, error, success, full-session, waitlist, and cancellation states. Public links should land on session details before authentication, then preserve the intended join destination.

Verify keyboard and screen-reader behavior on web, native accessibility, large text, reduced motion, and real device interactions. A successful build does not establish visual quality or backend authorization correctness.

## Implementation status

Existing code supplies an auth/profile bootstrap, design tokens and shared UI, and sample discovery/dashboard screens. The contracts in `src/features/*/domain.ts` describe the future product model; they are not wired to screens or deployed tables. The existing `User` model and profile forms remain in use until a deliberate migration to `profiles` is implemented.

See [the domain and database plan](domain-model.md) for persistence constraints, access rules, and migration order.
