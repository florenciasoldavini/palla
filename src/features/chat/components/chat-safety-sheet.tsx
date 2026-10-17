import { FieldSurface } from "@/components/atoms/field-surface";
import { useEffect, useState, type ReactNode } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
  useWindowDimensions
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X } from "lucide-react-native";
import { AppButton, AppHeading, AppText } from "@/components/atoms";
import { atomPalette as c, atomSpacing as sp } from "@/components/atoms/theme";
import type { AppIconComponent } from "@/components/icons";
import { designTokens } from "@/theme/tokens";
import { categoryLabels } from "@/features/profile/playing-category";
import type { ConversationSummary } from "../domain";
import { ChatParticipantAvatar } from "./chat-participant-avatar";

/** Shared shell for the inbox's embedded blocking/reporting sheets. */
export function ChatSafetySheet({
  summary,
  title,
  children,
  footer,
  onClose,
  busy = false,
  hideHeader = false
}: {
  summary: ConversationSummary;
  title: string;
  children: ReactNode;
  footer: ReactNode;
  onClose: () => void;
  busy?: boolean;
  hideHeader?: boolean;
}) {
  const insets = useSafeAreaInsets(),
    { height } = useWindowDimensions();
  const [keyboard, setKeyboard] = useState(() => Keyboard.isVisible());
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", () =>
      setKeyboard(true)
    );
    const hide = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboard(false)
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  const category = summary.other_participant.playing_category;
  const host = summary.other_role === "organizer";
  return (
    <View
      style={styles.overlay}
      accessibilityViewIsModal
      onAccessibilityEscape={() => {
        if (!busy) onClose();
      }}
    >
      <Pressable
        style={StyleSheet.absoluteFill}
        accessible={false}
        disabled={busy}
        onPress={onClose}
      />
      <KeyboardAvoidingView
        pointerEvents="box-none"
        behavior="padding"
        enabled={Platform.OS !== "android" || keyboard}
        style={{
          flex: 1,
          justifyContent: "flex-end",
          paddingTop: insets.top + sp[3]
        }}
      >
        <ScrollView
          style={[styles.sheet, { maxHeight: height - insets.top - sp[6] }]}
          contentContainerStyle={{
            padding: sp[5],
            paddingBottom: insets.bottom + sp[5],
            gap: sp[5]
          }}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <View style={styles.handle} />
          {!hideHeader && (
            <View style={styles.header}>
              <ChatParticipantAvatar summary={summary} size={48} />
              <View style={{ flex: 1, gap: sp[2] }}>
                <AppHeading variant="section">{title}</AppHeading>
                <View style={styles.tags}>
                  {(host || category) && (
                    <View
                      style={[
                        styles.tag,
                        { backgroundColor: host ? c.text : c.brand }
                      ]}
                    >
                      <AppText
                        variant="caption"
                        style={{
                          color: host ? c.surface : c.brandText,
                          fontWeight: "700"
                        }}
                      >
                        {host ? "HOST" : categoryLabels[category!]}
                      </AppText>
                    </View>
                  )}
                  {!host && (
                    <AppText variant="caption" tone="subtle">
                      Player
                    </AppText>
                  )}
                </View>
              </View>
              <AppButton
                variant="ghost"
                size="md"
                layout="icon"
                icon={X}
                fullWidth={false}
                accessibilityLabel="Close safety sheet"
                isDisabled={busy}
                onPress={onClose}
              />
            </View>
          )}
          <View style={{ gap: sp[4] }}>
            <FieldSurface surface="tinted">{children}</FieldSurface>
          </View>
          <View style={styles.footer}>{footer}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
export function ChatSafetyPanel({
  icon: Icon,
  children,
  danger = false
}: {
  icon?: AppIconComponent;
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <View
      style={[
        styles.panel,
        danger && {
          backgroundColor: c.errorSurface,
          borderColor: designTokens.colors.primitive.error[200]
        }
      ]}
    >
      {Icon && (
        <View style={{ marginTop: 2 }}>
          <Icon size={22} color={danger ? c.errorText : c.textSubtle} />
        </View>
      )}
      <View style={{ flex: 1, gap: sp[3] }}>{children}</View>
    </View>
  );
}
export function ChatSafetyToggle({
  icon: Icon,
  label,
  description,
  value,
  onChange,
  disabled = false
}: {
  icon: AppIconComponent;
  label: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      cssInterop={false}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityHint={description}
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      onPress={() => onChange(!value)}
      style={({ pressed }) => [
        styles.toggle,
        { backgroundColor: pressed ? c.surfaceRaised : c.surface }
      ]}
    >
      <View style={styles.toggleIcon}>
        <Icon size={21} color={c.accent} />
      </View>
      <View style={{ flex: 1, gap: sp[1] }}>
        <AppText variant="label">{label}</AppText>
        <AppText variant="caption" tone="subtle">
          {description}
        </AppText>
      </View>
      <View pointerEvents="none" accessible={false}>
        <Switch
          accessible={false}
          value={value}
          trackColor={{ false: c.borderSubtle, true: c.text }}
          thumbColor={c.surface}
          ios_backgroundColor={c.borderSubtle}
        />
      </View>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    flexGrow: 0,
    flexShrink: 1,
    backgroundColor: c.background,
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: sp[3],
    paddingBottom: sp[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.borderSubtle
  },
  tags: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: sp[2]
  },
  tag: { paddingHorizontal: sp[3], paddingVertical: sp[1], borderRadius: 999 },
  panel: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: sp[3],
    padding: sp[4],
    borderWidth: 1,
    borderColor: c.borderSubtle,
    borderRadius: 16,
    backgroundColor: c.surfaceRaised
  },
  footer: {
    gap: sp[2],
    paddingTop: sp[4],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.borderSubtle
  },
  toggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: sp[3],
    minHeight: 80,
    padding: sp[4],
    borderWidth: 1,
    borderColor: c.borderSubtle,
    borderRadius: 16
  },
  toggleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: designTokens.colors.primitive.volt[100],
    alignItems: "center",
    justifyContent: "center"
  }
});
