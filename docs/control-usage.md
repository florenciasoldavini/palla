# Shared control usage

## Buttons

Text actions use AppButton with a fixed 12px corner radius for every size and color. Choose solid, bordered or ghost by emphasis; there is no pill-shape prop. Essential actions use neon with deep green text; neutral solid actions use ink with white text. Icon-only actions use `layout="icon"` and are circular. Ghost actions always have a transparent fill and no border, including when pressed, disabled or loading. Use a bordered icon button when a visible circular surface is needed, such as photo-viewer controls.

Pills belong to chips, filters and badges. Selectable court-position cards and segmented options are choices, not ordinary action buttons. Do not add local radius overrides to create another button shape; shared AppButton enforces action geometry after caller layout styles.

## Field surfaces

| Container              | Field fill                         |
| ---------------------- | ---------------------------------- |
| White card/panel       | Pale lilac, `surfaceLow` (#f4f2fd) |
| Lilac page/inset panel | White, `surface` (#ffffff)         |

TextField, native NumericField, TextAreaField, FieldTrigger and native SelectMenu triggers inherit this rule. Search uses TextField and follows it too. All retain 12px corners and the same minimum scalable 48px target. Focus, validation errors and disabled states preserve the fill; borders, messages and muted disabled text express state. Multiline inputs retain 12px vertical padding and top alignment. Input text starts at 16px and explicitly follows the same window font scale as AppText, with native automatic scaling disabled to avoid mismatched custom-font sizes. TextAreaField scales its line height alongside its font.

AppCard provides the field context for its resolved background (including a background overridden through its style). Screen provides the canvas context. Custom containers declare their actual surface with `FieldSurface surface="white"` or `surface="tinted"`; the provider adds no native layout wrapper. WizardCard, the white chat composer, and the white photo caption footer are covered; chat safety content explicitly declares its lilac sheet surface. Nested cards override their parent's context.

The component tokens are `designTokens.controls.fields.onWhite` and `onTinted`. The previous `appearance="soft"` escape hatch has been removed; fields no longer select their own surface or change geometry to get a different fill. Prefer AppCard for panel surfaces and declare FieldSurface on other custom form containers.

## Checks

When adding a form, check its inputs on the actual parent surface, including focused, invalid and disabled states. Verify both native platforms; include textareas, picker triggers, search and icon actions where relevant. Keep helper/placeholder contrast and larger-text layout intact. Existing contrast tests include both field fills.

## Feedback

Use `useAppToast` for transient action results: save success, save/request failure, password changes, and logout failures. Confirm success only after the operation succeeds. On failure, preserve the user's input so they can retry. Use a warning when the main operation succeeded but a secondary task failed; retain a reachable retry action for that unresolved task.

Keep field validation, input-specific problems (including photo selection), and form constraints inline beside the relevant control. Loading and persistent page/section failures remain explicit states with recovery controls; they should not depend on a short-lived toast. Do not replace validation messages with toasts on each keystroke.

`AppToastProvider` lives inside the root safe-area provider. Use the shared hook instead of the lower-level UI toast hook. It hosts one result at a time above native navigation and replaces the previous result when another arrives. A completed older action must not dismiss its newer result.

Toast appearance uses `designTokens.controls.toasts`: all variants share the same dark shell, white title, muted lilac description and gray dismiss icon. There are no colored borders. Standard success/error/warning/info variants use a pale status tile and darker icon of the same family; compact success uses a neon circle and dark check. Action buttons use a slightly lighter charcoal fill, white text and rectangular 12px corners. Retry actions include a retry icon by default; another action can supply its own icon.

- `variant="compact"`: content-sized capsule for brief feedback such as clipboard copy; no description or action; dismisses after 3 seconds. Supporting detail or an action automatically uses the standard layout.
- Standard success/info: 16px card corners, optional detail; dismisses after 4.5 seconds.
- Error, warning, or any actionable toast: persists until action, explicit dismissal, or replacement. `duration` can override this; `null` explicitly requests persistence.
- Every toast has a gray close control with a 48px touch target. Retry actions show progress, prevent repeated presses while busy and support async callbacks. Rejected callbacks leave a retryable error. Dismissal does not cancel an operation already in progress.

Toast geometry and typography use explicit shared styling above native navigation. The compact capsule is a toast-container shape; text action buttons still follow the shared rectangular-button rules.

Toast motion uses Reanimated on the UI thread: a 280ms ease-out fade with an 8px downward settle on entry and a 200ms fade on exit. Reduce Motion removes translation and keeps a gentle fade. Keep the overlay host mounted so exit animations finish; the empty host must pass touches through to the app.
