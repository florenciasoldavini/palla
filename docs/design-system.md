# Palla design system

Palla uses a light-only interface with warm pale surfaces, dark ink text, and a lime brand accent. iOS, Android, and web share the same semantic roles. System dark-mode preference must not invert the app.

## Source of truth

- `src/theme/tokens.js`: primitive palettes, semantic colors, typography, spacing, radius, elevation, motion, and control dimensions.
- `src/components/atoms/theme.ts`: React Native-facing aliases for those tokens.
- `src/components/atoms/motion.ts`: converts numeric motion tokens into Reanimated easing functions.
- `src/components/atoms/`: product-facing components. Gluestack primitives in `src/components/ui/` are implementation details.

Use primitives to define roles, semantic roles to define component appearances, and shared components to build screens. Use radius tokens for corners and spacing tokens for layout. Brand lime is a background/highlight; readable accent text and focus indicators use dark olive. Do not introduce a second local palette or raw shadows inside components.

## Typography

Hanken Grotesk is the primary interface face. Geist is a secondary proportional face for compact metadata, not a monospace font. Native weights resolve to the corresponding bundled font files.

| Component role       | Use                                         |
| -------------------- | ------------------------------------------- |
| Heading hero/title   | Primary screen heading, level 1 by default  |
| Heading section      | Major section heading, level 2              |
| Heading card         | Subordinate heading, level 3                |
| Text body            | Main explanatory copy                       |
| Text bodySm/caption  | Secondary details and helper messages       |
| Text label/formLabel | Control labels                              |
| Text meta            | Short metadata, not long error explanations |

Heading levels can be overridden when the document structure requires it. Do not use heading styles on plain descriptive copy. Inputs use at least 16px on web to avoid iOS browser zoom. Native controls allow text scaling; buttons and inputs expand rather than relying only on fixed heights.

## Actions and states

| Button color    | Meaning                                               |
| --------------- | ----------------------------------------------------- |
| essential       | Main lime call to action                              |
| neutral         | Standard action in ink                                |
| accent          | Olive emphasis                                        |
| danger          | Destructive action, with confirmation when persistent |
| success/warning | Explicit outcome/action semantics, not decoration     |

Use solid for primary emphasis, bordered for a secondary action, and ghost for a low-emphasis action. Avoid multiple equally dominant actions. Icon-only actions require an accessible label.

Button foreground/background states resolve in one component styling path. Inline fixed base colors must not compete with class-based hover/pressed colors. Loading keeps the action's label, adds a spinner, announces busy state, and prevents duplicate execution. Disabled controls announce disabled state; an optional disabled-press handler may explain why an action is unavailable.

All interactive surfaces need visible keyboard focus on web. Native touch targets have a minimum 48-unit area; compact-looking controls must preserve that target. Text can wrap in buttons and segmented controls. Single-line truncation belongs only to intentionally bounded metadata.

### Empty and error states

`EmptyState` and `ErrorState` share the existing card, heading, body and button primitives. Use `panel` for a section, `inline` beside retained data, and `fullScreen` for unavailable screen content. Set `contained` inside an existing card to avoid another enclosing panel. Inline layouts stack above a 1.2 font scale or below 360 units of window width. Copy distinguishes an empty result from a failed request; optional actions give a relevant next step. Retry supports busy and disabled states. Placement and API examples are in `docs/ui-states.md`; native evidence and limits are in `docs/native-testing.md`.

## Forms

Text and numeric fields and textareas generate stable IDs shared by their labels and helper/error messages. Web inputs announce labels, required/invalid state, and descriptions. Native inputs provide accessible names and hints. Label-less fields must supply an accessible label through the caller.

Optional labels explicitly say optional. Error messages are readable text, not color alone, and announce updates politely. Grouped selection fields share a labelled group; individual options announce their values and selection state.

## Motion and startup

Interaction motion uses shared durations and easing; press feedback stays brief and runs through Reanimated. Reduced-motion behavior follows the platform setting. Segmented controls animate only their indicator, not page content.

The splash waits for application readiness, not completion of a decorative sequence. Once ready, it fades within 160ms (immediately for reduced motion). The extended illustration may continue during genuine initialization but must not delay usable content. Verify the native splash in a release build.

## Verification

