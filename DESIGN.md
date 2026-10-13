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
    fontSize: "15px"
    fontWeight: 400
    lineHeight: "22px"
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
    fontSize: "11px"
    fontWeight: 500
    lineHeight: "15px"
  label:
    fontFamily: "Hanken Grotesk"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: "18px"
    letterSpacing: "0px"
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
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0px 16px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.md}"
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

**Creative North Star: "Palla's established light interface"**

Palla's established light interface uses a pale lavender canvas, white panels, dark ink, and lime essential actions. Hanken Grotesk carries headings and everyday interface text; proportional Geist supports compact metadata. The existing wordmark anchors the identity.

The system is spacious enough for mobile touch and compact enough for repeated session management. Shared semantic tokens and reusable components carry the same visual roles across iOS, Android, and web; screen-specific composition may adapt without changing the palette.

**Key Characteristics:**

- Light-only lavender and white surfaces.
- Lime actions and olive readable emphasis.
- Rounded controls, restrained borders, and shallow elevation.
- Readable, scalable text and scrollable mobile forms.

Palla targets native iOS and Android. UI and flow testing must use iOS Simulator and Android Emulator; existing web styles and captures are legacy compatibility evidence, not acceptance targets.

This records incumbent source, the approved onboarding extension, and the shipped role-navigation chrome. The normative source remains `src/theme/tokens.js`; React Native aliases live in `src/components/atoms/theme.ts`. Frontmatter mirrors those values, and component state/motion details extend them in `.impeccable/design.json`. Sizes are CSS pixels on web and logical units in native layouts.

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

The frontmatter names source roles: hero/title for screen headings, section for major sections, card for subordinate headings, bodyMd/bodySm for copy, caption for helper details, and meta for short metadata. Form labels use the label token; AppText's `label` variant resolves to buttonSm. Buttons use buttonSm, buttonMd, or buttonLg according to size.

The approved onboarding extends the ramp with onboardingTitle and onboardingRole. ModeChoice currently applies onboardingRole size, line height, and weight but inherits card tracking; its token tracking is not fully applied. Inputs enforce a minimum 16px text size. Preserve semantic heading levels and allow controls to grow with text scaling.

## Layout

Screen content caps at 1200px. Shared breakpoints are tablet (768px) and desktop (1280px), with horizontal margins of 16, 40, and 64px respectively. Spacing follows the source's four-unit scale. Shared form width tokens are 540px on web and 760px on native; individual forms may impose a narrower cap.

Approved onboarding centers a 440px-wide form with 24px horizontal padding. Its two stacked radio panels remain visible together. Header spacing uses the shared scale; a flexible spacer separates fields from the action area. The form scrolls and adapts to viewport height, safe areas, keyboard visibility, and large text rather than clipping. Its minimum content height is 640px. This composition is specific to account onboarding.

## Elevation & Depth

Tonal layering and thin borders carry most depth. The shared shadow vocabulary is card (very shallow), raised (soft container lift), and floating (detached overlays). AppCard defaults to a flat bordered white surface; only its raised tone applies the raised shadow. Reuse shared shadows rather than adding local effects. Exact shadow values live in the sidecar.

## Shapes

Controls and cards use the medium radius; segmented-control tracks use the large radius, while chips and radio circles use full rounding. Buttons also support a pill shape. The medium-size button uses the large radius; other button sizes use the medium radius. Standard and strong borders are one unit; the selected onboarding panel uses two.

## Components

### Buttons

Essential solid is the lime main action; neutral solid is ink with white text. Accent, danger, success, and warning colors preserve their semantic roles. Bordered and ghost treatments reduce emphasis without changing action meaning. Solid colors follow their shared hover and pressed steps; bordered and ghost surfaces use low and strong surface feedback.

All sizes provide a minimum 48-unit target and grow with type. Default padding is 12px vertically and 16px horizontally; labels wrap. Disabled/loading treatment uses a muted strong surface; loading retains the label, adds a spinner, announces busy state, and prevents duplicate execution. Press feedback scales to 0.98 using shared short timing.

### Cards / Containers

