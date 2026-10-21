# Session covers

Mode: Operate. Ordinary extension of the incumbent Palla native design system; preserve `DESIGN.md` and `.impeccable/design.json`.

THESIS: let hosts choose a real session image while retaining a truthful venue-photo fallback.
OWN-WORLD: existing lilac canvas, white surfaces, olive line icons, shared typography and neon actions. No new theme tokens or decorative raster assets.
STORY: optionally select a photo in Basic Info → preview locally → upload on draft save or publish → resolve the occurrence’s saved cover in public detail.
FIRST VIEWPORT: existing form and public-session composition remain; the optional photo field adds no wizard step.
FORM: shared controls and text, rounded preview, explicit loading/error states, native picker cancellation and edit-scope removal guidance. Public detail uses the existing hero shape with loading skeleton, neutral unavailable state and retry on failure. Never substitute unrelated court artwork for an unavailable venue photo.

Series defaults are snapshotted into occurrences, with a one-occurrence override or explicit future-scope update. Uploads are private JPEGs, signed only after visibility checks. Google venue photos require a name/address match, visible attribution and no persistent photo cache. Preserve the JWT gateway, bounded quotas and server-only provider key.

Implementation and verification limits: `docs/session-covers.md`. Native captures: `.impeccable/review/native/session-attributes/ios-ios-cover-selected.png`, `ios-cover-public-final.png`, `ios-cover-resumed.png`, and `android-cover-live-reopened.png`. Android has real save/reopen evidence; iOS has selection, cancellation and no-write save/resume/public-preview evidence. Live Google provider success remains unverified. Do not promote this first functional composition into a new global visual rule.
