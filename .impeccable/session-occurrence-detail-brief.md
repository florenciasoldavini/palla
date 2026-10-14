# Organizer occurrence detail

Status: implemented. The user approved the v2 mockup and refined-foundations direction on October 14, 2026, then explicitly requested implementation with future-feature placeholders and testing in iOS and Android.

Mode: Operate. THESIS: preserve Stitch's aesthetic while correcting native layout and spacing. OWN-WORLD: light lavender canvas, rounded white panels, nested lavender blocks, Hanken Grotesk/Geist, lime actions and olive readable emphasis. STORY: dated summary, roster, available place, ordered queue, check-in, saved session information, messaging/cancellation. FIRST VIEWPORT: compact occurrence facts, category/ARS metrics, capacity and registration-placeholder state. FORM: shared 24-radius/24-padding panels, 16-radius/16-padding insets and rows, 24 screen margins, 32 section gaps, 48 minimum action targets, scalable wrapping typography.

Visual references: `.impeccable/mocks/session-occurrence-detail-v2.png` and `.impeccable/mocks/stitch-foundations-v1.png`; approved sidecars accompany both. The initial three-artboard v1 was rejected for departing from the reference and is retained only as historical evidence.

Artifact: `src/features/sessions/screens/session-occurrence-screen.tsx`; presentation `components/session-occurrence-detail.tsx`; proposed feature sections `components/occurrence-placeholders.tsx`. Saved occurrence route `/organizer-session/[id]`, separate existing editor `/organizer-session/edit`, development fixture `/sessions-preview/occurrence`.

Live behavior: read existing organizer inventory, show saved venue/date/court/category/price/notes/deadlines/status, edit future published occurrences, cancel with one/future scope confirmation through the existing version-checked mutation. No schema changes. No UI calls to external APIs or Supabase.

Placeholders: participants and queue entries are synthetic and explicitly labelled. Initial avatars are a documented asset adaptation; real player profile avatars will join registration data later. Registration switch remains disabled/off. Sharing, QR, invites, player options/messages, promotion, check-in and broadcast open nonmutating explanation sheets. No payment collection, refund promise, fabricated registration count or recorded attendance. Booking and club payments remain outside Palla.

Verification: `.impeccable/review/native/occurrence/report.json`, with iPhone 17 Pro iOS 26.5 and Pixel 8 Android 17 Expo Go captures. Native preview rendering, scrolling and placeholder actions verified on both; saved cancelled Android QA detail checked read-only. No new live save/cancel was performed. iOS accessibility-large text wraps after line-box scaling correction. Android larger-text occurrence capture remains unconfirmed after navigation reset. No VoiceOver/TalkBack or tablet claim. No detector ran; the Impeccable launcher was unavailable and direct source/capture review was used.

Border correction: shared cards now explicitly render the one-unit subtle outline. Registration and waitlist inset cards carry subtle outlines; summary metric insets remain borderless as in the supplied reference. Native evidence: `card-borders-ios.png` and `card-borders-android.png` in the occurrence review directory.
