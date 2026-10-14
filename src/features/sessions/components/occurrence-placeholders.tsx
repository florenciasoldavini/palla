import { AppButton, AppCard, AppHeading, AppText } from "@/components/atoms";
import { atomPalette as c, atomSpacing as sp } from "@/components/atoms/theme";
import {
  MessageCircle,
  MoreHorizontal,
  Plus,
  QrCode,
  Users,
  Zap
} from "lucide-react-native";
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
function SamplePlayer({
  name,
  category,
  onSoon
}: {
  name: string;
  category: string;
  onSoon: (feature: string) => void;
}) {
  return (
    <AppCard surface="row">
      <View style={styles.row}>
        <View style={styles.avatar}>
          <AppText variant="label">
            {name
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </AppText>
        </View>
        <View style={styles.name}>
          <AppText variant="label">{name}</AppText>
          <AppText variant="caption" tone="accent">
            {category} · Example player
          </AppText>
        </View>
        <PlaceholderAction
          label={`Message ${name}`}
          onPress={() => onSoon("Player messages")}
        >
          <MessageCircle color={c.text} size={20} />
        </PlaceholderAction>
        <PlaceholderAction
          label={`Options for ${name}`}
          onPress={() => onSoon("Player management")}
        >
          <MoreHorizontal color={c.text} size={20} />
        </PlaceholderAction>
      </View>
    </AppCard>
  );
}
export function OccurrencePlaceholders({
  onSoon
}: {
  onSoon: (feature: string) => void;
}) {
  return (
    <View style={{ gap: sp[8] }}>
      <View style={{ gap: sp[3] }}>
        <AppHeading variant="section">Active roster</AppHeading>
        <AppText variant="bodySm" tone="subtle">
          Coming soon · Illustrative players, not registrations
        </AppText>
        <SamplePlayer name="Alex Rivera" category="6ta" onSoon={onSoon} />
        <SamplePlayer name="Carlos M." category="7ma" onSoon={onSoon} />
        <SamplePlayer name="Elena G." category="6ta" onSoon={onSoon} />
        <AppCard
          surface="row"
          style={{
            borderStyle: "dashed",
            borderWidth: 1,
            borderColor: c.border,
            backgroundColor: c.background,
            gap: sp[3]
          }}
        >
          <View style={styles.row}>
            <Users size={24} color={c.accent} />
            <View style={styles.name}>
              <AppText variant="label">Available place</AppText>
              <AppText variant="bodySm" tone="subtle">
                Example slot · Invite a player directly
              </AppText>
            </View>
          </View>
          <AppButton
            size="sm"
            icon={Plus}
            iconAfter={false}
            onPress={() => onSoon("Player invitations")}
          >
            Invite directly
          </AppButton>
        </AppCard>
      </View>
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
      <AppCard surface="panel" style={{ gap: sp[4] }}>
        <AppHeading variant="section">Court check-in</AppHeading>
        <AppText variant="bodySm" tone="subtle">
          Coming soon · Verify on-court arrivals
        </AppText>
        <AppButton
          variant="bordered"
          icon={QrCode}
          iconAfter={false}
          onPress={() => onSoon("QR check-in")}
        >
          Scan pass
        </AppButton>
        {["Alex Rivera", "Carlos M.", "Elena G."].map((name) => (
          <View key={name} style={styles.checkin}>
            <AppText variant="label" style={styles.name}>
              {name}
            </AppText>
            <AppButton
              fullWidth={false}
              size="sm"
              variant="ghost"
              color="accent"
              onPress={() => onSoon("Court check-in")}
            >
              Check in
            </AppButton>
          </View>
        ))}
        <AppText variant="caption" tone="subtle">
          Sample roster · No attendance recorded
        </AppText>
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
