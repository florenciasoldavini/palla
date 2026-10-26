# Palla Stitch reference analysis

Reviewed October 14, 2026 through the existing signed-in Chrome tab. Project: [Palla Social Padel Sessions](https://stitch.withgoogle.com/projects/1806994716726085102). Browser access is available; no dedicated Stitch connector was found in the plugin search. This is reference inspection, not an installed persistent integration or app validation.

## Reference inventory

The canvas contains a Palla Design System board and twelve screen references: Welcome to Palla, Create Account, Sign In, Discover Sessions, player Session Details, Organizer Dashboard, Create New Session, player Profile, Manage Session & Roster, All Sessions, advanced Create Session, and a Create Session Wizard schedule step. Several generated frames retain the label “Generating Screen...” despite containing rendered UI. Screen content identifies their purpose more reliably than that label.

The screen text was inspected across the project. Visual inspection covered the canvas, discovery/player-detail/dashboard/create-form group, and the selected Manage Session & Roster frame. This was not a runtime, accessibility, or complete per-screen interaction audit.

## Visual direction to preserve

- Hanken Grotesk for headings and body; Geist for labels. The board explicitly names these fonts.
- The board's primary is #D4FF00, secondary #000000, tertiary #D8F2FF, and neutral #71717A. Rendered app references also use a pale lavender canvas, white major surfaces, lavender supporting surfaces, and olive accents. The code's established semantic colors remain documented in DESIGN.md; the board does not alone define every rendered color.
- Organizer content is compact and structured with rounded white cards and nested lavender information blocks. Rounded roster rows, small pills, avatars, and restrained borders distinguish levels of information.
- Lime highlights capacity, selected state, and important actions. Dark filled buttons carry management actions. Red outlined buttons visually separate cancellation.
- Session facts appear before player management. Roster, queue, and check-in remain clearly separate sections. The dashed vacant-slot row conveys an actionable opening.
- Player discovery uses court photography; organizer management gives more space to operational information and participant portraits.

The user's rejection of the first occurrence mockup establishes that replacing these cards with plain divided lists and splitting the design across three artboards was excessive reinterpretation. The supplied reference's composition should guide the next design, including its section order, card nesting, spacing, and action placement.

## Product adaptations

Preserve visual composition while adapting content to Palla's agreed product:

- Use Argentine categories and ARS rather than decimal ratings and euro prices.
- Keep three role-specific navigation tabs and the header notification bell; reference screens show four generic tabs.
- Organizers arrange courts and payments with the club outside Palla. “Palla Pay,” escrow, collected revenue, and automatic refunds are proposed reference features, not existing capabilities.
- Do not assume the organizer occupies a playing slot or must supply a playing category.
- A recurring series defines the pattern; an occurrence is a specific dated session. Edit/cancel scope must distinguish this date from future dates.
- The reference creation wizard claims automatic court bookings and auto-roster behavior. These are not implemented or agreed requirements.
- Verified ratings, reliability percentages, Playtomic sync, messaging, QR passes, and check-in require separate product decisions and implementation. Roster/waitlist are planned MVP work rather than current functionality.
- The reference shows a vacant slot plus a queue and enabled automatic promotion. Define promotion behavior before implementation so an eligible queued player is not bypassed by direct invitation.
- Numerical averages of Argentine categories should not be substituted for the reference's decimal rating average without a justified matching model.

## Applying this reference

User direction, October 14, 2026: adopt Stitch's overall aesthetic, colors and fonts, correct its spacing/layout mistakes, and use its complete UI as a guide for future functionality. UI placeholders are explicitly authorized. Visually preserve the reference's feature sections rather than deleting them solely because their backend is pending. Label pending actions “Coming soon” or provide an explanatory response; label sample content as illustrative, and do not simulate persisted success. Keep functional sections backed by live data separate from illustrative sections at the data layer.

Before creating a screen mockup, inspect the corresponding Stitch frame and use its actual layout as the visual source. Identify any required product-content adaptations explicitly. Present the mockup before production UI implementation. Reference inspection in Stitch does not replace iOS Simulator and Android Emulator validation of the resulting app.

Current occurrence concept: `.impeccable/mocks/session-occurrence-detail-v2.png`. It preserves the major reference sections but includes proposed roster, waitlist, check-in, and messaging controls; those controls are not evidence of implemented functionality. The user said v2 looks better; that is feedback, not a request to implement the full reference feature set.

## Proposed spacing and component refinement

These are proposed construction values, not measurements of Stitch. Existing colors/fonts already match much of the reference; refine composition rather than replacing them.

| Role                              | Proposed rule                                                                                                   |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Screen content                    | 24 logical units side padding; safe-area-aware top/bottom                                                       |
| Major summary/queue/check-in card | 24 corner radius, 24 padding                                                                                    |
| Lavender inset                    | 16 corner radius, 16 padding                                                                                    |
| Compact participant card          | 16 corner radius, 16 padding; flexible height                                                                   |
| Adjacent roster rows              | 8–12 gap                                                                                                        |
| Sections                          | 32 separation; 12 from heading to content                                                                       |
| Internal grouping                 | 4 for tightly related label/value, 8–12 for related items                                                       |
| Controls                          | Minimum 48 touch target, 12 radius for inputs/buttons                                                           |
| Typography                        | Hanken Grotesk 28/34 title, 20/26 section, 17/22 card; proposed 16/24 readable body; Geist 12/16 short metadata |

Equal-width metric columns align their labels and values. They stack if longer text or accessibility text sizing makes side-by-side layout impractical. Buttons wrap/grow rather than clip. Avatar/name text occupies flexible space; trailing actions keep usable touch targets. Badges carry short state labels; primary information is not shrunk to fit. Use 4-unit increments and shared semantic component roles rather than one-off screen values.

The proposal board lives at `.impeccable/mocks/stitch-foundations-v1.png`, with its exact prompt in the accompanying `.png.json`. Runtime tokens and shared components have not yet been changed to these proposed values.

## Reference feature roadmap

| Area                    | Guide from Stitch                                              | Current boundary                                                      |
| ----------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------- |
| Sessions                | Create, drafts, weekly series, occurrence editing/cancellation | Existing backend; refine UI                                           |
| Participation           | Roster, capacity, vacant slot, invite, join/leave              | Registration/invitation work remains                                  |
| Waitlist                | Ordered queue, promote, automatic backfill                     | Implement queue and consistent promotion policy                       |
| Discovery               | Search, category/date filters, court imagery, details          | Replace illustrative content as feature becomes live                  |
| Organizer communication | Player/group messages, broadcast, notifications                | Proposed message flows; delivery remains                              |
| Attendance              | Arrival states, manual check-in, QR pass                       | Future feature; label pending                                         |
| Profiles                | Player preferences, saved venues, history                      | Future extension of account/profile foundation                        |
| Insights                | Fill rate and returning players                                | Needs real participation history; avoid fabricated live metrics       |
| Rating integration      | Verified rating, reliability, external sync                    | Separate future decision; keep Argentine self-reported categories now |
| Payments                | Collection, escrow, split fees, refunds                        | Separate future decision; club payment remains current model          |
