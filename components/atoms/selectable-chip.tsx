import { AppText } from "@/components/atoms/text";
import { atomPalette, atomRadii, atomSpacing } from "@/components/atoms/theme";
import type { ReactNode } from "react";
import { useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type ViewStyle
} from "react-native";

export type SelectableChipVariant = "bordered";

export function SelectableChip({
  children,
  selected = false,
  variant = "bordered",
  ...props
}: Omit<PressableProps, "children"> & {
  children: ReactNode;
  selected?: boolean;
  variant?: SelectableChipVariant;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      style={[styles.root, Platform.OS === "web" ? styles.webCursor : null]}
      {...props}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.surface,
            variant === "bordered" ? styles.borderedNeutral : null,
            selected ? styles.borderedAccent : null,
            isHovered && !selected ? styles.borderedNeutralHovered : null,
            isHovered && selected ? styles.borderedAccentHovered : null,
            pressed && !selected ? styles.borderedNeutralPressed : null,
            pressed && selected ? styles.borderedAccentPressed : null
          ]}
        >
          <AppText
            numberOfLines={1}
            tone={selected ? "accent" : "default"}
            variant="formLabel"
          >
            {children}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  borderedAccent: {
    backgroundColor: `${atomPalette.accent}10`,
    borderColor: atomPalette.accent
  },
  borderedAccentHovered: {
    backgroundColor: `${atomPalette.accent}14`,
    borderColor: atomPalette.accentHover
  },
  borderedAccentPressed: {
    backgroundColor: `${atomPalette.accent}1A`,
    borderColor: atomPalette.accentPressed
  },
  borderedNeutral: {
    backgroundColor: atomPalette.surface,
    borderColor: atomPalette.border
  },
  borderedNeutralHovered: {
    backgroundColor: atomPalette.surfaceRaised,
    borderColor: atomPalette.borderStrong
  },
  borderedNeutralPressed: {
    backgroundColor: atomPalette.surfaceStrong,
    borderColor: atomPalette.borderStrong
  },
  root: {
    alignSelf: "flex-start"
  },
  surface: {
    alignItems: "center",
    borderRadius: atomRadii.full,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 32,
    paddingHorizontal: atomSpacing[3],
    paddingVertical: atomSpacing[1]
  },
  webCursor: {
    cursor: "pointer"
  } as ViewStyle
});
