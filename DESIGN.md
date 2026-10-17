---
name: Palla
description: "Light-only interface for recurring social padel sessions."
colors:
  canvas: "#fbf8ff"
  surface: "#ffffff"
  surface-low: "#f4f2fd"
  surface-raised: "#eeedf7"
  surface-strong: "#e8e7f1"
  ink: "#1a1b22"
  text-secondary: "#444932"
  text-muted: "#5e5e5e"
  text-inverse: "#f1effa"
  border-subtle: "#e3e1ec"
  border: "#c5c9ac"
  border-strong: "#757a60"
  olive: "#536600"
  olive-hover: "#3e4c00"
  olive-pressed: "#171e00"
  lime: "#d4ff00"
  lime-hover: "#ddff45"
  lime-pressed: "#b0d500"
  lime-ink: "#171e00"
  selection-lime: "#f7ffd5"
  ink-hover: "#2f3038"
  ink-pressed: "#0d0e12"
  error: "#ba1a1a"
  error-text: "#93000a"
  error-surface: "#fff1ef"
  success: "#2f7a4c"
  success-text: "#245e3a"
  success-surface: "#eef9f1"
  warning: "#8f6126"
  warning-text: "#704b1d"
  warning-surface: "#fdf5ec"
  info-surface: "#f3f6ff"
  info-text: "#203a99"
typography:
  hero:
    fontFamily: "Hanken Grotesk"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: "34px"
    letterSpacing: "-0.8px"
  title:
    fontFamily: "Hanken Grotesk"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: "34px"
    letterSpacing: "-0.56px"
  section:
    fontFamily: "Hanken Grotesk"
    fontSize: "20px"
    fontWeight: 700
    lineHeight: "26px"
    letterSpacing: "-0.2px"
  card:
    fontFamily: "Hanken Grotesk"
    fontSize: "17px"
    fontWeight: 700
    lineHeight: "22px"
    letterSpacing: "-0.08px"
  onboardingTitle:
    fontFamily: "Hanken Grotesk"
    fontSize: "32px"
    fontWeight: 700
    lineHeight: "38px"
    letterSpacing: "-0.64px"
  onboardingRole:
    fontFamily: "Hanken Grotesk"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: "30px"
    letterSpacing: "-0.24px"
  bodyMd:
    fontFamily: "Hanken Grotesk"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "24px"
  bodySm:
    fontFamily: "Hanken Grotesk"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "18px"
  caption:
    fontFamily: "Hanken Grotesk"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: "16px"
    letterSpacing: "0px"
  meta:
    fontFamily: "Geist"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: "16px"
  label:
    fontFamily: "Geist"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: "20px"
    letterSpacing: "0.28px"
  navigationLabel:
    fontFamily: "Hanken Grotesk"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "17px"
  navigationLabelActive:
    fontFamily: "Hanken Grotesk"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: "17px"
  buttonSm:
    fontFamily: "Hanken Grotesk"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: "18px"
    letterSpacing: "0px"
  buttonMd:
    fontFamily: "Hanken Grotesk"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: "18px"
    letterSpacing: "0px"
  buttonLg:
    fontFamily: "Hanken Grotesk"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: "20px"
    letterSpacing: "0px"
rounded:
  none: "0px"
  sm: "4px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  full: "9999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
  "8": "32px"
  "10": "40px"
  "12": "48px"
  "16": "64px"
  "20": "80px"
  "24": "96px"
