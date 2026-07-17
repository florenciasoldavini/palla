import { atomPalette, atomTypeScale } from "@/components/atoms/theme";
import { getMonoFontStyle, getSansFontStyle } from "@/theme/fonts";
import type { ReactNode } from "react";
import {
  Text,
  type StyleProp,
  type TextProps,
  type TextStyle
} from "react-native";

type TextBodyVariant = "body" | "bodySm" | "caption" | "formLabel";
type TextVariant = TextBodyVariant | "label" | "meta" | "eyebrow";

function sansTypeStyle(tokenName: "bodyMd" | "bodySm" | "caption"): TextStyle {
  const token = atomTypeScale[tokenName];

  return {
    fontSize: token.fontSize,
    lineHeight: token.lineHeight,
    letterSpacing: token.letterSpacing,
    textTransform: token.textTransform,
    ...getSansFontStyle(token.fontWeight)
  };
}

function monoTypeStyle(
  tokenName: "label" | "labelMono" | "meta" | "eyebrow"
): TextStyle {
  const token = atomTypeScale[tokenName];

  return {
    fontSize: token.fontSize,
    lineHeight: token.lineHeight,
    letterSpacing: token.letterSpacing,
    textTransform: token.textTransform,
    ...getMonoFontStyle(token.fontWeight)
  };
}

const variantStyles: Record<TextVariant, TextStyle> = {
  body: sansTypeStyle("bodyMd"),
  bodySm: sansTypeStyle("bodySm"),
  caption: sansTypeStyle("caption"),
  formLabel: {
    ...monoTypeStyle("labelMono"),
    textTransform: "uppercase"
  },
  label: monoTypeStyle("label"),
  meta: monoTypeStyle("meta"),
  eyebrow: monoTypeStyle("eyebrow")
};

const toneStyles = {
  default: { color: atomPalette.text },
  muted: { color: atomPalette.textMuted },
  subtle: { color: atomPalette.textSubtle },
  accent: { color: atomPalette.accent },
  inverse: { color: atomPalette.textInverse },
  danger: { color: atomPalette.errorText },
  success: { color: atomPalette.successText }
} satisfies Record<string, TextStyle>;

type TextTone = keyof typeof toneStyles;

export function AppText({
  children,
  style,
  tone = "default",
  variant = "body",
  ...props
}: TextProps & {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  tone?: TextTone;
  variant?: TextVariant;
}) {
  return (
    <Text style={[variantStyles[variant], toneStyles[tone], style]} {...props}>
      {children}
    </Text>
  );
}
