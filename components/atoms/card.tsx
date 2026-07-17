import {
  atomCardRadius,
  atomPalette,
  atomSpacing
} from "@/components/atoms/theme";
import { Card as UICard } from "@/components/ui/card";
import type { ReactNode } from "react";
import {
  StyleSheet,
  type StyleProp,
  type ViewProps,
  type ViewStyle
} from "react-native";

type CardTone = "default" | "muted" | "raised" | "inverse";
type CardPadding = "sm" | "md" | "lg";

const toneStyles: Record<CardTone, ViewStyle> = {
  default: {
    backgroundColor: atomPalette.surface,
    borderColor: atomPalette.border
  },
  muted: {
    backgroundColor: atomPalette.surfaceLow,
    borderColor: atomPalette.border
  },
  raised: {
    backgroundColor: atomPalette.surfaceRaised,
    borderColor: atomPalette.border
  },
  inverse: {
    backgroundColor: atomPalette.text,
    borderColor: atomPalette.text
  }
};

const paddingStyles: Record<CardPadding, ViewStyle> = {
  sm: { padding: atomSpacing[4] },
  md: { padding: atomSpacing[5] },
  lg: { padding: atomSpacing[6] }
};

export function AppCard({
  children,
  padding = "md",
  style,
  tone = "default",
  ...props
}: ViewProps & {
  children: ReactNode;
  padding?: CardPadding;
  style?: StyleProp<ViewStyle>;
  tone?: CardTone;
}) {
  return (
    <UICard
      className="border p-0"
      size="md"
      style={StyleSheet.flatten([
        {
          borderRadius: atomCardRadius,
          overflow: "hidden"
        },
        toneStyles[tone],
        paddingStyles[padding],
        style
      ])}
      variant="outline"
      {...props}
    >
      {children}
    </UICard>
  );
}
