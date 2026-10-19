import { useContext } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AuthContext } from "@/features/auth/auth-provider";
import { useAppToast } from "@/components/atoms";
import { useNotificationSettings } from "./hooks/use-notifications";
import { NotificationSettingsView } from "./components/notification-settings-view";
export default function NotificationPreferencesScreen() {
  const { mode: rawMode } = useLocalSearchParams<{ mode?: string }>(),
    { user } = useContext(AuthContext);
  const mode =
    rawMode === "organizer" && user?.organizer_status === "active"
      ? "organizer"
      : "player";
  const router = useRouter(),
    toast = useAppToast(),
    { query, save } = useNotificationSettings(mode);
  return (
    <NotificationSettingsView
      settings={query.data ?? []}
      loading={query.isPending}
      error={query.isError}
      saving={save.isPending ? save.variables.type : undefined}
      onBack={() =>
        router.canGoBack()
          ? router.back()
          : router.replace(
              mode === "organizer" ? "/organizer-profile" : "/profile"
            )
      }
      onRetry={() => {
        void query.refetch();
      }}
      onChange={(type, enabled) =>
        save.mutate(
          { type, enabled },
          {
            onSuccess: () =>
              toast.show({
                title: "Notification settings updated",
                tone: "success"
              }),
            onError: () =>
              toast.show({
                title: "Couldn’t update notifications",
                description: "Check your connection and try again.",
                tone: "error"
              })
          }
        )
      }
    />
  );
}
