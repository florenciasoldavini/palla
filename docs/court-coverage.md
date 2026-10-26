# Court coverage

Coverage describes a roof over the court, independently of indoor/outdoor classification. The only choices are `covered` and `uncovered`.

## Venue and session data

`venues.court_coverage` is an array containing either choice or both. An empty array means Not specified; existing venues start empty. Both choices represent a venue with both court types, not a third court type. `sessions.court_coverage` and `session_series.court_coverage` are nullable single choices. NULL means unknown, never uncovered.

Publishing at a venue with one choice fills the session choice automatically. At venues with both, hosts must choose the court for that session. If venue details are unknown, a host may specify only their session's court or leave it unspecified. Drafts can retain an incomplete choice. Public and organizer session details and the publishing review show the occurrence's coverage. Discovery responses include both venue choices and actual occurrence coverage for future filtering.

A session stores a snapshot. Updating venue details does not rewrite other sessions or historical coverage. Editing one occurrence changes only that occurrence; a future edit updates the selected/future occurrences and the series template using the existing edit scope. Roof coverage does not itself implement cancellation penalties or reliability scoring.

## Editing and authorization

Only an active venue creator can edit the shared venue choices while publishing, with an optimistic baseline check to catch concurrent changes. Other organizers see saved venue details and can choose an available type for their own session. The narrow private helper leaves general venue UPDATE privileges blocked. Database constraints reject other values and duplicate choices, and the publisher rejects contradictory session/venue combinations. Older clients that omit coverage fields preserve an existing same-venue session choice, or derive a single known venue choice for a new session.

## Verification

`supabase/tests/court-coverage.sql` uses existing QA identities and rolls back all writes. It verifies creation, automatic single-type selection, mixed-venue validation, public/discovery projections, one/future edits, unchanged historical snapshots, optimistic concurrency, creator ownership, anonymous read access and blocked mutation. Unit tests cover unknown versus uncovered, allowed choices, incomplete drafts and publishing validation. Native read-only flow: `palla://sessions-preview/attributes?state=coverage`.
