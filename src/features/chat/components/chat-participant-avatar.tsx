import { getSansFontStyle } from "@/theme/fonts";
import { AppText } from "@/components/atoms";
import { atomPalette as c } from "@/components/atoms/theme";
import { categoryLabels } from "@/features/profile/playing-category";
import { useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import type { ConversationSummary } from "../domain";

/** Identity is based on the participant's conversation role, never verification. */
export function ChatParticipantAvatar({
  summary,
  showBadge = false,
  showStatus = false,
  online = false,
  size = 44,
  statusBackground = c.background
}: {
  summary: ConversationSummary;
  showBadge?: boolean;
  showStatus?: boolean;
  online?: boolean;
  size?: number;
  statusBackground?: string;
}) {
  const person = summary.other_participant;
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const initials =
    [person.first_name, person.last_name]
      .filter(Boolean)
      .map((part) => part![0])
      .join("") || "P";
  const host = summary.other_role === "organizer";
  const category = person.playing_category;
  const badge = host ? "HOST" : category ? categoryLabels[category] : null;
  return (
    <View
      style={[
        styles.identity,
        { width: size },
        showBadge && badge && styles.withBadge
      ]}
    >
      <View
        style={[
          styles.avatar,
          { width: size, height: size, borderRadius: size / 2 },
          showStatus && online && styles.onlineRing
        ]}
        accessible={false}
      >
        <View style={styles.portrait}>
          {person.avatar_url && failedUrl !== person.avatar_url ? (
            <Image
              source={{ uri: person.avatar_url }}
              style={StyleSheet.absoluteFill}
              onError={() => setFailedUrl(person.avatar_url)}
              accessible={false}
            />
          ) : (
            <AppText variant="label" maxFontSizeMultiplier={1.3}>
              {initials}
            </AppText>
          )}
        </View>
      </View>
      {showStatus && (
        <View
          accessibilityLabel={online ? "Online" : undefined}
          style={[
            styles.status,
            {
              backgroundColor: statusBackground,
              borderColor: statusBackground
            }
          ]}
        >
          <View
            style={{
              flex: 1,
              width: "100%",
              borderRadius: 999,
              backgroundColor: online ? c.brand : c.textSubtle,
              opacity: online ? 1 : 0.4
            }}
          />
        </View>
      )}
      {showBadge && badge && (
        <View
          style={[styles.badge, host && styles.host]}
          accessibilityLabel={host ? "Host" : `Category ${badge}`}
        >
          <AppText
            variant="caption"
            maxFontSizeMultiplier={1.3}
            style={[styles.badgeText, host && { color: c.surface }]}
          >
            {badge}
          </AppText>
        </View>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  identity: { width: 44, alignItems: "center" },
  withBadge: { paddingBottom: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    padding: 1,
    backgroundColor: c.surfaceRaised,
    borderWidth: 1,
    borderColor: c.borderSubtle,
    alignItems: "center",
    justifyContent: "center"
  },
  portrait: {
    flex: 1,
    width: "100%",
    borderRadius: 999,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center"
  },
  onlineRing: { borderWidth: 2, borderColor: c.brand, padding: 2 },
  status: {
    position: "absolute",
    right: -1,
    bottom: -1,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3
  },
  badge: {
    position: "absolute",
    bottom: 0,
    alignSelf: "center",
    backgroundColor: c.surfaceStrong,
    borderRadius: 10,
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: c.background
  },
  badgeText: { ...getSansFontStyle("700") },
  host: { backgroundColor: c.text, width: 56, alignItems: "center" }
});
