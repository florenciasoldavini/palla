import { AppCard, AppHeading, AppText, Screen } from "@/components/atoms";
import { PallaWordmark } from "@/components/brand/palla-wordmark";
import { atomPalette, atomSpacing } from "@/components/atoms/theme";
import { View } from "react-native";

export default function OrganizerDashboardScreen() {
  return (
    <Screen>
      <View style={{ gap: atomSpacing[5] }}>
        <PallaWordmark compact />
        <View style={{ gap: atomSpacing[2] }}>
          <AppText tone="accent" variant="eyebrow">
            ORGANIZER
          </AppText>
          <AppHeading variant="hero">Run the court, effortlessly.</AppHeading>
          <AppText tone="muted">
            Recurring sessions, registrations, cancellations, waitlists, and
            attendance will live behind this route boundary.
          </AppText>
        </View>

        <AppCard padding="lg" style={{ borderColor: atomPalette.borderSubtle }}>
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
