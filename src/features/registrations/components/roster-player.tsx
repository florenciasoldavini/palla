import { AppCard, AppText } from "@/components/atoms";
import { atomPalette as c, atomSpacing as sp } from "@/components/atoms/theme";
import { categoryLabels } from "@/features/profile/playing-category";
import { Check, MessageSquare, MoreVertical } from "lucide-react-native";
import { useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View
} from "react-native";
import type { Attendee } from "../domain";

export function RosterPlayer({
  attendee,
  previewPaymentLabel,
  onMessage,
  messaging = false
}: {
  attendee: Attendee;
  onMessage?: () => void;
  messaging?: boolean;
  /** Illustrative payment copy for the development preview only. */
  previewPaymentLabel?: string;
}) {
  const { fontScale, width } = useWindowDimensions();
  const [imageFailed, setImageFailed] = useState(false);
  const [pressedAction, setPressedAction] = useState<string | null>(null);
  const name =
    [attendee.player.first_name, attendee.player.last_name]
      .filter(Boolean)
      .join(" ") || "Player";
  const avatarSize = Math.max(48, 48 * fontScale);
  const stacked = fontScale > 1.2 || width < 360;
  return (
    <AppCard surface="row">
      <View style={[styles.row, stacked && styles.stacked]}>
        <View style={styles.identity}>
          <View
            style={[
              styles.avatar,
              {
                width: avatarSize,
                height: avatarSize,
                borderRadius: avatarSize / 2
              }
            ]}
          >
            {attendee.player.avatar_url && !imageFailed ? (
              <Image
                source={{ uri: attendee.player.avatar_url }}
                style={StyleSheet.absoluteFillObject}
                onError={() => setImageFailed(true)}
                accessible={false}
              />
            ) : (
              <AppText variant="label">
                {name
                  .split(" ")
                  .map((part) => part[0])
                  .slice(0, 2)
                  .join("")}
              </AppText>
            )}
          </View>
          <View style={styles.details}>
            <View style={styles.nameRow}>
              <AppText variant="label">{name}</AppText>
              {attendee.player.playing_category !== null && (
                <View style={styles.category}>
                  <AppText
                    variant="caption"
                    accessibilityLabel={`Category ${categoryLabels[attendee.player.playing_category]}`}
                  >
                    {categoryLabels[attendee.player.playing_category]}
                  </AppText>
                </View>
              )}
            </View>
            {previewPaymentLabel ? (
              <View style={styles.payment}>
                <View style={styles.paidCheck}>
                  <Check size={11} strokeWidth={3} color={c.surface} />
                </View>
                <AppText variant="bodySm" tone="accent">
                  {previewPaymentLabel}
                </AppText>
              </View>
            ) : (
              <AppText variant="caption" tone="subtle">
                Payment tracking · Coming soon
              </AppText>
            )}
          </View>
        </View>
        <View style={[styles.actions, stacked && styles.stackedActions]}>
          {[
            {
              action: "Message",
              Icon: MessageSquare,
              explanation:
                "Player messaging is coming soon. No message has been sent."
            },
            {
              action: "Options",
              Icon: MoreVertical,
              explanation:
                "More player actions are coming soon. You can mark arrivals in Court Check-in below."
            }
          ].map(({ action, Icon, explanation }) => (
            <Pressable
              key={action}
              accessibilityRole="button"
              accessibilityLabel={`${action} for ${name}${action === "Message" && onMessage ? "" : ". Coming soon"}`}
              disabled={action === "Message" && messaging}
              accessibilityState={{ busy: action === "Message" && messaging }}
              onPress={() =>
                action === "Message" && onMessage
                  ? onMessage()
                  : Alert.alert(`${action} · Coming soon`, explanation)
              }
              onPressIn={() => setPressedAction(action)}
              onPressOut={() => setPressedAction(null)}
              style={[
                styles.action,
                pressedAction === action && styles.pressed
              ]}
            >
              <Icon size={22} color={c.textSubtle} strokeWidth={2} />
            </Pressable>
          ))}
        </View>
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: sp[1] },
  stacked: { flexDirection: "column", alignItems: "stretch" },
  identity: { flex: 1, flexDirection: "row", alignItems: "center", gap: sp[3] },
  avatar: {
    overflow: "hidden",
    backgroundColor: c.surfaceLow,
    alignItems: "center",
    justifyContent: "center"
  },
  details: { flex: 1, gap: sp[1] },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: sp[2]
  },
  category: {
    backgroundColor: c.surfaceStrong,
    borderRadius: 6,
    paddingHorizontal: sp[2],
    paddingVertical: 2
  },
  payment: { flexDirection: "row", alignItems: "center", gap: sp[1] },
  paidCheck: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: c.accent,
    alignItems: "center",
    justifyContent: "center"
  },
  actions: { flexDirection: "row", alignItems: "center" },
  stackedActions: { alignSelf: "flex-end" },
  action: {
    width: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10
  },
  pressed: { backgroundColor: c.surfaceLow }
});
