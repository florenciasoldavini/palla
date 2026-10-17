import { AppButton, AppText } from "@/components/atoms";
import { atomPalette as c, atomSpacing as sp } from "@/components/atoms/theme";
import { Reply, X } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import type { ReplyQuote } from "../domain";

export function ChatReplyQuote({
  quote,
  author,
  composer = false,
  onPress,
  onCancel
}: {
  quote: ReplyQuote;
  author: string;
  composer?: boolean;
  onPress?: () => void;
  onCancel?: () => void;
}) {
  const text = !quote.available
    ? "Message unavailable"
    : quote.deleted_at
      ? "Message deleted"
      : quote.body;
  const content = (
    <>
      {composer && <Reply size={18} color={c.accent} />}
      <View style={{ flex: 1, minWidth: 0, gap: sp[1] }}>
        <AppText variant="caption" tone="accent" numberOfLines={1}>
          {composer ? `Replying to ${author}` : author}
        </AppText>
        <AppText variant="bodySm" tone="subtle" numberOfLines={2}>
          {text}
        </AppText>
      </View>
      {onCancel && (
        <AppButton
          variant="ghost"
          layout="icon"
          fullWidth={false}
          icon={X}
          accessibilityLabel="Cancel reply"
          onPress={onCancel}
        />
      )}
    </>
  );
  return onPress && quote.available ? (
    <Pressable
      cssInterop={false}
      accessibilityRole="button"
      accessibilityLabel={`View original message from ${author}: ${text}`}
      onPress={onPress}
      style={({ pressed }) => [styles.quote, pressed && { opacity: 0.7 }]}
    >
      {content}
    </Pressable>
  ) : (
    <View style={styles.quote}>{content}</View>
  );
}
const styles = StyleSheet.create({
  quote: {
    backgroundColor: c.surfaceLow,
    borderRadius: 12,
    padding: sp[2],
    gap: sp[2],
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "stretch",
    minWidth: 0
  }
});
