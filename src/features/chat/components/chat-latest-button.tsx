import { Pressable, StyleSheet, View } from "react-native";
import { ChevronDown } from "lucide-react-native";
import { AppText } from "@/components/atoms";
import { atomPalette as c, atomSpacing as sp } from "@/components/atoms/theme";

export function ChatLatestButton({
  count,
  onPress
}: {
  count: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      cssInterop={false}
      accessibilityRole="button"
      accessibilityLabel={
        count
          ? `Jump to latest message, ${count} new ${count === 1 ? "message" : "messages"}`
          : "Jump to latest message"
      }
      accessibilityHint="Scrolls to the newest message in this conversation"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        pressed && { backgroundColor: c.surfaceRaised }
      ]}
    >
      <ChevronDown size={24} color={c.text} strokeWidth={2} />
      {count > 0 && (
        <View pointerEvents="none" style={styles.badge}>
          <AppText
            variant="caption"
            style={{ color: c.text, fontWeight: "700" }}
          >
            {count > 99 ? "99+" : count}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}
const styles = StyleSheet.create({
  button: {
    position: "absolute",
    right: sp[5],
    bottom: sp[4],
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.borderSubtle,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: c.text,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3
  },
  badge: {
    position: "absolute",
    top: -6,
    right: -4,
    minWidth: 22,
    minHeight: 22,
    paddingVertical: 2,
    paddingHorizontal: 5,
    borderRadius: 11,
    backgroundColor: c.brand,
    alignItems: "center",
    justifyContent: "center"
  }
});
