import { AppText } from "@/components/atoms/text";
import { atomPalette, atomRadii, atomSpacing } from "@/components/atoms/theme";
import type { ReactNode } from "react";
import { View, type ViewStyle } from "react-native";

type BadgeTone = "default" | "accent" | "success" | "danger";

const toneStyles: Record<BadgeTone, ViewStyle> = {
  accent: {
    backgroundColor: `${atomPalette.accent}14`,
    borderColor: `${atomPalette.accent}33`
  },
  danger: {
    backgroundColor: atomPalette.errorSurface,
    borderColor: `${atomPalette.error}33`
  },
  default: {
    backgroundColor: atomPalette.surfaceLow,
    borderColor: atomPalette.borderSubtle
  },
  success: {
    backgroundColor: atomPalette.successSurface,
    borderColor: `${atomPalette.success}33`
  }
};

const textTones = {
  accent: "accent",
  danger: "danger",
  default: "muted",
  success: "success"
} as const;

export function AppBadge({
  children,
  tone = "default"
}: {
  children: ReactNode;
  tone?: BadgeTone;
}) {
  return (
    <View
      style={{
        alignSelf: "flex-start",
        borderRadius: atomRadii.full,
        borderWidth: 1,
        paddingHorizontal: atomSpacing[3],
        paddingVertical: atomSpacing[1],
        ...toneStyles[tone]
      }}
    >
      <AppText tone={textTones[tone]} variant="meta">
        {children}
      </AppText>
    </View>
  );
}
