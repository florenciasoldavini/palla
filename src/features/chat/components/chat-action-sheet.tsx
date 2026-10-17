import { AppButton, AppHeading, AppText } from "@/components/atoms";
import { atomPalette as c, atomSpacing as sp } from "@/components/atoms/theme";
import type { AppIconComponent } from "@/components/icons";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type ChatMenuAction = {
  label: string;
  icon: AppIconComponent;
  danger?: boolean;
  onPress: () => void;
};
export function ChatActionSheet({
  title,
  preview,
  actions = [],
  onClose,
  busy = false,
  error,
  confirmation,
  embedded = false,
  icon: Icon,
  supportingText,
  centered = false
}: {
  icon?: AppIconComponent;
  supportingText?: string;
  centered?: boolean;
  title: string;
  embedded?: boolean;
  preview?: string | null;
  actions?: ChatMenuAction[];
  onClose: () => void;
  busy?: boolean;
  error?: string | null;
  confirmation?: { description: string; label: string; onConfirm: () => void };
}) {
  const insets = useSafeAreaInsets();
  const content = (
    <View style={styles.overlay}>
      <Pressable
        style={StyleSheet.absoluteFill}
        accessible={false}
        disabled={busy}
        onPress={onClose}
      />
      <ScrollView
        accessibilityViewIsModal
        style={styles.sheet}
        contentContainerStyle={{
          padding: sp[5],
          paddingBottom: insets.bottom + sp[5],
          gap: sp[4]
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.handle} />
        {Icon && (
          <View
            style={{
              alignSelf: "center",
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: c.surfaceRaised,
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Icon size={24} color={c.error} />
          </View>
        )}
        <AppHeading
          variant="section"
          style={centered ? { textAlign: "center" } : undefined}
        >
          {title}
        </AppHeading>
        {preview && (
          <View style={styles.preview}>
            <AppText numberOfLines={3}>{preview}</AppText>
          </View>
        )}
        {confirmation ? (
          <AppText style={centered ? { textAlign: "center" } : undefined}>
            {confirmation.description}
          </AppText>
        ) : (
          <View style={styles.actions}>
            {actions.map((action) => (
              <AppButton
                key={action.label}
                variant="ghost"
                icon={action.icon}
                iconAfter={false}
                color={action.danger ? "danger" : "neutral"}
                style={{ justifyContent: "flex-start" }}
                isDisabled={busy}
                onPress={action.onPress}
              >
                {action.label}
              </AppButton>
            ))}
          </View>
        )}
        {supportingText && (
          <AppText
            variant="caption"
            tone="subtle"
            style={{ textAlign: "center" }}
          >
            {supportingText}
          </AppText>
        )}
        {error && (
          <AppText tone="danger" accessibilityLiveRegion="polite">
            {error}
          </AppText>
        )}
        {confirmation && (
          <AppButton
            color="danger"
            loading={busy}
            onPress={confirmation.onConfirm}
          >
            {confirmation.label}
          </AppButton>
        )}
        <AppButton
          variant={centered ? "ghost" : "bordered"}
          isDisabled={busy}
          onPress={onClose}
        >
          {confirmation ? "Cancel" : "Close menu"}
        </AppButton>
      </ScrollView>
    </View>
  );
  return embedded ? (
    content
  ) : (
    <Modal
      transparent
      visible
      animationType="slide"
      onRequestClose={() => {
        if (!busy) onClose();
      }}
    >
      {content}
    </Modal>
  );
}
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)"
  },
  sheet: {
    maxHeight: "85%",
    flexGrow: 0,
    flexShrink: 1,
    backgroundColor: c.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.borderSubtle,
    alignSelf: "center"
  },
  preview: {
    padding: sp[3],
    backgroundColor: c.surfaceRaised,
    borderWidth: 1,
    borderColor: c.borderSubtle,
    borderRadius: 16
  },
  actions: {
    borderWidth: 1,
    borderColor: c.borderSubtle,
    borderRadius: 16,
    overflow: "hidden"
  }
});