Contrast regression tests cover text, placeholder, focus, and action foreground/background pairs. Aim for at least 4.5:1 for normal text and 3:1 for meaningful control/focus indicators. Disabled controls are exempt but should remain understandable.

Before shipping a component, inspect default, hover, keyboard focus, pressed, disabled, loading, invalid, and long-content states. Run UI and flow checks in iOS Simulator and Android Emulator: native keyboards, large text, screen readers, safe areas, scrolling, back navigation, and reduced motion. Do not use browser viewports or web screenshots as native validation. Source checks alone do not prove native usability.

## Account onboarding

Onboarding uses two short steps: starting mode, then name. Stacked radio panels keep Player and Organizer visible together. Use `onboardingTitle` and `onboardingRole` typography tokens; selected panels use the pale lime primitive with the semantic olive focus/border role, and primary actions use the essential button variant. First name is required; last name is optional. Keep server failures inline, retain drafts during back navigation, and block duplicate submissions while saving.

The header includes a step count. The first step offers sign out; the name step adds Back. Radio panels support keyboard arrows and expose explicit checked state on web. The development preview is separate from production account setup.

### Icons on tinted backgrounds

Use `AppIconTile` for decorative icons on a rounded square surface. Its lilac tone owns the `surfaceRaised` background and primary text icon color, with a 44px tile, 22px icon, 2px stroke and 12px corners. Do not override these colors or dimensions in individual screens. The neon tone has its own fixed brand background/foreground pair. Notification inbox and settings use `NotificationIcon`, which shares the notification-type-to-icon mapping and renders this atom. Reviewer avatars remain a separate treatment.

Pair an icon with a lighter background from the same color family, using a darker tone for the icon. For brand icons use `volt[100]` behind `volt[800]`; never place green icons on lilac backgrounds. Blocking explanation rows use pale lilac circles with dark lilac icons (`#6b6385`), keeping this secondary information quiet. Align icon circles vertically with the complete adjacent text group, and keep separators outside that group so padding does not shift the alignment.

### List-filter chips

Use `FilterChipGroup` with `FilterChip` from the shared atoms for list filters. Supply `label`, `selected`, `onPress`, and an optional `count`/accessible count label. Chat and notification inboxes consume this same component; keep typography, spacing, surfaces, borders and selected/pressed states inside the shared implementation. Filter counts must come from the feature's authoritative totals, not from the currently loaded page. Form selection remains `SelectableChip`; navigation tabs remain `AppTabs`.

TextAreaField supports an explicit minHeight for compact form contexts (the review sheet uses 96 units). Its standard height, typography, padding, validation, and surface rules remain the default elsewhere.

AppBadge supports an essential tone for the approved Reviewed completion state: neon fill with dark olive text and an optional matching icon. It remains a passive status pill, distinct from selectable filter chips and action buttons.

### Bottom sheets

`AppBottomSheet` in `src/components/atoms/bottom-sheet.tsx` is the shared sheet shell for reviews and session announcements. It owns the backdrop, safe areas, keyboard avoidance, scrollable content, circular close action, modal toast host and reduced-motion-aware entrance. Callers own dirty-close confirmations and busy state. An optional footer keeps the primary composer action above the keyboard while the form scrolls. The sheet can shrink to the keyboard-reduced viewport, preserving its header safe area. Announcement writing and reading use this shell; list notification cards remain compact and white regardless of read state.

### Avatars and people groups

Use shared `AppAvatar` and `AvatarGroup` for passive people summaries. Photos fall back to initials, including when loading fails. Initials use semantic neutral or info background/text pairs. Groups overlap circular avatars with a surface-colored separator, show at most five circles by default (including a `+N` overflow), and expose one accessible people count. Pass the surrounding surface color when it differs from white. Loading uses circular skeletons; empty groups render nothing. Announcement recipients use 36-point avatars beside the confirmed-player count, populated from the existing authorized roster.

### Structured cancellation reasons

The dedicated cancellation screen uses white rounded reason rows on the lilac canvas, with a small same-tone icon tile and a trailing radio indicator. Selection uses a pale volt fill and dark olive outline/radio; the selected icon sits on white. All reasons remain visible in one scrollable screen. The optional message uses the shared white-on-tinted field treatment, and the final destructive action uses the existing danger button. Session summaries are shared between announcements and cancellations.
