# Discover sessions

Discover reads live public occurrences through `discover_sessions`. It does not expose draft series, private occurrences, roster identities or unpublished venues/organizers. The private implementation and public security-definer entry point use an empty search path and an explicit field projection. Base-table RLS stays unchanged. Anonymous access is intentional, matching public session details; Supabase's definer advisories are expected for this narrow public API ([advisory](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)).

## Eligibility and filters

Only future published sessions at active venues, hosted by active organizers, whose registration window is open appear. The default includes open confirmed places, available waitlist places, and the viewer's own confirmed/waitlisted or hosted public sessions. Full sessions can be included explicitly with All sessions. Category matches the session's allowed categories; it does not assert that the viewer passes strict registration checks.

Search matches literal session titles and venue names. Location matches saved venue names/addresses and is remembered locally; this first version has no structured city or radius search. Filters combine date/date range, category, morning (before noon), afternoon (noon–18:00), evening (18:00 onward), and availability. Dates/times follow the occurrence's series timezone, defaulting to Buenos Aires. The date picker currently follows the app's Buenos Aires convention.

The chronological response is bounded to 500 results. A visible notice asks users to narrow their search if more match. No silent pagination or invented recommendations. Starting soon means the next three hours (first six in the carousel, all via See all); Available today covers the remainder of the local day; Upcoming covers later days. These sections do not duplicate occurrences. Search and explicit filters show one chronological list.

Cards use existing session covers and venue Google Maps photo fallback with required credits; a neutral placeholder appears when no photo exists. They show real price, category and availability or the viewer's Registered/Waitlisted/Hosting status. Card taps open the existing public occurrence detail. Registration/cancellation and organizer session changes invalidate discovery. Focus, foreground return, polling and pull-to-refresh update inventory.

## Header and map control

Discover replaces the shared header wordmark with the current location selector; it opens the existing location sheet. Other tabs retain the Palla wordmark and notification button. The map/list switch is a 56-point circular icon-only button with explicit accessible labels. List and map show the same reusable search bar and filter chips, backed by the same search draft and applied filters. Map view fills the full width and height between the navigation header and bottom tabs. The search bar and horizontally scrolling filter chips float over the map at the top; the circular Map/List button floats at the bottom right above the map credits. Camera padding follows the measured controls so markers stay clear of them. Map view omits the extra section heading and Edit filters action.

## Map

The Map button switches the same search into a native WebView containing the existing minimal MapLibre/OpenFreeMap street style. The list stays mounted so its scroll position survives switching views. Markers group matching occurrences by venue; tapping selects that venue’s first matching occurrence in a compact, swipeable card carousel. Cards show a side image, availability over the photo, title, venue and schedule with icons, a text-only category chip, and price. Swiping updates the highlighted marker and camera; tapping a card opens public details. The List toggle and camera padding move above the measured carousel height. Android Back dismisses the selected cards. The circular List toggle returns to the accessible session list. Details navigation remains the existing public session route.

Saved venue addresses are resolved through the existing Photon adapter only when map view opens, with two concurrent lookups and a shared per-address query cache. Address geocoding is approximate. Unresolved addresses remain available in the list. Provider failures have a retry state; a slow map times out after 25 seconds. No fake pins or location permission requests.

Panning exposes Search this area. Applying it filters the shared result set to resolved venues within those bounds; Changing filters, or using Clear filters in list view, clears the map area. This initial implementation searches the already fetched, bounded results, with the same result-limit notice; it is not a server-side geospatial index.

## Verification

- `supabase/tests/discover-sessions.sql`: rollback-only fixtures using the two existing QA accounts; public/private, started/cancelled/completed, open/closed registration, full/waitlist capacity, category/search/availability, own registration, host visibility, chronology and no roster leakage.
- `src/features/discovery/domain.test.ts`: exact deadline boundaries, disjoint local-date grouping, registration/waitlist status and antimeridian bounds.
- Native development states: `palla://sessions-preview/discovery?state=loading`, `state=error`, `state=empty`. Fixtures use the real presentation components and make no account writes. Preview navigation into fake occurrence IDs is disabled.
- `palla://navigation-preview/player/home` shows read-only sample discovery results with the real location header and bottom navigation, including map view. These UI fixtures use fixed sample coordinates and a bundled court image; live cards retain the existing cover/Google venue-photo fallback and credits.
- Live native runs and device details are recorded in `docs/native-testing.md`.
