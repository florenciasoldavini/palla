import { AppText } from "@/components/atoms";
import { atomPalette as c, atomSpacing as sp } from "@/components/atoms/theme";
import { useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { ChatMenuAction } from "./chat-action-sheet";
import type { MessageAnchor } from "./chat-message-menu";

/** Inbox actions share the message menu's native floating-surface treatment. */
export function ChatFloatingMenu({
  anchor,
  actions,
  onClose,
  busy,
  error,
  confirmation
}: {
  anchor: MessageAnchor;
  actions: ChatMenuAction[];
  onClose: () => void;
  busy: boolean;
  error?: string | null;
  confirmation?: ReactNode;
}) {
  const { width, height, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [menuHeight, setMenuHeight] = useState(actions.length * 52);
  const edge = sp[5];
  const topEdge = insets.top + sp[2];
  const maxHeight = Math.max(48, height - topEdge - insets.bottom - sp[3]);
  const menuWidth = Math.min(
    Math.max(224, 190 * Math.min(fontScale, 1.5)),
    width - edge * 2
  );
  const left = Math.max(
    edge,
    Math.min(anchor.x + anchor.width - menuWidth, width - edge - menuWidth)
  );
  const measuredHeight = Math.min(menuHeight, maxHeight);
  const bottomEdge = height - insets.bottom - sp[3];
  const below = anchor.y + anchor.height + sp[2];
  const above = anchor.y - measuredHeight - sp[2];
  const preferred =
    below + measuredHeight <= bottomEdge
      ? below
      : above >= topEdge
        ? above
        : below;
  const top = Math.max(
    topEdge,
    Math.min(preferred, bottomEdge - measuredHeight)
  );
  return (
    <Modal
      transparent
      visible
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => {
        if (!busy) onClose();
      }}
    >
      {confirmation ?? (
        <View
          style={styles.overlay}
          accessibilityViewIsModal
          onAccessibilityEscape={() => {
            if (!busy) onClose();
          }}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            accessibilityRole="button"
            accessibilityLabel="Dismiss chat actions"
            disabled={busy}
            onPress={onClose}
          />
          <View
            style={[styles.menu, { top, left, width: menuWidth, maxHeight }]}
            onLayout={(event) => setMenuHeight(event.nativeEvent.layout.height)}
          >
            <ScrollView
              cssInterop={false}
              bounces={false}
              keyboardShouldPersistTaps="handled"
            >
              {actions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <Pressable
                    cssInterop={false}
                    key={action.label}
                    accessibilityRole="button"
                    accessibilityLabel={action.label}
                    accessibilityState={{ disabled: busy }}
                    disabled={busy}
                    onPress={action.onPress}
                    style={({ pressed }) => [
                      styles.action,
                      index > 0 && styles.divider,
                      pressed && styles.pressed,
                      busy && { opacity: 0.5 }
                    ]}
                  >
                    <AppText
                      style={{ flex: 1 }}
                      tone={action.danger ? "danger" : "default"}
                    >
                      {action.label}
                    </AppText>
                    <Icon
                      size={20}
                      color={action.danger ? c.errorText : c.text}
                    />
                  </Pressable>
                );
              })}
              {busy && (
                <View style={styles.status}>
                  <ActivityIndicator color={c.accent} />
                  <AppText variant="caption" tone="subtle">
                    Updating chat…
                  </AppText>
                </View>
              )}
              {error && (
                <AppText
                  tone="danger"
                  variant="caption"
                  accessibilityLiveRegion="polite"
                  style={{ padding: sp[3] }}
                >
                  {error}
                </AppText>
              )}
            </ScrollView>
          </View>
        </View>
      )}
    </Modal>
  );
}
const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(26,27,34,0.22)" },
  menu: {
    position: "absolute",
    backgroundColor: c.surface,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: c.text,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 8
  },
  action: {
    minHeight: 52,
    paddingHorizontal: sp[4],
    paddingVertical: sp[3],
    flexDirection: "row",
    alignItems: "center",
    gap: sp[4]
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.borderSubtle
  },
  pressed: { backgroundColor: c.surfaceRaised },
  status: {
    padding: sp[3],
    flexDirection: "row",
    alignItems: "center",
    gap: sp[2]
  }
});
