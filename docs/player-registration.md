# Joining a session

The public detail’s native Join session action reserves one confirmed place in the selected occurrence. It uses the existing registrations table; no payment, attendance mark, new notification type or waitlist enrollment is introduced.

Signed-out viewers go to sign-in and incomplete profiles go to onboarding. Joining requires a completed profile, a published public future occurrence, an active host and venue, an open registration window, capacity, and a matching known category when strict category enforcement is enabled. Organizer mode does not prevent a person joining another host’s session. Hosts cannot register in their own session. Gender policy remains displayed guidance: profiles do not currently store gender, so there is no automatic gender verification.

`public.join_session(uuid)` delegates to a private, narrowly authorized function. The player is always derived from `auth.uid()`, never from a submitted player ID. It locks the occurrence before reading/updating registration rows, matching existing capacity and roster write ordering. Duplicate requests return the same active registration, including an existing waitlist entry without promotion. A player may rejoin a self-cancelled entry if still eligible; host-removed entries cannot be reopened by the player. Direct registration inserts/updates remain unavailable to clients.

The native action shows a loading state, blocks repeat taps, updates the account-scoped public detail only after confirmation, then refreshes public detail, organizer inventory/roster and dashboard queries. Errors explain capacity races, closed windows, category restrictions and connection failures. A lost-response retry does not reserve twice. Design previews remain no-write and explicitly explain that a published occurrence is needed.

Migration: `20261021151952_player_session_registration.sql`. Rollback-only authorization and business-rule tests: `supabase/tests/player-session-registration.sql`. Service tests validate response parsing and readable error mapping. Native QA and cleanup are recorded in `docs/native-testing.md`.

## Cancelling a confirmed place

Registered players see an outlined danger Cancel registration action while cancellation is allowed, even when registration is closed or the session is full. A shared bottom sheet asks for confirmation and offers Keep my place. Past the cutoff it shows Cancellation closed; started/completed/cancelled sessions do not expose an active cancellation action.

The authenticated cancel RPC locks the occurrence before the caller’s registration, soft-cancels only their confirmed place, records the caller/time and clears attendance marks. Deadline checks use the server clock after locking. A retry after an already completed cancellation is harmless. Existing automatic waitlist promotion still executes and the returned occupancy includes promoted players. Manual queues retain their existing host-managed behavior. The UI refreshes registration, occupancy, roster, waitlist and dashboard queries after the result.

Migration: `20261021155411_player_registration_cancellation.sql`. Database regressions: `supabase/tests/player-registration-cancellation.sql`. Client eligibility and result/error parsing tests live beside the cancellation service.
