import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/atoms";
import { atomPalette as c, atomSpacing as sp } from "@/components/atoms/theme";

export function ChatUnreadDivider() {
  return (
    <View style={styles.row} accessible accessibilityLabel="Unread messages">
      <View style={styles.line} />
      <View style={styles.pill}>
        <AppText variant="caption" style={{ color: "#6b6385" }}>
          Unread messages
        </AppText>
      </View>
      <View style={styles.line} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: sp[3],
    paddingVertical: sp[3]
  },
  line: { flex: 1, height: 1, backgroundColor: c.borderSubtle },
  pill: {
    flexShrink: 1,
    backgroundColor: c.surfaceRaised,
    borderRadius: 999,
    paddingHorizontal: sp[3],
    paddingVertical: sp[2]
  }
});
