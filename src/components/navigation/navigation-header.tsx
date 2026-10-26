import { useState, type ReactNode } from "react";
import { PallaWordmark } from "@/components/brand/palla-wordmark";
import { atomPalette, atomSpacing } from "@/components/atoms/theme";
import { Bell } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function NavigationHeader({
  onNotifications,
  unread = 0,
  leading
}: {
  onNotifications: () => void;
  unread?: number;
  leading?: ReactNode;
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
        {leading ? (
          <View style={{ flex: 1, minWidth: 0, marginRight: 16 }}>
            {leading}
          </View>
        ) : (
          <PallaWordmark />
        )}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              unread ? `Notifications, ${unread} unread` : "Notifications"
            }
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
            {unread > 0 && (
              <View
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: atomPalette.brand
                }}
              />
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}
