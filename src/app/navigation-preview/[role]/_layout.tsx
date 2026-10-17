import { RoleTabs } from "@/components/navigation/role-tabs";
import { useLocalSearchParams } from "expo-router";
export default function PreviewTabs() {
  const { role } = useLocalSearchParams<{ role: string }>();
  return (
    <RoleTabs
      mode={role === "organizer" ? "organizer" : "player"}
      routes={{
        home: "home",
        secondary: "secondary",
        messages: "messages",
        profile: "profile"
      }}
      notificationsPath="/navigation-preview/notifications"
    />
  );
}
