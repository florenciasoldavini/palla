import { getSansFontStyle } from "@/theme/fonts";
import { AppText } from "@/components/atoms";
import { atomPalette as c, atomSpacing as sp } from "@/components/atoms/theme";
import { Pressable, StyleSheet, View } from "react-native";
import {
  reactionOptions,
  type ChatMessage,
  type ReactionEmoji
} from "../domain";

export function ChatReactionPicker({
  selected,
  disabled,
  onChoose
}: {
  selected?: ReactionEmoji;
  disabled?: boolean;
  onChoose: (emoji: ReactionEmoji | null) => void;
}) {
  return (
    <View style={styles.picker} accessibilityLabel="Padel reactions">
      {reactionOptions.map(({ emoji, label }) => (
        <Pressable
          cssInterop={false}
          key={emoji}
          accessibilityRole="button"
          accessibilityLabel={`${selected === emoji ? "Remove" : "React with"} ${label}`}
          accessibilityState={{ selected: selected === emoji, disabled }}
          disabled={disabled}
          onPress={() => onChoose(selected === emoji ? null : emoji)}
          style={({ pressed }) => [
            styles.option,
            selected === emoji && styles.selected,
            pressed && { opacity: 0.65 }
          ]}
        >
          <AppText
            maxFontSizeMultiplier={1.3}
            style={{ fontSize: 25, lineHeight: 32 }}
          >
            {emoji}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}
export function ChatReactions({
  message,
  actorId,
  disabled,
  onChoose
}: {
  message: ChatMessage;
  actorId: string;
  disabled?: boolean;
  onChoose: (emoji: ReactionEmoji | null) => void;
}) {
  const reactions = message.reactions ?? [];
  if (!reactions.length || message.deleted_at) return null;
  return (
    <View style={styles.counts}>
      {reactionOptions.map(({ emoji, label }) => {
        const members = reactions.filter((r) => r.emoji === emoji);
        if (!members.length) return null;
        const mine = members.some((r) => r.profile_id === actorId);
        return (
          <Pressable
            cssInterop={false}
            key={emoji}
            accessibilityRole="button"
            accessibilityLabel={`${label}, ${members.length} ${members.length === 1 ? "reaction" : "reactions"}${mine ? ", including yours. Tap to remove" : ". Tap to react"}`}
            accessibilityState={{ selected: mine, disabled }}
            disabled={disabled}
            onPress={() => onChoose(mine ? null : emoji)}
            style={({ pressed }) => [
              styles.countTarget,
              pressed && { opacity: 0.65 }
            ]}
          >
            <View style={styles.count}>
              <AppText variant="label">{emoji}</AppText>
              <AppText variant="label" style={getSansFontStyle("700")}>
                {members.length}
              </AppText>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
const styles = StyleSheet.create({
  picker: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
    backgroundColor: c.surface,
    borderRadius: 28,
    padding: sp[1]
  },
  option: {
    width: 48,
    height: 48,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center"
  },
  selected: { backgroundColor: c.brandHover, borderColor: c.accent },
  counts: { flexDirection: "row", flexWrap: "wrap", gap: sp[2] },
  countTarget: { minHeight: 48, minWidth: 48, justifyContent: "center" },
  count: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: sp[1],
    minHeight: 28,
    minWidth: 48,
    borderWidth: 1,
    borderColor: c.borderSubtle,
    backgroundColor: c.surfaceStrong,
    borderRadius: 22,
    paddingHorizontal: sp[2]
  }
});
