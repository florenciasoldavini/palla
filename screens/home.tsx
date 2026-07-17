import {
  AppCard,
  AppHeading,
  AppText,
  Screen,
  Section
} from "@/components/atoms";
import { atomSpacing } from "@/components/atoms/theme";
import { Link } from "expo-router";
import { Pressable, View } from "react-native";

export default function HomeScreen() {
  return (
    <Screen>
      <View style={{ gap: atomSpacing[6] }}>
        <View style={{ gap: atomSpacing[3] }}>
          <AppText variant="eyebrow">Palla</AppText>
          <AppHeading variant="hero">Find your next open court.</AppHeading>
          <AppText tone="muted">
            Palla&apos;s production foundation is ready. Session discovery,
            registration, cancellation, and waitlists will be built as
            independent product features.
          </AppText>
        </View>

        <Section
          description="These routes establish the player and organizer boundaries without introducing product data or premature business logic."
          eyebrow="Foundation"
          title="Ready for the MVP"
        >
          <View style={{ gap: atomSpacing[4] }}>
            <Link href="/dashboard" asChild>
              <Pressable>
                <AppCard padding="md">
                  <AppHeading variant="card">Organizer dashboard</AppHeading>
                  <AppText tone="muted">
                    Open the organizer route-group placeholder.
                  </AppText>
                </AppCard>
              </Pressable>
            </Link>

            <Link href="/profile" asChild>
              <Pressable>
                <AppCard padding="md" tone="muted">
                  <AppHeading variant="card">Profile and account</AppHeading>
                  <AppText tone="muted">
                    Uses Palla&apos;s Supabase authentication foundation.
                  </AppText>
                </AppCard>
              </Pressable>
            </Link>
          </View>
        </Section>
      </View>
    </Screen>
  );
}
