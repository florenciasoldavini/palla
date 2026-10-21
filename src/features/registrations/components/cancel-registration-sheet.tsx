import { View } from "react-native";
import { AppButton, AppText } from "@/components/atoms";
import { AppBottomSheet } from "@/components/atoms/bottom-sheet";
export function CancelRegistrationSheet({
  title,
  deadline,
  busy,
  error,
  onConfirm,
  onClose
}: {
  title: string;
  deadline: string;
  busy: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <AppBottomSheet
      title="Cancel your registration?"
      busy={busy}
      onClose={onClose}
      footer={
        <View style={{ gap: 8 }}>
          <AppButton color="danger" loading={busy} onPress={onConfirm}>
            Cancel registration
          </AppButton>
          <AppButton variant="ghost" isDisabled={busy} onPress={onClose}>
            Keep my place
          </AppButton>
        </View>
      }
    >
      <View style={{ gap: 12 }}>
        <AppText variant="label">{title}</AppText>
        <AppText tone="muted">
          Your place will be released. You can join again while registration is
          open and a place is available.
        </AppText>
        <AppText variant="bodySm" tone="subtle">
          Cancellation deadline: {deadline}
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
