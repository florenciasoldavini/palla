# Profile overview refinement

Mode: Operate. Native iOS/Android, light-only. User references from October 16 are authoritative for card/menu composition. Preserve Palla's existing Hanken Grotesk/Geist fonts, lilac canvas, white subtly bordered cards, neutral icons on lighter lilac tiles and neon primary actions.

Profile becomes an overview rather than a permanently open edit form. Shared top card: portrait, Edit profile action, display name and role. Player shows self-reported Argentine category. Organizer shows display name and optional bio (already present in organizer domain). No invented verification, PRO, reviews, payment instruments, location or court-position data. Editing remains a separate form/flow; existing profile/security/sign-out behavior must be preserved during future implementation.

Proposed shared menu: Notifications; Account & security; Privacy & blocked users; Payment methods; Help & support; About Palla; Log out. Use chevrons instead of decorative toggles; payment/privacy/help destinations may be explicitly labelled placeholders until implemented. Do not silently enable notification preference controls without real persistence. No dark-mode control. Do not offer player/organizer switching as a cosmetic toggle without defining that product capability.

First viewport: clear Profile heading, white profile summary card, then Preferences & account white list card with dividers and same-hue icon tiles. Tall native screen scrolls naturally. Red log-out row at the end. References are not permission to invent verified status or payment support.

User approved the design/menu. Implemented as shared ProfileOverview, separate profile/security editors and explicit placeholder destinations. Reference: .impeccable/mocks/profile-ui/proposal.png. Preserve content-sized summary cards rather than the generated board’s equal-height whitespace. Native verification and functional boundaries are documented in docs/profile.md.
