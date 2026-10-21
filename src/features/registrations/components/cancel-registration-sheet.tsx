import { View } from "react-native";
import { AppButton, AppText } from "@/components/atoms";
import { AppBottomSheet } from "@/components/atoms/bottom-sheet";
export function CancelRegistrationSheet({
  title,
  waitlisted = false,
  deadline,
  busy,
  error,
  onConfirm,
  onClose
}: {
  title: string;
  waitlisted?: boolean;
  deadline: string;
  busy: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <AppBottomSheet
      title={waitlisted ? "Leave the waitlist?" : "Cancel your registration?"}
      busy={busy}
      onClose={onClose}
      footer={
        <View style={{ gap: 8 }}>
          <AppButton color="danger" loading={busy} onPress={onConfirm}>
            {waitlisted ? "Leave waitlist" : "Cancel registration"}
          </AppButton>
          <AppButton variant="ghost" isDisabled={busy} onPress={onClose}>
            {waitlisted ? "Stay on waitlist" : "Keep my place"}
          </AppButton>
        </View>
      }
    >
      <View style={{ gap: 12 }}>
        <AppText variant="label">{title}</AppText>
        <AppText tone="muted">
          {waitlisted
            ? "You’ll leave the queue. If you join again, you’ll be added at the end of the waitlist."
            : "Your place will be released. You can join again while registration is open and a place is available."}
        </AppText>
        <AppText variant="bodySm" tone="subtle">
          {waitlisted
            ? "You can leave the waitlist before the session starts."
            : `Cancellation deadline: ${deadline}`}
        </AppText>
        {error ? (
          <AppText variant="bodySm" tone="danger" accessibilityRole="alert">
            {error}
          </AppText>
        ) : null}
      </View>
    </AppBottomSheet>
  );
}
