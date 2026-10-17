# Shared control usage

## Buttons

Text actions use AppButton with a fixed 12px corner radius for every size and color. Choose solid, bordered or ghost by emphasis; there is no pill-shape prop. Essential actions use neon with deep green text; neutral solid actions use ink with white text. Icon-only actions use `layout="icon"` and are circular. Ghost actions always have a transparent fill and no border, including when pressed, disabled or loading. Use a bordered icon button when a visible circular surface is needed, such as photo-viewer controls.

Pills belong to chips, filters and badges. Selectable court-position cards and segmented options are choices, not ordinary action buttons. Do not add local radius overrides to create another button shape; shared AppButton enforces action geometry after caller layout styles.

## Field surfaces

| Container              | Field fill                         |
| ---------------------- | ---------------------------------- |
| White card/panel       | Pale lilac, `surfaceLow` (#f4f2fd) |
| Lilac page/inset panel | White, `surface` (#ffffff)         |

TextField, native NumericField, TextAreaField, FieldTrigger and native SelectMenu triggers inherit this rule. Search uses TextField and follows it too. All retain 12px corners and the same minimum scalable 48px target. Focus, validation errors and disabled states preserve the fill; borders, messages and muted disabled text express state. Multiline inputs retain 12px vertical padding and top alignment.

AppCard provides the field context for its resolved background (including a background overridden through its style). Screen provides the canvas context. Custom containers declare their actual surface with `FieldSurface surface="white"` or `surface="tinted"`; the provider adds no native layout wrapper. WizardCard, the white chat composer, and the white photo caption footer are covered; chat safety content explicitly declares its lilac sheet surface. Nested cards override their parent's context.

The component tokens are `designTokens.controls.fields.onWhite` and `onTinted`. The previous `appearance="soft"` escape hatch has been removed; fields no longer select their own surface or change geometry to get a different fill. Prefer AppCard for panel surfaces and declare FieldSurface on other custom form containers.

## Checks

When adding a form, check its inputs on the actual parent surface, including focused, invalid and disabled states. Verify both native platforms; include textareas, picker triggers, search and icon actions where relevant. Keep helper/placeholder contrast and larger-text layout intact. Existing contrast tests include both field fills.
