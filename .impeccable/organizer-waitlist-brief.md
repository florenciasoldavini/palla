# Organizer waitlist

Mode: Operate. Extend the existing occurrence-detail Waitlist Queue card; do not add player registration UI or redesign the surrounding screen.

Display real queued players in server queue order, a count badge, Argentine category chips next to names, and relative Joined time from registration timestamps. All Promote to match CTAs use the same solid neon style with an upward icon. Remove the reference's X controls. Do not fabricate reliability scores. Use the text color for the automatic/manual icon.

Manual mode allows choosing an eligible player while there is room. Automatic mode confirms the first eligible waiting player when a place opens, and can fill currently available places when enabled. Confirm enabling automatic mode, explaining its immediate effect and current-date scope. Keep loading/empty/error states explicit and disable promotion when full, outside the registration window, disabled, or unpublished. The user chose the registration deadline as the promotion cutoff.

The backend retains an organizer removal capability, but this card has no removal UI. Notifications and player signup/cancellation flows remain deferred. See [behavior and verification](../docs/organizer-waitlists.md). Native fixtures use simulated writes; real backend behavior is tested separately in isolated PostgreSQL.
