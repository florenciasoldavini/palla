import { AppButton, AppCard, AppHeading, AppText } from "@/components/atoms";
import { atomPalette as c, atomSpacing as sp } from "@/components/atoms/theme";
import { Zap } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";

export function PlaceholderAction({
  label,
  onPress,
  children
}: {
  label: string;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}. Coming soon`}
      onPress={onPress}
      style={styles.icon}
    >
      {children}
    </Pressable>
  );
}
export function OccurrencePlaceholders({
  onSoon
}: {
  onSoon: (feature: string) => void;
}) {
  return (
    <View style={{ gap: sp[8] }}>
      <AppCard surface="panel" style={{ gap: sp[4] }}>
        <AppHeading variant="section">Waitlist queue</AppHeading>
        <AppText variant="bodySm" tone="subtle">
          Coming soon · Example queue
        </AppText>
        <AppCard surface="inset" tone="muted" style={{ gap: sp[3] }}>
          <View style={styles.row}>
            <View style={styles.avatar}>
              <AppText variant="label">ST</AppText>
            </View>
            <View style={styles.name}>
              <AppText variant="label">Sofía T.</AppText>
              <AppText variant="caption" tone="subtle">
                6ta · First in line
              </AppText>
            </View>
          </View>
          <AppButton
            color="essential"
            onPress={() => onSoon("Waitlist promotion")}
          >
            Promote to match
          </AppButton>
        </AppCard>
        <AppCard surface="inset" tone="muted">
          <AppText variant="label">David K. · 7ma</AppText>
          <AppText variant="caption" tone="subtle">
            Second in line · Example player
          </AppText>
        </AppCard>
        <View style={[styles.note, { backgroundColor: c.surfaceLow }]}>
          <Zap color={c.accent} size={20} />
          <AppText variant="bodySm" style={styles.name}>
            Automatic promotion is planned. No places are assigned yet.
          </AppText>
        </View>
      </AppCard>
    </View>
  );
}
const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: sp[2],
    flexWrap: "wrap"
  },
  name: { flex: 1, minWidth: 80 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.surfaceLow,
    alignItems: "center",
    justifyContent: "center"
  },
  icon: {
    minWidth: 48,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12
  },
  note: { flexDirection: "row", gap: sp[3], padding: sp[4], borderRadius: 16 },
  checkin: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: sp[2],
    borderBottomWidth: 1,
    borderBottomColor: c.borderSubtle
  }
});
