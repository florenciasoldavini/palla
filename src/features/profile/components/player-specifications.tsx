import { View, StyleSheet, useWindowDimensions } from "react-native";
import { Award, Hand, ArrowLeftRight } from "lucide-react-native";
import { AppCard, AppHeading, AppText } from "@/components/atoms";
import { atomPalette as c } from "@/components/atoms/theme";
import type { User } from "@/types/models/user";
import {
  playerCategoryLabel,
  handLabels,
  sideLabels,
  sideDetails
} from "../player-traits";

export function PlayerSpecifications({ user }: { user: User }) {
  const { fontScale } = useWindowDimensions();
  return (
    <View style={{ gap: 12 }}>
      <AppHeading variant="section">Player Specifications</AppHeading>
      <AppCard padding="md" style={styles.category}>
        <View style={styles.icon}>
          <Award size={24} color={c.text} strokeWidth={1.7} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <AppHeading variant="section">
            {user.category_status === "known" ? "Category " : ""}
            {playerCategoryLabel(user.category_status, user.playing_category)}
          </AppHeading>
          {(user.category_status === "known" ||
            user.category_status === "beginner") && (
            <AppText variant="bodySm" tone="subtle">
              Self-reported
            </AppText>
          )}
        </View>
      </AppCard>
      {!!(user.dominant_hand || user.preferred_court_side) && (
        <View
          style={[
            styles.traits,
            fontScale > 1.3 && { flexDirection: "column" }
          ]}
        >
          {user.dominant_hand && (
            <AppCard style={styles.trait}>
              <View style={styles.label}>
                <AppText tone="subtle" variant="bodySm" style={{ flex: 1 }}>
                  Dominant Hand
                </AppText>
                <Hand size={19} color={c.textSubtle} />
              </View>
              <AppHeading variant="card">
                {handLabels[user.dominant_hand]}
              </AppHeading>
            </AppCard>
          )}
          {user.preferred_court_side && (
            <AppCard style={styles.trait}>
              <View style={styles.label}>
                <AppText tone="subtle" variant="bodySm" style={{ flex: 1 }}>
                  Preferred Side
                </AppText>
                <ArrowLeftRight size={19} color={c.textSubtle} />
              </View>
              <AppHeading variant="card">
                {sideLabels[user.preferred_court_side]}
              </AppHeading>
              <AppText tone="subtle" variant="bodySm">
                {sideDetails[user.preferred_court_side]}
              </AppText>
            </AppCard>
          )}
        </View>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  category: { flexDirection: "row", alignItems: "center", gap: 16 },
  icon: {
    backgroundColor: c.surfaceRaised,
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  traits: { flexDirection: "row", gap: 12 },
  trait: { flex: 1, gap: 12 },
  label: { flexDirection: "row", alignItems: "center", gap: 8 }
});
