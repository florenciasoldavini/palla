import { StyleSheet, View } from "react-native";
import type { AppIconComponent } from "@/components/icons";
import { atomPalette, atomRadii } from "./theme";

const tones = {
  lilac: {
    background: atomPalette.surfaceRaised,
    foreground: atomPalette.text
  },
  neon: { background: atomPalette.brand, foreground: atomPalette.brandText }
} as const;

/** Decorative icon + surface. Each tone owns its colors across all consumers. */
export function AppIconTile({
  icon: Icon,
  tone = "lilac"
}: {
  icon: AppIconComponent;
  tone?: keyof typeof tones;
}) {
  const colors = tones[tone];
  return (
    <View
      style={[styles.tile, { backgroundColor: colors.background }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Icon size={22} strokeWidth={2} color={colors.foreground} />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: 44,
    height: 44,
    flexShrink: 0,
    borderRadius: atomRadii.md,
    alignItems: "center",
    justifyContent: "center"
  }
});
