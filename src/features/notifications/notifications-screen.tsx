import { AppHeading, AppText, Screen } from "@/components/atoms";
import { atomPalette, atomSpacing } from "@/components/atoms/theme";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { Pressable, View } from "react-native";
export default function NotificationsScreen() {
  const router = useRouter();
  return (
    <Screen>
      <View style={{ gap: atomSpacing[5] }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          style={{ width: 48, height: 48, justifyContent: "center" }}
        >
          <ArrowLeft size={24} color={atomPalette.text} />
        </Pressable>
        <AppHeading>Notifications</AppHeading>
        <AppText tone="muted">Session updates will appear here.</AppText>
      </View>
    </Screen>
  );
}
