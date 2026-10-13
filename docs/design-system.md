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
