import { useContext } from "react";
import { useRouter } from "expo-router";
import { AuthContext } from "@/features/auth/auth-provider";
import { useAppToast } from "@/components/atoms";
import { NotificationPreferencesView } from "./components/notification-preferences-view";
import {
  useChatNotificationPreference,
  useSaveChatNotificationPreference
} from "./hooks/use-chat-notification-preference";
export default function NotificationPreferencesScreen() {
  const { user } = useContext(AuthContext);
  const router = useRouter();
  const toast = useAppToast();
  const query = useChatNotificationPreference(user?.id);
  const save = useSaveChatNotificationPreference(user?.id);
  return (
    <NotificationPreferencesView
      enabled={query.data ?? false}
      loading={query.isPending}
      error={query.isError}
      saving={save.isPending}
      onBack={() =>
        router.canGoBack() ? router.back() : router.replace("/profile")
      }
      onRetry={() => {
        void query.refetch();
      }}
      onChange={(enabled) =>
        save.mutate(enabled, {
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
        })
      }
    />
  );
}