components:
  button-essential:
    backgroundColor: "{colors.lime}"
    textColor: "{colors.lime-ink}"
    typography: "{typography.buttonLg}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  button-neutral:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
    typography: "{typography.buttonLg}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  button-bordered:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  button-ghost-accent:
    backgroundColor: "transparent"
    textColor: "{colors.olive}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  text-field:
    backgroundColor: "{colors.surface-low}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0px 16px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "16px"
  card-panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    padding: "24px"
  card-inset:
    backgroundColor: "{colors.surface-low}"
    rounded: "{rounded.lg}"
    padding: "16px"
  card-row:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "16px"
  chip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "4px 12px"
  segmented-tabs:
    backgroundColor: "{colors.surface-low}"
    rounded: "{rounded.lg}"
    padding: "4px"
  role-navigation:
    backgroundColor: "{colors.surface}"
    height: "76px"
    padding: "6px 0px"
  role-navigation-item:
    textColor: "{colors.text-muted}"
    typography: "{typography.navigationLabel}"
    rounded: "{rounded.md}"
    padding: "4px 0px"
  role-navigation-item-active:
    backgroundColor: "{colors.selection-lime}"
    textColor: "{colors.olive}"
    typography: "{typography.navigationLabelActive}"
    rounded: "{rounded.md}"
    padding: "4px 0px"
  navigation-header:
    backgroundColor: "{colors.canvas}"
    height: "64px"
    padding: "0px 24px"
  notification-button:
    backgroundColor: "{colors.surface-low}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    size: "48px"
  notification-button-pressed:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    size: "48px"
  mode-choice:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "24px"
  mode-choice-selected:
    backgroundColor: "{colors.selection-lime}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "24px"
---

# Design System: Palla

## Overview

**Creative North Star: "Palla’s Stitch-inspired club interface"**

Palla’s Stitch-inspired club interface uses a pale lavender canvas, white panels, nested lavender blocks, dark ink, and lime essential actions. Hanken Grotesk carries headings and everyday interface text; proportional Geist supports compact metadata. The existing wordmark anchors the identity.

The system keeps the color and font character of the user’s Stitch references while correcting spacing, alignment, and mobile readability. Shared semantic tokens and reusable components carry the same visual roles across native iOS and Android; screen-specific composition may adapt without changing the palette.

**Key Characteristics:**

- Light-only lavender and white surfaces.
- Lime actions and olive readable emphasis.
- Rounded white panels with nested lavender blocks and compact roster rows.
- Readable, scalable text and scrollable mobile forms.

Palla targets native iOS and Android. UI and flow testing must use iOS Simulator and Android Emulator; existing web styles and captures are legacy compatibility evidence, not acceptance targets.

This records incumbent source, the approved onboarding extension, role-navigation chrome, organizer-session implementation, and the approved Stitch-inspired foundation update applied to occurrence details. Existing screens inherit the changed shared tokens; a complete redesign of every screen is not claimed. The normative source remains `src/theme/tokens.js`; React Native aliases live in `src/components/atoms/theme.ts`. Frontmatter mirrors those values, and component state/motion details extend them in `.impeccable/design.json`. Sizes are CSS pixels on web and logical units in native layouts.

## Colors

### Primary

Lime supplies essential action backgrounds and selected highlights. Pale selection lime distinguishes the onboarding radio panel. Olive supplies accent text, selected borders, icons, and field focus; its darker steps serve interaction states.

### Neutral

Pale lavender is the canvas. White, low, raised, and strong surfaces separate content without introducing another brand hue. Dark ink carries primary text; secondary olive-gray and muted gray carry supporting copy. Subtle, default, and strong borders distinguish containers and control states. Inverse text belongs on dark surfaces.

Semantic error, success, warning, and info colors express outcomes; they are not decorative accents.

**The Light-Only Rule.** Keep the interface light when the platform requests dark mode.

**The Readable Accent Rule.** Use lime for backgrounds and highlights; use olive for accent text and focus.

**The Shared Roles Rule.** Resolve visual choices through shared tokens and atoms rather than creating local palettes or shadows.

## Typography

Hanken Grotesk is the primary face. Geist is a secondary proportional face. Native weights resolve to bundled Regular, Medium, SemiBold, and Bold files through `src/theme/fonts.ts`; the platform must load them before showing the interface.

