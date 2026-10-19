import { type ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View
} from "react-native";
import Animated, {
  Easing,
  ReduceMotion,
  FadeInDown
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppToastHost } from "@/components/atoms/toast";
import type { AppIconComponent } from "@/components/icons";
import { X } from "lucide-react-native";
import { AppButton, AppHeading } from "@/components/atoms";
import { FieldSurface } from "@/components/atoms/field-surface";
import { atomPalette as c, atomRadii } from "@/components/atoms/theme";
export function ReviewSheetShell({
  title,
  icon: Icon,
  closeLabel = "Close review",
  busy,
  onClose,
  children
}: {
  title: string;
  icon?: AppIconComponent;
  closeLabel?: string;
  busy: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets(),
    { height } = useWindowDimensions();
  return (
    <Modal
      transparent
      visible
      animationType="fade"
      onRequestClose={() => {
        if (!busy) onClose();
      }}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable
          accessible={false}
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          disabled={busy}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{
            flex: 1,
            justifyContent: "flex-end",
            paddingTop: insets.top + 12
          }}
          pointerEvents="box-none"
        >
          <Animated.View
            entering={FadeInDown.duration(300)
              .easing(Easing.bezier(0.32, 0.72, 0, 1))
              .reduceMotion(ReduceMotion.System)}
            style={[styles.sheet, { maxHeight: height - insets.top - 16 }]}
            accessibilityViewIsModal
            onAccessibilityEscape={() => {
              if (!busy) onClose();
            }}
          >
            <View style={{ paddingHorizontal: 20, paddingTop: 12, gap: 12 }}>
              <View style={styles.handle} />
              <View style={styles.header}>
                {Icon ? (
                  <View style={{ flex: 1 }}>
                    <View style={styles.iconTile}>
                      <Icon size={26} color={c.textSubtle} />
                    </View>
                  </View>
                ) : (
                  <AppHeading variant="section" style={{ flex: 1 }}>
                    {title}
                  </AppHeading>
                )}
                <View
                  style={{
                    backgroundColor: c.surfaceRaised,
                    borderRadius: atomRadii.full
                  }}
                >
                  <AppButton
                    variant="ghost"
                    layout="icon"
                    size="sm"
                    fullWidth={false}
                    icon={X}
                    accessibilityLabel={closeLabel}
                    onPress={onClose}
                    isDisabled={busy}
                  />
                </View>
              </View>
              {Icon && <AppHeading variant="section">{title}</AppHeading>}
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              style={{ flexShrink: 1 }}
              contentContainerStyle={{
                padding: 20,
                paddingBottom: Math.max(insets.bottom, 12) + 16
              }}
              bounces={false}
            >
              <FieldSurface surface="white">{children}</FieldSurface>
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
      <AppToastHost />
    </Modal>
  );
}
const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(13,14,18,0.45)" },
  sheet: {
    backgroundColor: c.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden"
  },
  iconTile: {
    width: 48,
    height: 48,
    borderRadius: atomRadii.md,
    backgroundColor: c.surfaceRaised,
    alignItems: "center",
    justifyContent: "center"
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: c.borderSubtle,
    alignSelf: "center"
  },
  header: { flexDirection: "row", alignItems: "center", gap: 8 }
});
