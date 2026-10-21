# Blocking/reporting sheets — revised approval, October 16

The user approved the participant-led Stitch direction and combined flow in `proposal.png`, with an explicit button correction: primary report actions use neon lime with dark green text; standalone Block user remains solid red with white text. The generated dark/neon buttons and 500-character counter are superseded. Keep the existing 2,000-character details limit.

Use the actual participant avatar (initials fallback), full name, stored player category or HOST role tag; no Playtomic rating, verification claim or match count. The warning explains mutual messaging/online restrictions. The lavender panel explains retained history/registrations and reversible blocking. Also report defaults off. When enabled, Continue to report opens the existing reason/details form with blocking preselected; only its final Report & block persists both actions. Direct reporting defaults blocking off. Report details have a Change reason row, evidence disclosure, optional block switch and neon submission button. One primary action at each stage.

Implementation: shared `ChatSafetySheet` / panel / switch, `ChatBlockSheet` and existing `ChatReportSheet`. Preserve native keyboard scrolling, safe areas, loading, retry, idempotency and existing backend contracts. No new schema or backend deployment is required.

Latest user refinement: keep the primary action neon/dark-green in both reporting-switch states, superseding the red standalone block styling above. Rename What changes to About blocking.