The frontmatter names source roles: hero/title for screen headings, section for major sections, card for subordinate headings, bodyMd/bodySm for copy, caption for helper details, and meta for short metadata. Form labels use the label token: Geist SemiBold (600), 14px/20px, 0.28px tracking, and primary dark charcoal (#1A1B22), verified against Stitch Step 1’s title and description labels. Optional markers and helper text keep their secondary colors; AppText's `label` variant resolves to buttonSm. Buttons use buttonSm, buttonMd, or buttonLg according to size.

The approved onboarding extends the ramp with onboardingTitle and onboardingRole. ModeChoice currently applies onboardingRole size, line height, and weight but inherits card tracking; its token tracking is not fully applied. Inputs enforce a minimum 16px text size. Multiline TextField inputs use 12px vertical padding and top alignment, matching TextAreaField. Single-line and truncated fields keep their centered alignment and zero internal vertical padding. Preserve semantic heading levels and allow controls to grow with text scaling. AppText, AppHeading, and ButtonText multiply both font size and line height by the platform font scale before rendering with native automatic font scaling disabled. This avoids double scaling and fixed-line-box clipping; it continues to honor the user’s larger-text setting. Button labels wrap and shrink within the available row width.

## Layout

Screen content caps at 1200px. Shared breakpoints are tablet (768px) and desktop (1280px), with horizontal margins of 24, 40, and 64px respectively. Spacing follows the source’s four-unit scale. The occurrence detail uses 32-unit section gaps, 12–16-unit internal gaps, and a 600-unit content cap. Summary, waitlist, check-in, and information panels use the shared panel surface; metric blocks and queue entries use inset surfaces, while participant entries use row surfaces. These are screen composition choices, not a required section order for other screens. Screen applies top safe-area padding to its outer root rather than the scrollable content, keeping scrolled content below the status bar. Shared form width tokens are 540px on web and 760px on native; individual forms may impose a narrower cap.

Approved onboarding centers a 440px-wide form with 24px horizontal padding. Its two stacked radio panels remain visible together. Header spacing uses the shared scale; a flexible spacer separates fields from the action area. The form scrolls and adapts to viewport height, safe areas, keyboard visibility, and large text rather than clipping. Its minimum content height is 640px. This composition is specific to account onboarding.

## Elevation & Depth

Tonal layering and thin borders carry most depth. The shared shadow vocabulary is card (very shallow), raised (soft container lift), and floating (detached overlays). AppCard defaults to a flat bordered white surface; only its raised tone applies the raised shadow. Reuse shared shadows rather than adding local effects. Exact shadow values live in the sidecar.

## Shapes

All text buttons and form controls use the medium radius (12px), consistently across colors and sizes. Icon-only buttons are circular. Ghost buttons have no background or border, including pressed, loading and disabled states. Pills are reserved for chips, filters and badges, not text actions. Default cards and compact rows use the large radius, spacious panels use the extra-large radius, segmented tracks use the large radius, and radio indicators are circular. Standard and strong borders are one unit; the selected onboarding panel uses two.

## Components

### Buttons

Essential solid is the lime main action; neutral solid is ink with white text. Accent, danger, success, and warning colors preserve their semantic roles. Bordered and ghost treatments reduce emphasis without changing action meaning. Solid colors follow their shared hover and pressed steps; bordered buttons use low/strong surface feedback. Ghost feedback uses text/icon color and the shared press motion while the surface remains transparent.

All sizes provide a minimum 48-unit target and grow with type. Default padding is 12px vertically and 16px horizontally; labels wrap. Disabled/loading treatment uses a muted strong surface for solid/bordered buttons; ghost actions remain transparent with muted text/icons; loading retains the label, adds a spinner, announces busy state, and prevents duplicate execution. Press feedback scales to 0.98 using shared short timing.

### Cards / Containers

White/default, low/muted, and raised tones use an explicit one-unit border in the subtle border color; inverse cards use their own surface color. The width comes from the native style, rather than relying on the NativeWind class. All share continuous rounded corners. Default cards use large rounding and medium padding. Padding variants follow the shared scale: small (12px), medium (16px), large (20px). AppCard’s optional `surface` prop selects durable surface roles: panel uses extra-large rounding with 24-unit padding; inset and row use large rounding with 16-unit padding. Tonal nesting is part of the approved aesthetic: lavender inset blocks can sit inside white panels. Raised tone alone adds the shared raised shadow.

### Empty and error states

EmptyState and ErrorState reuse the current light surfaces, headings, body copy, decorative line icons and action styles. Panel states center content inside a section card; inline states keep failures beside retained data with a ghost action; fullScreen states center content without an enclosing card. Use contained inside an existing panel. Inline layouts stack above a 1.2 font scale or below 360 units of width so text and actions remain readable. Errors identify a failed request and offer optional busy/disabled retry; empty states explain the absence of items and offer an action only when useful. Component usage is documented in `docs/ui-states.md`; this addition changes no palette or typography tokens.

### Inputs / Fields

Field fill is determined by the surrounding surface: pale lilac (`surfaceLow`, #f4f2fd) on white cards/panels; white (`surface`, #ffffff) on lilac pages or inset panels. Text fields, numeric inputs, textareas, picker/dropdown triggers and search bars follow this same rule. All have a subtle border and 12px corners. Hover changes the border, focus uses the olive border, and error uses an error border plus supporting text. Focus, error and disabled states preserve the inherited fill; disabled text is muted. Surface choice never changes dimensions, radius or padding. Fields begin at a 48-unit minimum and expand with font scale. Labels, optional markers, helper messages, and errors retain accessible associations. Text inputs and textareas expose meaningful accessibilityLabel and aria-label values. Errors remain readable text and announce updates politely.

Native picker triggers use `FieldTrigger`, sharing TextField’s inherited fill, subtle border, medium rounding, 16-unit horizontal padding and scalable height. Values use body text with a trailing calendar, clock, or chevron icon. Pressed/open triggers use an olive border; invalid date/time fields use an error border. Native selects open a scrollable white bottom sheet with selected checkmarks and Done, independent of trigger measurement.

### Chips

Selectable chips are bordered pills with 48-unit targets. Selected chips use olive text/border and a translucent olive wash; hover and press strengthen the wash. These compact bounded labels differ from wrapping form controls.

### Navigation

SegmentedTabs uses a low-surface bordered track, equally sized 48-unit tabs, and an ink or olive selected indicator with inverse text. The indicator alone moves using the shared thumb duration. Labels can wrap. The preview sidecar records visual samples; it does not implement app navigation.

Role navigation uses Expo Router Tabs with four equally weighted destinations per role: Overview/Sessions/Messages/Profile for organizers and Discover/My games/Messages/Profile for players. Messages carries a lime unread-count badge; the header keeps the notification bell. Each destination combines a 24-unit outline icon with a Hanken Grotesk navigation label; selected labels use the active weight. A pale selection-lime rounded tile and olive icon/text identify the active destination. Inactive icon/text uses muted text. The white bar has a subtle one-unit top border and no elevation. Item margins are 6 units horizontally, with medium rounding applied to both the item and native pressable so the selected fill clips consistently. Native PlatformPressable preserves navigator events and interaction behavior.

The bar grows to `max(76, 72 × min(fontScale, 1.3))` units plus the bottom safe-area inset, with 6 units top padding and `6 + bottomInset` bottom padding. It hides when the keyboard opens. Labels remain below their icons, on one line with native font scaling capped at 1.3 so all four destinations remain legible. The wordmark is a fixed-size brand element rather than scalable body text. Shared header content is 64 units high plus the top safe-area inset, with 24-unit horizontal padding, the established Palla wordmark, and a 48-unit circular notification target. Its 24-unit bell uses ink on a low surface; pressing raises the surface tone. Notifications use a separate stack screen with Back. The role destinations and deferred content scope are recorded in `.impeccable/navigation-brief.md`.

### Onboarding radio panels

Approved option A uses white unselected panels and a pale lime selected panel with olive outline. Panels have 24px padding, a 144-unit minimum height, line icons, title/body text, and a trailing radio circle. Selection is exposed explicitly; arrow keys move selection on web. The player form has three steps; the organizer form has two and finishes after the name. The form shows a mode-specific step count, adds Back after mode selection, keeps Sign out available, preserves drafts, and shows failures inline. Approved category option C uses guided radio choices with a category selector and separate beginner/unknown answers; the category question appears only in player onboarding. Organizer access is immediate after saving.

### Organizer session forms and review

The Sessions screen composes existing cards, segmented tabs, skeletons, empty states, and buttons into Upcoming, Drafts, and Past inventory. The editor uses three scrollable steps: place/schedule, players/price, and review. A lime progress strip and step text show position; field groups use shared spacing. Paired time/category controls share a row at normal text sizes; above a 1.2 font scale the editor header and those pairs stack. Back, Previous step, and draft actions preserve the established button hierarchy. Step changes dismiss the keyboard and reset the screen scroll position.

Date/time fields use the shared field trigger with the selected value exposed through accessibilityValue. iOS opens a full-width white bottom sheet containing a light native spinner and Done; Android uses native date/time dialogs. Times are explicitly Buenos Aires time. Club name remains manual; Club address offers street-address predictions with loading, no-match, attribution, and manual-entry recovery surfaces. Monthly-limit recovery also keeps manual address entry available. Provider configuration, the app-wide request cap, and verification limits are recorded in `docs/google-address-search.md`. Review uses a white card for place/schedule, then plain sections for categories, capacity, ARS price, deadlines, and optional notes. The court-arrangement acknowledgement uses the existing selectable chip. These are compositions of incumbent atoms, not new palette or typography roles.

### Session occurrence details

The occurrence screen keeps the approved Stitch composition: a dated summary, nested category/price metrics, registration controls, compact roster rows, waitlist queue, check-in panel, session information, and bottom actions. The live summary shows saved title, venue, schedule, Argentine categories, capacity, per-player currency/price, deadlines, and cancellation information. Edit and cancellation reuse the implemented organizer flow and appear for future published sessions.

Future features remain visible because the user explicitly approved placeholders. Registration is disabled and labelled as coming soon; roster names and initials are explicitly illustrative. Invitations, messaging, QR sharing, promotion, and check-in open a coming-soon sheet without saving data. The sheet respects the bottom safe area and supports platform Back dismissal. No sample participant is presented as a real registration, paid player, or confirmed arrival; payment remains arranged with the club. These feature boundaries belong in product documentation rather than new global visual prohibitions.

### Native confirmations

SessionConfirmation presents a compact white bottom sheet with rounded top corners, a dimmed backdrop, and safe-area padding. Content scrolls within a maximum 90% screen height. Danger confirms the destructive action; a bordered button keeps the session/draft or returns to editing. Inline errors remain visible, busy state disables dismissal, and the platform Back request closes the sheet only when idle. Cancellation uses the shared bordered TextAreaField for an optional reason. Draft deletion and unsaved-change discard use the same confirmation pattern with action-specific copy.

Published editing and cancellation expose one/future scope with a calculated upcoming occurrence count and date span. The editor pins the loaded form and version so a background refresh does not silently replace the edit baseline. These interaction safeguards do not imply registration, attendance, or notification delivery; implementation boundaries belong in `.impeccable/organizer-sessions-brief.md` and `docs/organizer-sessions.md`.

## Do's and Don'ts

### Do:

- Do reuse semantic colors and shared atoms for new screens.
- Do use Hanken Grotesk for headings and body text, and proportional Geist for compact metadata.
- Do preserve visible keyboard focus, readable errors, and controls that expand with text.
- Do retain scrolling, safe areas, and keyboard accommodation in mobile forms.
- Do use panel, inset, and row surface roles to preserve consistent tonal nesting and spacing.
- Do scale font sizes and line boxes together, allowing actions and rows to wrap.

### Don't:

- Don't introduce dark-mode inversion or a second local palette.
- Don't use lime as small text on white or pale surfaces.
- Don't treat Geist or legacy Mono-named token keys as a monospace design direction.
- Don't replace the approved stacked onboarding choices with a new composition.

Evidence: source tokens/atoms and `docs/design-system.md`; approved direction in `.impeccable/onboarding-brief.md`. Web review captures are under `.impeccable/review/` (onboarding mobile/name/desktop and signup mobile/desktop). These are development evidence, not shipping imagery or native-device verification. The option mock's generation prompt is `.impeccable/mocks/onboarding-options.prompt.txt`. No shipping raster was added, and no CLI detector or measurement tool ran.

Role-navigation evidence: shared source under `src/components/navigation/`, approved `.impeccable/mocks/role-navigation.png` with the later Search-icon amendment, and native player/organizer captures under `.impeccable/review/native/navigation/`. Preview tests exercise the shipped navigator without authenticated account writes; precise coverage and limits are recorded in `docs/native-testing.md`. No browser validation or CLI visual detector ran for navigation.

Organizer-session evidence: inspected session list/editor/form/review/native datetime/confirmation source, shared input/textarea source, `docs/organizer-sessions.md`, and `docs/native-testing.md`. Earlier development captures are `players-ios.png`, `review-ios.png`, `cancel-ios.png`, and `players-android.png` under `.impeccable/review/native/sessions/`. Both no-write fixture reports (`ios-report.json`, `android-report.json`) record seven passing checks each. These preview checks do not establish account persistence.

Current iOS evidence in that directory was visually inspected: `live-list-ios.png`, `live-cancel-ios.png`, `large-text-ios.png`, `discard-large-text-ios.png`, and `cancel-reason-input-ios.png`. `ios-live-report.json` records authenticated native entry, manual QA venue creation, publication, list/query reload, edit save, and cancellation. The live cancellation capture includes the real count/date scope summary. The native QA record reports successful accessibility-medium layout, Back confirmation, Keep editing preserving input, Discard changes returning to Sessions, and cancellation-reason entry/Keep session recovery. Native snapshots expose meaningful input labels and selected date/time values. The original text-size setting was restored. Code verification passed with 43 unit tests and existing lint warnings.

Authenticated Android checks now passed after organizer onboarding: verified native title/club/address entry, publication of one QA occurrence, inventory reload, capacity edit from 8 to 9, Keep session recovery, cancellation, and retained Past history. Visually inspected `live-list-android.png`, `live-edit-review-android.png`, `live-edited-list-android.png`, `live-cancel-android.png`, and `live-past-android.png`; `android-live-report.json` records the tested flow. Connected read-only database verification, recorded by the QA handoff, confirms Android capacity 9 and iOS capacity 8, both cancelled. These current Android captures supersede earlier interrupted captures for this bounded scope.

Devices: iPhone 17 Pro / iOS 26.5 and Pixel_8 / Android 17, Expo Go SDK 54. Software-keyboard avoidance (hardware keyboard was active on iOS), VoiceOver/TalkBack traversal, Android large text, tablets, restart persistence, and live native weekly publication remain unverified. Weekly recurrence was covered in the SQL fixture rather than a live native flow. These scoped checks do not certify complete native acceptance. No browser validation substitutes for native testing. These earlier session checks precede the occurrence-detail visual refinement.

Control-correction evidence (October 14, 2026): inspected `FieldTrigger`, native `SelectMenu`, native date/time, and address-field source and visually reviewed `fields-fixed-ios.png`, `picker-fields-fixed-android.png`, `time-picker-fixed-ios.png`, `select-fixed-ios.png`, and `select-fixed-android.png` under `.impeccable/review/native/sessions/`. `controls-fixed-ios.json` records no-write physical-touch checks for Repeat/Weekly, Categories/All categories, and Date/Start/End open/Done. `controls-fixed-android.json` records Repeat/Weekly, saved-club name/address population, Date/Start/End open/Cancel, and the unconfigured-address-search manual fallback. These checks confirm the bounded control correction; they add no account-persistence, software-keyboard, screen-reader, tablet, or large-text certification. Live Google predictions and selection were subsequently checked on both native platforms as recorded below. Prior native verification claims and limits above remain scoped to their original checks.

Address-search cap follow-up (October 14, 2026): the deployed proxy reserves requests atomically against a 9,000-request monthly total shared across all Palla users and both autocomplete/details operations, while retaining the per-organizer minute/day limits. Failed or timed-out provider attempts consume their reserved slots. The month resets in America/Los_Angeles. Exhaustion returns manual-address guidance. This controls only Palla proxy requests; it does not cap external key use, other projects, or unrelated Google services, and does not guarantee a zero Google bill. Google Cloud project `palla-502717` has active billing and Places API (New) enabled. The API-restricted key is stored as the Supabase `GOOGLE_PLACES_API_KEY` secret, outside the client and repository. Applied provider daily quotas are 250 AutocompletePlacesRequest and 250 GetPlaceRequest. The combined 9,000/month Palla proxy cap remains active. No additional native layout or accessibility checks were performed for this backend/copy follow-up.

Live Google evidence (October 14, 2026): visually reviewed `google-search-live-ios.png`, `google-selected-live-ios.png`, `google-search-live-android.png`, and `google-selected-live-android.png` under `.impeccable/review/native/sessions/`, with `google-live-report.json`. Both platforms displayed actual predictions and Google Maps attribution, fetched a formatted address after selection, and replaced the local form value. Android verified exact entry of Monroe 5765. iOS automation inserted Monroe into the existing Córdoba address; the actual Córdoba 1234 prediction was selected and resolved, so exact iOS query replacement is not claimed. Six durable monthly reservations were observed across the checks. No session/profile was saved. Provider exhaustion, offline recovery, and complete native accessibility acceptance are not certified by this bounded live check.

Occurrence foundation update (October 14, 2026): extracted implemented values from `src/theme/tokens.js`, shared card/text/heading/button/screen atoms, and `session-occurrence-detail.tsx` / `occurrence-placeholders.tsx`. Code verification passed with 43 unit tests and 13 existing lint warnings. Native recaptures and the current occurrence-detail runtime review were pending at this documentation pass; earlier session captures above do not validate the new screen. No new native acceptance claim is made here.

Card-border correction (October 14, 2026): AppCard now applies the unchanged one-unit border token explicitly in native styles. The registration strip and waitlist inset cards use the subtle border; summary metric blocks intentionally remain borderless. Visually inspected `card-borders-ios.png` and `card-borders-android.png` under `.impeccable/review/native/occurrence/`; the finish reviewer accepted this narrow correction. This adds bounded visual evidence on both platforms without extending the earlier flow, keyboard, or screen-reader claims. Code verification remains 43 passing unit tests and 13 existing lint warnings.

### Feedback placement

Transient action results use the shared toast: successful saves, failed requests and other completed actions. Input validation and form constraints stay inline by their fields. Persistent loading/error surfaces keep their reusable state components and recovery actions. A partial success uses a warning toast and keeps any required retry control available. Toasts must appear above native navigation and respect safe areas; use `useAppToast`.

Toast variants share one borderless charcoal shell, white titles, muted lilac descriptions and gray close icons. Status colors live only in the icon treatment. Standard cards use 16px corners with a pale icon tile/darker matching icon; brief compact toasts use a content-sized capsule and a small status circle. Both sizes use the same background token. Toast actions are raised charcoal rectangles with white text; Retry includes the retry icon. Compact confirmations dismiss after 3s and standard success/info after 4.5s. Error/warning and actionable results persist until acted on or dismissed. Supporting detail/action promotes compact to the standard layout.

Toast entry uses the toast-specific 280ms ease-out with a subtle 8px downward settle and fade; exit fades over 200ms. Reduce Motion uses opacity only. Motion runs on the UI thread and never animates layout dimensions.
