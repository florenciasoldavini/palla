import { useState, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { AppText } from "./text";
import {
  atomPalette as c,
  atomRadii,
  atomControlHeights,
  atomSpacing as sp
} from "./theme";

/** Single-choice list filter. Counts are optional and never determine selection. */
export function FilterChip({
  label,
  selected,
  count,
  accessibilityLabel,
  disabled = false,
  onPress
}: {
  label: string;
  selected: boolean;
  count?: number;
  accessibilityLabel?: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        accessibilityLabel ??
        (count === undefined ? label : `${label}, ${count}`)
      }
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[
        styles.chip,
        {
          backgroundColor: selected
            ? pressed
              ? c.surfaceInversePressed
              : c.text
            : pressed
              ? c.surfaceStrong
              : c.surfaceRaised,
          borderColor: selected ? c.text : c.borderSubtle,
          opacity: disabled ? 0.72 : 1
        }
      ]}
    >
      <AppText
        variant="label"
        numberOfLines={1}
        style={{ color: selected ? c.textInverse : c.textSubtle }}
      >
        {label}
      </AppText>
      {count !== undefined && (
        <View
          style={[
            styles.count,
            { backgroundColor: selected ? c.brand : c.surfaceStrong }
          ]}
        >
          <AppText
            variant="caption"
            style={{ color: selected ? c.text : c.textSubtle }}
          >
            {count > 99 ? "99+" : count}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

/** Keeps spacing and overflow behavior consistent as filters or text size grow. */
export function FilterChipGroup({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      horizontal
      keyboardShouldPersistTaps="handled"
      showsHorizontalScrollIndicator={false}
      style={styles.group}
      contentContainerStyle={styles.groupContent}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  group: { flexGrow: 0, flexShrink: 0 },
  groupContent: { flexDirection: "row", gap: sp[2], paddingVertical: sp[1] },
  chip: {
    flexDirection: "row",
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: sp[2],
    minHeight: atomControlHeights.sm,
    paddingHorizontal: sp[4],
    paddingVertical: sp[2],
    borderRadius: atomRadii.full,
    borderWidth: 1
  },
  count: {
    minWidth: sp[6],
    minHeight: sp[6],
    paddingHorizontal: sp[1],
    borderRadius: atomRadii.full,
    alignItems: "center",
    justifyContent: "center"
  }
});
