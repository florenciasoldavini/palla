import { fontFamilies } from "@/theme/fonts";
import { designTokens } from "@/theme/tokens";

export const atomPalette = {
  background: designTokens.colors.semantic.bg.canvas,
  surface: designTokens.colors.semantic.bg.surface,
  surfaceLow: designTokens.colors.semantic.bg.surfaceLow,
  surfaceRaised: designTokens.colors.semantic.bg.surfaceRaised,
  surfaceStrong: designTokens.colors.semantic.bg.surfaceStrong,
  text: designTokens.colors.semantic.text.primary,
  textMuted: designTokens.colors.semantic.text.secondary,
  textSubtle: designTokens.colors.semantic.text.muted,
  textPlaceholder: designTokens.colors.primitive.ink[300],
  textInverse: designTokens.colors.semantic.text.inverse,
  borderSubtle: designTokens.colors.semantic.border.subtle,
  border: designTokens.colors.semantic.border.default,
  borderStrong: designTokens.colors.semantic.border.strong,
  accent: designTokens.colors.semantic.text.accent,
  accentHover: designTokens.colors.primitive.volt[700],
  accentPressed: designTokens.colors.primitive.volt[900],
  accentText: designTokens.colors.semantic.action.primary.text,
  brand: designTokens.colors.primitive.volt[400],
  brandText: designTokens.colors.primitive.volt[950],
  focus: designTokens.colors.semantic.border.accent,
  error: designTokens.colors.semantic.status.error.accent,
  errorText: designTokens.colors.semantic.status.error.text,
  errorSurface: designTokens.colors.semantic.bg.error,
  success: designTokens.colors.primitive.success[500],
  successText: designTokens.colors.primitive.success[700],
  successSurface: designTokens.colors.semantic.bg.success,
  warning: designTokens.colors.semantic.status.warning.accent,
  warningText: designTokens.colors.semantic.status.warning.text,
  warningSurface: designTokens.colors.semantic.bg.warning
} as const;

export const atomSpacing = designTokens.spacing;
export const atomSemanticSpacing = designTokens.semanticSpacing;
export const atomControlHeights = designTokens.controls.heights;
export const atomControlRadius = designTokens.controls.radius.control;
export const atomCardRadius = designTokens.controls.radius.card;
export const atomLayout = designTokens.layout;
export const atomRadii = designTokens.radius;
export const atomTypeScale = designTokens.typeScale;
export const atomFonts = fontFamilies;
