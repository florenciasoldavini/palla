import { RoleTabs } from "@/components/navigation/role-tabs";
import { useLocalSearchParams } from "expo-router";
export default function PreviewTabs() {
  const { role } = useLocalSearchParams<{ role: string }>();
  const mode = role === "organizer" ? "organizer" : "player";
  return (
    <RoleTabs
      mode={mode}
      routes={{
        home: "home",
        secondary: "secondary",
        messages: "messages",
        profile: "profile"
      }}
      notificationsPath={{
        pathname: "/navigation-preview/notifications",
        params: { mode }
      }}
      notificationUnreadCount={2}
    />
  );
}
