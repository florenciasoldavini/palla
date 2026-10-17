import {
  AppButton,
  AppCard,
  AppHeading,
  AppText,
  Screen,
  TextField,
  useAppToast
} from "@/components/atoms";
import { useState } from "react";
import { View } from "react-native";

// Development-only route under sessions-preview: no account changes or requests.
export default function FeedbackPreview() {
  const toast = useAppToast();
  const [retries, setRetries] = useState(0);
  const previewRetry = async () => {
    setRetries((n) => n + 1);
    await new Promise((resolve) => setTimeout(resolve, 600));
    toast.show({ title: "Profile updated", tone: "success" });
  };
  return (
    <Screen>
      <View style={{ gap: 20 }}>
        <AppHeading>Feedback preview</AppHeading>
        <AppText tone="muted">No account changes</AppText>
        <AppText>Retry count: {retries}</AppText>
        <AppButton
          variant="bordered"
          onPress={() =>
            toast.show({
              title: "Copied to clipboard",
              tone: "success",
              variant: "compact"
            })
          }
        >
          Preview compact toast
        </AppButton>
        <AppCard>
          <TextField
            required
            label="First name"
            value=""
            errorText="Enter your first name."
          />
        </AppCard>
        <AppButton
          onPress={() => {
            toast.show({ title: "Profile updated", tone: "success" });
          }}
        >
          Preview save success
        </AppButton>
        <AppButton
          variant="bordered"
          onPress={() =>
            toast.show({
              title: "Couldn’t update profile",
              description:
                "Check your connection and try again. Your changes are still here.",
              tone: "error",
              action: { label: "Retry", onPress: previewRetry }
            })
          }
        >
          Preview save failure
        </AppButton>
        <AppButton
          variant="bordered"
          onPress={() =>
            toast.show({
              title: "Profile updated",
              description:
                "Your changes are saved, but the previous photo couldn’t be deleted.",
              tone: "warning",
              action: { label: "Retry cleanup", onPress: previewRetry }
            })
          }
        >
          Preview cleanup warning
        </AppButton>
        <AppButton
          variant="bordered"
          onPress={() =>
            toast.show({
              title: "Link copied",
              description: "Ready to share with your group.",
              tone: "info"
            })
          }
        >
          Preview info toast
        </AppButton>
      </View>
    </Screen>
  );
}
