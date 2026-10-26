import { Pressable } from "react-native";
import { useRouter } from "expo-router";
import { ChevronDown, MapPin } from "lucide-react-native";
import { AppHeading } from "@/components/atoms";
import { atomPalette as c } from "@/components/atoms/theme";
import { NavigationHeader } from "@/components/navigation/navigation-header";
import { useNotificationCount } from "@/features/notifications/hooks/use-notifications";
export function DiscoveryNavigationHeader({
  location,
  onLocation
}: {
  location: string;
  onLocation: () => void;
}) {
  const router = useRouter();
  const count = useNotificationCount("player");
  return (
    <NavigationHeader
      unread={count.data ?? 0}
      onNotifications={() =>
        router.push({ pathname: "/notifications", params: { mode: "player" } })
      }
      leading={
        <Pressable
          cssInterop={false}
          accessibilityRole="button"
          accessibilityLabel={`Change location, ${location}`}
          onPress={onLocation}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            minHeight: 48,
            opacity: pressed ? 0.7 : 1
          })}
        >
          <MapPin size={21} color={c.accent} />
          <AppHeading
            variant="section"
            numberOfLines={1}
            style={{ flexShrink: 1 }}
          >
            {location}
          </AppHeading>
          <ChevronDown size={18} color={c.text} />
        </Pressable>
      }
    />
  );
}
