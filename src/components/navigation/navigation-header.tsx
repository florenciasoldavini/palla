import { useState } from "react";
import { PallaWordmark } from "@/components/brand/palla-wordmark";
import { atomPalette, atomSpacing } from "@/components/atoms/theme";
import { Bell } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function NavigationHeader({
  onNotifications
}: {
  onNotifications: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [pressed, setPressed] = useState(false);
  return (
    <View
      style={{
        paddingTop: insets.top,
        backgroundColor: atomPalette.background
      }}
    >
      <View
        style={{
          height: 64,
          paddingHorizontal: atomSpacing[6],
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between"
        }}
      >
        <PallaWordmark />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            onPress={onNotifications}
            onPressIn={() => setPressed(true)}
            onPressOut={() => setPressed(false)}
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: pressed
                ? atomPalette.surfaceRaised
                : atomPalette.surfaceLow
            }}
          >
            <Bell size={24} color={atomPalette.text} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
