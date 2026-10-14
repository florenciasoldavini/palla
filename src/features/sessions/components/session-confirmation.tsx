import type { ButtonColor } from "@/components/atoms/button";
import {
  AppButton,
  AppHeading,
  AppText,
  TextAreaField
} from "@/components/atoms";
import { atomPalette, atomSpacing } from "@/components/atoms/theme";
import {
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ReactNode } from "react";
export function SessionConfirmation({
  visible,
  title,
  description,
  children,
  confirmLabel,
  confirmColor = "danger",
  keepLabel,
  busy = false,
  error,
  onConfirm,
  onClose
}: {
  visible: boolean;
  title: string;
  description: string;
  children?: ReactNode;
  confirmLabel: string;
  confirmColor?: ButtonColor;
  keepLabel: string;
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={() => {
        if (!busy) onClose();
      }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{
          flex: 1,
          justifyContent: "flex-end",
          backgroundColor: "rgba(0,0,0,0.4)"
        }}
      >
        <ScrollView
          accessibilityViewIsModal
          style={{
            maxHeight: "90%",
            flexGrow: 0,
            flexShrink: 1,
            backgroundColor: atomPalette.surface,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24
          }}
          contentContainerStyle={{
            padding: atomSpacing[6],
            paddingBottom: insets.bottom + atomSpacing[6],
            gap: atomSpacing[4]
          }}
          keyboardShouldPersistTaps="handled"
        >
          <AppHeading variant="section">{title}</AppHeading>
          <AppText>{description}</AppText>
          {children}
          {error && (
            <AppText tone="danger" accessibilityLiveRegion="polite">
              {error}
            </AppText>
          )}
          <AppButton color={confirmColor} loading={busy} onPress={onConfirm}>
            {confirmLabel}
          </AppButton>
          <AppButton variant="bordered" isDisabled={busy} onPress={onClose}>
            {keepLabel}
          </AppButton>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
export function CancellationReason({
  value,
  onChange
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <TextAreaField
      label="Reason"
      value={value}
      onChangeText={onChange}
      maxLength={1000}
    />
  );
}
