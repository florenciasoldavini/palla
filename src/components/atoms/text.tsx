import { atomPalette, atomTypeScale } from "@/components/atoms/theme";
import { getSecondaryFontStyle, getSansFontStyle } from "@/theme/fonts";
import type { ReactNode } from "react";
import {
  Text,
  useWindowDimensions,
  type StyleProp,
  type TextProps,
  type TextStyle
} from "react-native";

type TextBodyVariant = "body" | "bodySm" | "caption" | "formLabel";
type TextVariant = TextBodyVariant | "label" | "meta" | "eyebrow";

function sansTypeStyle(
  tokenName: "bodyMd" | "bodySm" | "caption" | "label" | "buttonSm"
): TextStyle {
  const token = atomTypeScale[tokenName];

  return {
    fontSize: token.fontSize,
    lineHeight: token.lineHeight,
    letterSpacing: token.letterSpacing,
    textTransform: token.textTransform,
    ...getSansFontStyle(token.fontWeight)
  };
}

function secondaryTypeStyle(
  tokenName: "label" | "labelMono" | "meta" | "eyebrow"
): TextStyle {
  const token = atomTypeScale[tokenName];

  return {
    fontSize: token.fontSize,
    lineHeight: token.lineHeight,
    letterSpacing: token.letterSpacing,
    textTransform: token.textTransform,
    ...getSecondaryFontStyle(token.fontWeight)
  };
}

const variantStyles: Record<TextVariant, TextStyle> = {
  body: sansTypeStyle("bodyMd"),
  bodySm: sansTypeStyle("bodySm"),
  caption: sansTypeStyle("caption"),
  formLabel: {
    ...secondaryTypeStyle("label")
  },
  label: {
    ...sansTypeStyle("buttonSm")
  },
  meta: secondaryTypeStyle("meta"),
  eyebrow: secondaryTypeStyle("eyebrow")
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
  // Scale font and line box together: native custom-font scaling can clip fixed line heights.
  const { fontScale } = useWindowDimensions();
  const typography = variantStyles[variant];
  return (
    <Text
      allowFontScaling={false}
      style={[
        {
          ...typography,
          fontSize: Number(typography.fontSize) * fontScale,
          lineHeight: Number(typography.lineHeight) * fontScale
        },
        toneStyles[tone],
        style
      ]}
      {...props}
    >
      {children}
    </Text>
  );
}
