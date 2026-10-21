# Session attributes

Mode: Operate. Ordinary extension of the incumbent Palla native design system.

User approved the functional implementation of `session-attributes-flow.html` while explicitly deferring visual refinement. Preserve existing creation steps, navigation, public header, maps and reviews.

THESIS: let hosts declare concrete session inclusions and venue facilities, and let players scan those facts.
OWN-WORLD: existing lilac canvas, white panels, olive icons, neon actions and pill chips.
STORY: choose venue → apply optional venue amenities → select session inclusions → save draft/publish → display actual saved attributes in public detail.
FIRST VIEWPORT: existing Basic Info header and form. Attribute selections continue within that step, with a shared amenities bottom sheet.
FORM: no new wizard step, no inferred facilities, no venue verification or service purchasing. Organizer-specific venue claims avoid changing shared physical venue records for other hosts. Apply changes the form; publish/update commits venue claims.

Implementation and database boundaries: docs/session-attributes.md. Native evidence: .impeccable/review/native/session-attributes/. Provisional UI is intentional; refinements beyond usability defects remain for the next iteration. No new raster assets or theme tokens.

Icon refinement: the user approved padel sketches for a trial in the actual chips and supplied a fuller racket reference. Both ball inclusions use the shared original ball vector; spare rackets uses the smooth outline racket vector. Attribute icons share a 1.8-unit stroke. The shared racket/ball vector is used in RoleTabs for Sessions (organizer) and My games (player), at the existing navigation stroke of 2 units. Preserve the existing chip layout, palette, type and 48-unit selectable targets while evaluating these icons.
