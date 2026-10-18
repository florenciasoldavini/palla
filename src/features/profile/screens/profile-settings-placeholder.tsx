import { View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import Constants from "expo-constants";
import { ArrowLeft } from "lucide-react-native";
import {
  AppButton,
  AppHeading,
  AppText,
  EmptyState,
  Screen
} from "@/components/atoms";
import { profileMenu } from "../profile-menu";

const copy: Record<string, { title: string; description: string }> = {
  privacy: {
    title: "Your privacy controls",
    description:
      "Privacy settings and your blocked-users list will be available here. You can still block or unblock people from Messages."
  },
  payments: {
    title: "Payment methods",
    description:
      "Payment settings are planned for a future update. For now, arrange session payments directly with your organizer or club."
  },
  support: {
    title: "Here to help",
    description:
      "Help resources and community rules will be available here. You can already report a user from the Messages menu."
  },
  about: {
    title: "About Palla",
    description:
      "Social padel, organized. Terms, privacy policy and more information about Palla will be available here."
  }
};
export default function ProfileSettingsPlaceholder() {
  const { section } = useLocalSearchParams<{ section: string }>();
  const router = useRouter();
  const item = profileMenu.find((row) => row.id === section);
  const content = copy[section];
  return (
    <Screen>
      <View style={{ gap: 24 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <AppButton
            variant="ghost"
            layout="icon"
            fullWidth={false}
            icon={ArrowLeft}
            accessibilityLabel="Back to profile"
            onPress={() =>
              router.canGoBack() ? router.back() : router.replace("/")
            }
          />
          <AppHeading variant="section" style={{ flex: 1 }}>
            {item?.title ?? "Settings"}
          </AppHeading>
        </View>
        <EmptyState
          icon={item?.icon}
          title={content?.title ?? "Page unavailable"}
          description={
            content?.description ??
            "Return to your profile to choose another setting."
          }
        />
        {content && (
          <AppText
            variant="caption"
            tone="subtle"
            style={{ textAlign: "center" }}
          >
            {section === "about"
              ? `Version ${Constants.expoConfig?.version ?? "1.0.0"}`
              : "Coming soon"}
          </AppText>
        )}
      </View>
    </Screen>
  );
}
