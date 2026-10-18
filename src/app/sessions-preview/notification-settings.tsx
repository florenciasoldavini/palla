import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { NotificationPreferencesView } from "@/features/notifications/components/notification-preferences-view";
import { useAppToast } from "@/components/atoms";
export default function NotificationSettingsPreview() {
  const { state } = useLocalSearchParams<{ state?: string }>();
  return <Preview key={state ?? "ready"} state={state} />;
}
function Preview({ state }: { state?: string }) {
  const router = useRouter();
  const toast = useAppToast();
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(state === "error");
  return (
    <NotificationPreferencesView
      preview
      enabled={enabled}
      loading={state === "loading"}
      error={error}
      saving={saving}
      onBack={() =>
        router.canGoBack()
          ? router.back()
          : router.replace("/sessions-preview/profile")
      }
      onRetry={() => setError(false)}
      onChange={(value) => {
        setSaving(true);
        setTimeout(() => {
          setSaving(false);
          if (state === "save-error")
            toast.show({
              title: "Couldn’t update notifications",
              description:
                "Your setting hasn’t changed. Check your connection and try again.",
              tone: "error"
            });
          else {
            setEnabled(value);
            toast.show({
              title: "Notification settings updated",
              tone: "success"
            });
          }
        }, 600);
      }}
    />
  );
}
