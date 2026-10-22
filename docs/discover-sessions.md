# Discover sessions

Discover reads live public occurrences through `discover_sessions_ranked` (older RPC signatures remain compatible). It does not expose draft series, private occurrences, roster identities or unpublished venues/organizers. The private implementation and public security-definer entry point use an empty search path and an explicit field projection. Base-table RLS stays unchanged. Anonymous access is intentional, matching public session details; Supabase's definer advisories are expected for this narrow public API ([advisory](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)).

## Eligibility and filters

Only future published sessions at active venues, hosted by active organizers, whose registration window is open appear. The default includes open confirmed places, available waitlist places, and the viewer's own confirmed/waitlisted or hosted public sessions. Full sessions can be included explicitly with All sessions. Category matches the session's allowed categories; it does not assert that the viewer passes strict registration checks.

Search matches literal session titles and venue names. Location matches saved venue names/addresses and is remembered locally; this first version has no structured city or radius search. Filters combine date/date range, category, morning (before noon), afternoon (noon–18:00), evening (18:00 onward), and availability. Dates/times follow the occurrence's series timezone, defaulting to Buenos Aires. The date picker currently follows the app's Buenos Aires convention.

The chronological response is bounded to 500 results. A visible notice asks users to narrow their search if more match. No silent pagination or invented recommendations. Starting soon means the next three hours (first six in the carousel, all via See all); Available today covers the remainder of the local day; Upcoming covers later days. These sections do not duplicate occurrences. Search and explicit filters show one chronological list.

Cards use existing session covers and venue Google Maps photo fallback with required credits; a neutral placeholder appears when no photo exists. They show real price, category and availability or the viewer's Registered/Waitlisted/Hosting status. Card taps open the existing public occurrence detail. Registration/cancellation and organizer session changes invalidate discovery. Focus, foreground return, polling and pull-to-refresh update inventory.

## Header and map control

Discover replaces the shared header wordmark with the current location selector; it opens the existing location sheet. Other tabs retain the Palla wordmark and notification button. The map/list switch is a 56-point circular icon-only button with explicit accessible labels. List and map show the same reusable search bar and filter chips, backed by the same search draft and applied filters. Map view fills the full width and height between the navigation header and bottom tabs. The search bar and horizontally scrolling filter chips float over the map at the top; the circular Map/List button floats at the bottom right above the map credits. Camera padding follows the measured controls so markers stay clear of them. Map view omits the extra section heading and Edit filters action.

## Map

The Map button switches the same search into a native WebView containing the existing minimal MapLibre/OpenFreeMap street style. The list stays mounted so its scroll position survives switching views. Markers group matching occurrences by venue; tapping selects that venue’s first matching occurrence in a compact, swipeable card carousel. Cards show a side image, availability over the photo, title, venue and schedule with icons, a text-only category chip, and price. Swiping updates the highlighted marker and camera; tapping a card opens public details. The List toggle and camera padding move above the measured carousel height. Android Back dismisses the selected cards. The circular List toggle returns to the accessible session list. Details navigation remains the existing public session route.

Venue latitude/longitude are stored on `venues` with the matched address and timestamp, and included in both discovery and public-detail responses. Browsing never calls an address-geocoding provider. The publishing service looks up missing coordinates through the existing Photon adapter, requiring a matching street and house number (and city when returned), and accepts no street/city centroid. Provider failure does not block publishing. Stored pairs are reused; only an active creator can fill a missing pair through the private publishing helper, existing pins cannot be overwritten, and changing the address clears stale coordinates. Unlocated venues remain available in the list and public detail retains Open in Maps. Map-tile failures have a retry state; a slow map times out after 25 seconds. No location permission requests.

Panning exposes Search this area. Applying it filters the shared result set to venues with saved coordinates within those bounds; Changing filters, or using Clear filters in list view, clears the map area. This initial implementation searches the already fetched, bounded results, with the same result-limit notice; it is not a server-side geospatial index.

## Verification

- `supabase/tests/discover-sessions.sql`: rollback-only fixtures using the two existing QA accounts; public/private, started/cancelled/completed, open/closed registration, full/waitlist capacity, category/search/availability, own registration, host visibility, chronology and no roster leakage.
- `src/features/discovery/domain.test.ts`: exact deadline boundaries, disjoint local-date grouping, registration/waitlist status and antimeridian bounds.
- Native development states: `palla://sessions-preview/discovery?state=loading`, `state=error`, `state=empty`, `state=unlocated`. Fixtures use the real presentation components and make no account writes. Preview navigation into fake occurrence IDs is disabled.
- `palla://navigation-preview/player/home` shows read-only sample discovery results with the real location header and bottom navigation, including map view. These UI fixtures carry coordinates in the same session shape as the database and use a bundled court image; live cards retain the existing cover/Google venue-photo fallback and credits.
- Live native runs and device details are recorded in `docs/native-testing.md`.

