# Updated session creation form

Mode: Operate.

Status: mockup only; awaiting user review. Backend settings are implemented. Do not build the new controls until the mockup is approved.

Use Palla's Stitch-inspired light palette, Hanken Grotesk/Geist typography, subtle card borders, consistent inputs, 24px screen margins, and native touch targets. Preserve the external court-arrangement model.

The proposal has four steps:

1. Details: session name, club/address search, free-text court label, maximum players, description.
2. Schedule: date/time, one-off/weekly recurrence, optional registration opening/closing and player cancellation cutoff. The board shows upper and expanded lower scroll positions of this same step.
3. Players: participation (Everyone default, Women only, Men only), public/private visibility, arbitrary category multi-select or all categories, waitlist toggle, automatic/manual promotion, optional queue cap.
4. Review: schedule, access, timing, and court-arrangement confirmation.

No payment settings or payment controls are included. Public/private copy must not promise invitation-only authorization before that feature is designed. Queue settings must not suggest operational promotion already exists.

Artifact: `mocks/session-creation-settings-v1.png`; exact generation prompt and approval state: `mocks/session-creation-settings-v1.png.json`.

Mockup corrections to carry into implementation: the Schedule board's “Timing options shown in the next panel” text is presentation-only and must not ship. Court is free text; the rendered chevron must not imply an inventory picker.

Revision v2: `mocks/session-creation-settings-v2.png` shows updated Players/Review and separate active/paused series management proposals. Publishing creates an active series; lifecycle is not a creation-form selector. Show pause confirmation before the transition, separately from the paused state. Published dates remain scheduled. Ending is permanent and also needs confirmation in the eventual UI. Template editing must explicitly distinguish defaults from an edit affecting existing dates. No automatic occurrence generation or template-only editor is implemented yet.