White/default, low/muted, raised, and inverse tones share a thin border and continuous rounded corners. Padding variants follow the shared scale: small (12px), medium (16px), large (20px). Raised tone alone adds the shared raised shadow.

### Inputs / Fields

White fields use a subtle border and rounded corners, shifting to default border on hover and olive on focus. Error text and border identify invalid state; disabled fields use low surfaces. Fields begin at a 48-unit minimum and expand with font scale. Labels, optional markers, helper messages, and errors retain accessible associations. Errors remain readable text and announce updates politely.

### Chips

Selectable chips are bordered pills with 48-unit targets. Selected chips use olive text/border and a translucent olive wash; hover and press strengthen the wash. These compact bounded labels differ from wrapping form controls.

### Navigation

SegmentedTabs uses a low-surface bordered track, equally sized 48-unit tabs, and an ink or olive selected indicator with inverse text. The indicator alone moves using the shared thumb duration. Labels can wrap. The preview sidecar records visual samples; it does not implement app navigation.

Role navigation uses Expo Router Tabs with three equally weighted destinations per role. Each destination combines a 24-unit outline icon with a Hanken Grotesk navigation label; selected labels use the active weight. A pale selection-lime rounded tile and olive icon/text identify the active destination. Inactive icon/text uses muted text. The white bar has a subtle one-unit top border and no elevation. Item margins are 6 units horizontally, with medium rounding applied to both the item and native pressable so the selected fill clips consistently. Native PlatformPressable preserves navigator events and interaction behavior.

The bar grows to `max(76, 72 × fontScale)` units plus the bottom safe-area inset, with 6 units top padding and `6 + bottomInset` bottom padding. It hides when the keyboard opens. Labels remain below their icons. Shared header content is 64 units high plus the top safe-area inset, with 24-unit horizontal padding, the established Palla wordmark, and a 48-unit circular notification target. Its 24-unit bell uses ink on a low surface; pressing raises the surface tone. Notifications use a separate stack screen with Back. The role destinations and deferred content scope are recorded in `.impeccable/navigation-brief.md`.

### Onboarding radio panels

Approved option A uses white unselected panels and a pale lime selected panel with olive outline. Panels have 24px padding, a 144-unit minimum height, line icons, title/body text, and a trailing radio circle. Selection is exposed explicitly; arrow keys move selection on web. The player form has three steps; the organizer form has two and finishes after the name. The form shows a mode-specific step count, adds Back after mode selection, keeps Sign out available, preserves drafts, and shows failures inline. Approved category option C uses guided radio choices with a category selector and separate beginner/unknown answers; the category question appears only in player onboarding. Organizer access is immediate after saving.

## Do's and Don'ts

### Do:

- Do reuse semantic colors and shared atoms for new screens.
- Do use Hanken Grotesk for headings and body text, and proportional Geist for compact metadata.
- Do preserve visible keyboard focus, readable errors, and controls that expand with text.
- Do retain scrolling, safe areas, and keyboard accommodation in mobile forms.

### Don't:

- Don't introduce dark-mode inversion or a second local palette.
- Don't use lime as small text on white or pale surfaces.
- Don't treat Geist or legacy Mono-named token keys as a monospace design direction.
- Don't replace the approved stacked onboarding choices with a new composition.

Evidence: source tokens/atoms and `docs/design-system.md`; approved direction in `.impeccable/onboarding-brief.md`. Web review captures are under `.impeccable/review/` (onboarding mobile/name/desktop and signup mobile/desktop). These are development evidence, not shipping imagery or native-device verification. The option mock's generation prompt is `.impeccable/mocks/onboarding-options.prompt.txt`. No shipping raster was added, and no CLI detector or measurement tool ran.

Role-navigation evidence: shared source under `src/components/navigation/`, approved `.impeccable/mocks/role-navigation.png` with the later Search-icon amendment, and native player/organizer captures under `.impeccable/review/native/navigation/`. Preview tests exercise the shipped navigator without authenticated account writes; precise coverage and limits are recorded in `docs/native-testing.md`. No browser validation or CLI visual detector ran for navigation.
