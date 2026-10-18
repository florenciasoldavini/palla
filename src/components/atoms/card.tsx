import { FieldSurface } from "./field-surface";
import {
  atomCardRadius,
  atomPalette,
  atomShadows,
  atomSpacing
} from "@/components/atoms/theme";
import { designTokens } from "@/theme/tokens";
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
    borderColor: atomPalette.borderSubtle
  },
  muted: {
    backgroundColor: atomPalette.surfaceLow,
    borderColor: atomPalette.borderSubtle
  },
  raised: {
    backgroundColor: atomPalette.surfaceRaised,
    borderColor: atomPalette.borderSubtle,
    boxShadow: atomShadows.raised
  },
  inverse: {
    backgroundColor: atomPalette.text,
    borderColor: atomPalette.text
  }
};

const paddingStyles: Record<CardPadding, ViewStyle> = {
  sm: { padding: atomSpacing[3] },
  md: { padding: atomSpacing[4] },
  lg: { padding: atomSpacing[5] }
};

export function AppCard({
  children,
  padding = "md",
  surface,
  style,
  tone = "default",
  ...props
}: ViewProps & {
  children: ReactNode;
  padding?: CardPadding;
  surface?: "panel" | "inset" | "row";
  style?: StyleProp<ViewStyle>;
  tone?: CardTone;
}) {
  const background = StyleSheet.flatten([
    toneStyles[tone],
    style
  ])?.backgroundColor;
  return (
    <FieldSurface
      surface={background === atomPalette.surface ? "white" : "tinted"}
    >
      <UICard
        className="border p-0"
        size="md"
        style={StyleSheet.flatten([
          {
            borderRadius: atomCardRadius,
            borderWidth: designTokens.border.widthDefault,
            borderCurve: "continuous",
            overflow: "hidden"
          },
          toneStyles[tone],
          paddingStyles[padding],
          surface
            ? {
                borderRadius: designTokens.controls.surfaces[surface].radius,
                padding: designTokens.controls.surfaces[surface].padding
              }
            : null,
          style
        ])}
        variant="outline"
        {...props}
      >
        {children}
      </UICard>
    </FieldSurface>
  );
}