## Coordinate verification

`supabase/tests/venue-coordinates.sql` rolls back all writes and verifies publishing, public coordinate projections, range/pair constraints, address-change invalidation, creator-only enrichment and non-overwrite behavior. The only existing connected-project venue is a QA address; Photon returned no results, so it was left unresolved. The new columns and private publishing helper are deployed. Geocoding remains address-derived rather than a host-confirmed court entrance; manual pin editing is a separate future feature.

Court roof coverage is stored separately from amenities. Discovery returns the occurrence’s `court_coverage` (`covered`, `uncovered` or NULL) and the venue’s available choices. See [court coverage](court-coverage.md) for publishing and snapshot behavior; an empty venue choice list means unspecified.

### Advanced filters

The shared **More filters** sheet supports an inclusive min/max price per player (ARS), Covered/Uncovered, gender policy, session inclusions and venue facilities. Blank bounds mean any price; maximum `0` finds free sessions. Decimal commas and dots are accepted; negative/reversed/overflowing bounds are rejected before applying. Larger text stacks price inputs vertically. A fixed Apply/Reset footer remains usable with the keyboard; validation errors are repeated there if the price fields have scrolled away.

Changes stay local until Apply. Closing/back discards the draft. Reset clears only the advanced draft, while the page's Clear filters clears every filter except location. List and map use the same applied state and query; changing filters clears the previous map area/selection.

`discover_sessions_filtered` applies all predicates **before** the 500-result limit. The original seven-argument RPC delegates to the same private core, preserving installed-client behavior. The public wrapper intentionally uses a restricted security-definer projection for unauthenticated discovery, with an empty search path; the private core and base tables stay inaccessible. Its security-advisor public-execution warning is expected for this public API.

Coverage uses the actual occurrence's `court_coverage`; unknown values do not match an explicit roof filter, even when the venue offers both. “Any gender” does not filter; “All genders” matches that policy exactly. All selected attributes must match; `new_balls` also satisfies `balls_provided`. Venue facilities are correlated to **both the session's organizer and venue**, so another host's claims cannot satisfy a filter. Price bounds also require matching currency. These filters do not override registration eligibility.

Regression: `supabase/tests/discovery-advanced-filters.sql` rolls back all fixtures and tests price boundaries, currencies, coverage, gender, all-of attributes, host-specific amenities, invalid input, combined filters, private-core grants, pagination-before-filter regressions and legacy RPC compatibility. `advanced-filters.test.ts` verifies price parsing and active-filter state.

## Sorting

The shared filter row includes an anchored **Sort** menu: Soonest (default), Lowest price and Nearest to me. Soonest retains the chronological discovery sections. Other sorts show one ranked list; the screen preserves server order instead of regrouping it chronologically. Map markers still group by venue, but the swipeable cards retain the global result order across venues. Time and occurrence ID break price/distance ties deterministically; free sessions sort first by price (the current database supports ARS).

`discover_sessions_ranked` filters and sorts **before** the 501-candidate/500-result page and JSON aggregation. Both previous RPC signatures delegate to the same private core with Soonest. The same published/public/open-registration projection, active organizer/venue checks, grants and base-table privacy remain. Anonymous security-definer execution is intentional for this narrow public-discovery endpoint ([advisor rationale](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)).

Nearest requests a single foreground device location only after that option is selected. It uses a recent fix (at most 60 seconds old, within 1 km reported accuracy) or requests a GPS-capable foreground fix without prompting to enable network location accuracy, with a 20-second UI timeout. Denial, disabled services or failure leave the previous sort active and show an actionable inline message. Choosing another sort ignores any pending location response. The origin stays in memory/query state, is sent to the RPC to calculate straight-line great-circle distance, and is not saved to a user or venue record. Selecting Nearest again refreshes the origin; there is no continuous/background tracking.

Existing city/search/date/attribute filters still apply; selecting Nearest does not change the chosen search area or impose a radius. Venues without coordinates appear last, with `distance_m=null`. Invalid/incomplete origins or Nearest without an origin are rejected by the RPC. Current results and filter drafts remain intact while locating; loading/error feedback is shared by the list and map controls.

Regression: `supabase/tests/discovery-sorting.sql` verifies ranking, free sessions, distance calculation, missing coordinates, deterministic ties, ranking with filters, invalid inputs, private-core permissions, legacy compatibility and cheapest/nearest results beyond the first 500 chronological sessions. `discovery-location.service.test.ts` checks valid/invalid fixes, permission failures and timeout handling. Native presentation fixtures use `rankPreviewSessions` only for QA; production sorting is always database-side.
