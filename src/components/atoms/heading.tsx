import { atomPalette, atomTypeScale } from "@/components/atoms/theme";
import { getSansFontStyle } from "@/theme/fonts";
import type { ReactNode } from "react";
import {
  Text,
  useWindowDimensions,
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
  level,
  children,
  style,
  tone = "default",
  variant = "section",
  ...props
}: TextProps & {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  tone?: HeadingTone;
  variant?: HeadingVariant;
}) {
  // Match the scaled font with a scaled line box so accessibility text stays readable.
  const { fontScale } = useWindowDimensions();
  const typography = headingStyles[variant];
  return (
    <Text
      allowFontScaling={false}
      accessibilityRole="header"
      aria-level={
        level ??
        (variant === "hero" || variant === "title"
          ? 1
          : variant === "section"
            ? 2
            : 3)
      }
      style={[
        {
          ...typography,
          fontSize: Number(typography.fontSize) * fontScale,
          lineHeight: Number(typography.lineHeight) * fontScale
        },
        headingToneStyles[tone],
        style
      ]}
      {...props}
    >
      {children}
    </Text>
  );
}
