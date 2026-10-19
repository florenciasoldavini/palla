import { AppText } from "@/components/atoms/text";
import type { AppIconComponent } from "@/components/icons";
import { atomPalette, atomRadii, atomSpacing } from "@/components/atoms/theme";
import type { ReactNode } from "react";
import { View, type ViewStyle } from "react-native";

type BadgeTone = "default" | "accent" | "success" | "danger" | "essential";

const toneStyles: Record<BadgeTone, ViewStyle> = {
  essential: {
    backgroundColor: atomPalette.brand,
    borderColor: atomPalette.brand
  },
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

const iconColors = {
  essential: atomPalette.brandText,
  accent: atomPalette.accent,
  danger: atomPalette.errorText,
  default: atomPalette.textMuted,
  success: atomPalette.successText
} as const;

const textTones = {
  essential: "default",
  accent: "accent",
  danger: "danger",
  default: "muted",
  success: "success"
} as const;

export function AppBadge({
  children,
  tone = "default",
  icon: Icon
}: {
  children: ReactNode;
  tone?: BadgeTone;
  icon?: AppIconComponent;
}) {
  return (
    <View
      style={{
        alignSelf: "flex-start",
        alignItems: "center",
        flexDirection: "row",
        gap: atomSpacing[1],
        maxWidth: "100%",
        borderRadius: atomRadii.full,
        borderWidth: 1,
        paddingHorizontal: atomSpacing[3],
        paddingVertical: atomSpacing[1],
        ...toneStyles[tone]
      }}
    >
      {Icon && <Icon size={16} color={iconColors[tone]} />}
      <AppText
        tone={textTones[tone]}
        variant={tone === "essential" ? "label" : "meta"}
        style={
          tone === "essential"
            ? { color: atomPalette.brandText, flexShrink: 1 }
            : undefined
        }
      >
        {children}
      </AppText>
    </View>
  );
}
