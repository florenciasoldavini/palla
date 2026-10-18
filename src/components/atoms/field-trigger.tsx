import { useFieldBackground } from "./field-surface";
import { AppText } from "./text";
import {
  atomControlHeights,
  atomControlRadius,
  atomPalette,
  atomSpacing
} from "./theme";
import { Pressable, useWindowDimensions, View } from "react-native";
import { useState } from "react";
import type { LucideIcon } from "lucide-react-native";

/** Picker affordance using the same surface, dimensions and type as TextField. */
export function FieldTrigger({
  label,
  value,
  onPress,
  icon: Icon,
  invalid = false,
  expanded = false
}: {
  label: string;
  value: string;
  onPress: () => void;
  icon?: LucideIcon;
  invalid?: boolean;
  expanded?: boolean;
}) {
  const fieldBackground = useFieldBackground();
  const { fontScale } = useWindowDimensions();
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityValue={{ text: value }}
      accessibilityState={{ expanded }}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={{
        backgroundColor: fieldBackground,
        borderColor: invalid
          ? atomPalette.error
          : pressed || expanded
            ? atomPalette.focus
            : atomPalette.borderSubtle,
        borderWidth: 1,
        borderRadius: atomControlRadius,
        minHeight: Math.max(
          atomControlHeights.lg,
          24 * fontScale + atomSpacing[6]
        ),
        paddingHorizontal: atomSpacing[4],
        paddingVertical: atomSpacing[3],
        justifyContent: "center"
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: atomSpacing[3]
        }}
      >
        <AppText variant="body" style={{ flex: 1 }}>
          {value}
        </AppText>
        {Icon && <Icon size={20} color={atomPalette.textSubtle} />}
      </View>
    </Pressable>
  );
}
