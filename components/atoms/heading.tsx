import { atomPalette, atomTypeScale } from "@/components/atoms/theme";
import { getSansFontStyle } from "@/theme/fonts";
import type { ReactNode } from "react";
import {
  Text,
  type StyleProp,
  type TextProps,
  type TextStyle
} from "react-native";

type HeadingVariant = "hero" | "title" | "section" | "card";
type HeadingTone = "default" | "muted" | "inverse";

function headingTypeStyle(tokenName: HeadingVariant): TextStyle {
  const token = atomTypeScale[tokenName];

  return {
    fontSize: token.fontSize,
    lineHeight: token.lineHeight,
    letterSpacing: token.letterSpacing,
    ...getSansFontStyle(token.fontWeight)
  };
}

const headingStyles: Record<HeadingVariant, TextStyle> = {
  hero: headingTypeStyle("hero"),
  title: headingTypeStyle("title"),
  section: headingTypeStyle("section"),
  card: headingTypeStyle("card")
};

const headingToneStyles: Record<HeadingTone, TextStyle> = {
  default: { color: atomPalette.text },
  muted: { color: atomPalette.textMuted },
  inverse: { color: atomPalette.textInverse }
};

export function AppHeading({
  children,
  style,
  tone = "default",
  variant = "section",
  ...props
}: TextProps & {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  tone?: HeadingTone;
  variant?: HeadingVariant;
}) {
  return (
    <Text
      style={[headingStyles[variant], headingToneStyles[tone], style]}
      {...props}
    >
      {children}
    </Text>
  );
}
