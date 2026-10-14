import { AppButton, AppCard, AppText } from "@/components/atoms";
import { atomPalette as c, atomSpacing as sp } from "@/components/atoms/theme";
import { Plus, UserPlus } from "lucide-react-native";
import { Alert, StyleSheet, View } from "react-native";

export function AvailableRosterSlot({ number }: { number: number }) {
  return (
    <AppCard surface="row" tone="muted" style={styles.card}>
      <View style={styles.identity}>
        <View
          style={styles.icon}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <UserPlus size={24} color={c.border} strokeWidth={1.8} />
        </View>
        <View style={styles.copy}>
          <AppText variant="label">Slot {number}: Available</AppText>
          <AppText variant="bodySm" tone="subtle">
            Waiting for a player to join.
          </AppText>
        </View>
      </View>
      <View style={styles.action}>
        <AppButton
          size="sm"
          fullWidth={false}
          icon={Plus}
          iconAfter={false}
          accessibilityLabel={`Invite directly to slot ${number}. Coming soon`}
          onPress={() =>
            Alert.alert(
              "Player invitations · Coming soon",
              "Direct invitations aren’t available yet. No invitation has been sent."
            )
          }
        >
          Invite directly
        </AppButton>
        <AppText variant="caption" tone="subtle">
          Coming soon
        </AppText>
      </View>
    </AppCard>
  );
}
const styles = StyleSheet.create({
  card: {
    borderStyle: "dashed",
    borderWidth: 2,
    borderColor: c.border,
    gap: sp[4]
  },
  identity: { flexDirection: "row", alignItems: "center", gap: sp[3] },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: c.border,
    alignItems: "center",
    justifyContent: "center"
  },
  copy: { flex: 1, gap: sp[1] },
  action: { alignSelf: "flex-end", alignItems: "flex-end", gap: sp[1] }
});
