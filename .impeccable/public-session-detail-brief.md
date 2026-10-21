# Public session detail

Approved first version: 20 October 2026. Native iOS/Android; public occurrence link uses the same read-only surface. Follow the original Stitch Session Details artboard `dfc7c50cb93b403badf0fa3d08569858` and the approved `public-session-stitch-faithful.html` conversation mockup. No new visual direction or concept round.

## Direction contract

THESIS: let a player understand one dated occurrence and share it, using the original full-bleed court-to-title composition instead of stacked white panels.
OWN-WORLD: existing Palla light lavender, Hanken Grotesk/Geist, olive icons, neon status/action, two white highlight cards, unboxed description and round player avatars.
STORY: image and venue → date/category/price → directions → joined places → description/host/policies → next action.
FIRST VIEWPORT: full-width illustrative court artwork fades into title/location; back/share overlays; two white highlight cards below. Booking bar stays reachable above the native safe area.
FORM: user-pinned Stitch composition; seed not applicable. Preserve actual saved values. Public links exclude drafts and private occurrences; hosts can inspect their own private occurrence. Anonymous viewers see counts, not player identities. Registration and saved sessions remain deferred; do not simulate a live booking or save.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Public session data goes through a narrow read RPC; no raw profile, registration, waitlist or attendance access. Existing generic court artwork remains illustrative, not a venue photo. Public HTTPS links use `/session?id=<occurrence UUID>` so Expo static hosting supports arbitrary new occurrences without rebuilding. Native deep links use the same `session` route.

## Finish disposition

Finish review: ship, 20 October 2026. Settled iOS and Android native captures confirm the approved hierarchy, protected status areas and persistent Back/Share glyphs. DESIGN.md and .impeccable/design.json retain the incumbent system; this is a feature extension, not a new visual direction. The sole reused raster is assets/images/sessions/court-artwork.jpg, the existing illustrative court artwork rather than an asserted venue photograph. Runtime validation and first-version limitations are recorded in docs/native-testing.md and docs/public-session-details.md.

Map direction, approved 20 October: use the **Frosted button** option from session-map-light-options.html. Center a light translucent action over a minimal pale lilac street map, with white roads, no labels/POI widgets and restrained attribution. The live implementation uses real OpenFreeMap vector streets and independent OSM address resolution, not a grayscale Google iframe. Keep the saved address below and gestures subordinate to the session scroll. iOS uses native blur; Android uses a stable translucent surface to avoid experimental blur affecting text clarity. Current native evidence and provider boundaries are recorded in docs/native-testing.md and docs/public-session-details.md.

Frosted implementation finish review: ship, with no material findings. Native normal/enlarged-text and unresolved/missing-address checks completed on both platforms; 200 tests pass. DESIGN.md and the shared design tokens remain unchanged.

Selected header revision: Clean stack. Contain the image with status badge, place title/venue below it, and consolidate date, time, duration, category and price into one summary card. Keep navigation in an opaque safe-area row and preserve the map/lower content. Verified normal and enlarged text on native iOS and Android.

Approved feedback extension, 20 October: implement review-overview-cards.html, preserving the existing header and host block. Use aggregate ratings from past public occurrences of this series, two white review cards, and a dedicated paginated full-list page. No tags or sample production data. Shared type/color/card/button primitives remain authoritative. No new raster assets. Finish review checks include native normal/enlarged text, feedback states, navigation, and SQL visibility/pagination assertions.

Feedback extension finish disposition: ship, 20 October. The implemented overview, distribution, white panel cards and bordered See all action retain the incumbent atoms and tokens. Native evidence includes ios-reviews-handoff.png, ios-reviews-large-overview.png, android-reviews-page.png and android-reviews-large-overview.png under .impeccable/review/native/public-session/. Enlarged text stacks the overview and identity/rating rows; the full-list page retains scrolling and Back. DESIGN.md's public feedback paragraph describes this ordinary extension; no token or sidecar change is needed. Backend scope and illustrative-data limits remain recorded in docs/public-session-details.md. No new raster asset or header/host redesign is included.

Subsequent user correction, 20 October: remove the tinted venue/host card and its associated sheet; retain the remaining public detail layout.
