import { AppCard, AppHeading, AppText, Screen } from "@/components/atoms";
import { atomSpacing } from "@/components/atoms/theme";
import { View } from "react-native";

export default function OrganizerDashboardScreen() {
  return (
    <Screen>
      <View style={{ gap: atomSpacing[5] }}>
        <View style={{ gap: atomSpacing[2] }}>
          <AppText variant="eyebrow">Organizer</AppText>
          <AppHeading variant="hero">Session operations</AppHeading>
          <AppText tone="muted">
            Recurring sessions, registrations, cancellations, waitlists, and
            attendance will live behind this route boundary.
          </AppText>
        </View>

        <AppCard padding="md" tone="muted">
          <AppHeading variant="card">No sessions yet</AppHeading>
          <AppText tone="muted">
            This is intentionally a foundation screen, not an implemented
            feature.
          </AppText>
        </AppCard>
      </View>
    </Screen>
  );
}
