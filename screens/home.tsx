import {
  AppCard,
  AppHeading,
  AppText,
  Screen,
  Section
} from "@/components/atoms";
import { PallaWordmark } from "@/components/brand/palla-wordmark";
import { atomPalette, atomRadii, atomSpacing } from "@/components/atoms/theme";
import { Link } from "expo-router";
import { Pressable, View } from "react-native";

export default function HomeScreen() {
  return (
    <Screen>
      <View style={{ gap: atomSpacing[6] }}>
        <PallaWordmark compact />
        <View style={{ gap: atomSpacing[3] }}>
          <AppText tone="accent" variant="eyebrow">
            PLAY MORE / PLAN LESS
          </AppText>
          <AppHeading variant="hero">Your next match starts here.</AppHeading>
          <AppText tone="muted">
            Discover recurring social padel sessions, find players at your
            level, and keep your week moving.
          </AppText>
        </View>

        <AppCard
          padding="lg"
          style={{ backgroundColor: atomPalette.text, gap: atomSpacing[5] }}
        >
          <View
            style={{
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "space-between"
            }}
          >
            <AppText tone="inverse" variant="eyebrow">
              OPEN SESSION
            </AppText>
            <View
              style={{
                backgroundColor: atomPalette.brand,
                borderRadius: atomRadii.full,
                paddingHorizontal: atomSpacing[3],
                paddingVertical: atomSpacing[2]
              }}
            >
              <AppText style={{ color: atomPalette.brandText }} variant="meta">
                2 SPOTS
              </AppText>
            </View>
          </View>
          <View style={{ gap: atomSpacing[2] }}>
            <AppHeading tone="inverse" variant="section">
              Tuesday night social
            </AppHeading>
            <AppText tone="inverse">20:00 · Palermo · Intermediate</AppText>
          </View>
          <View style={{ flexDirection: "row", gap: atomSpacing[2] }}>
            {[true, true, false, false].map((filled, index) => (
              <View
                key={index}
                style={{
                  backgroundColor: filled ? atomPalette.brand : "transparent",
                  borderColor: filled
                    ? atomPalette.brand
                    : atomPalette.textSubtle,
                  borderRadius: atomRadii.full,
                  borderStyle: filled ? "solid" : "dashed",
                  borderWidth: 1,
                  height: atomSpacing[5],
                  width: atomSpacing[5]
                }}
              />
            ))}
          </View>
        </AppCard>

        <Section
          description="These routes establish the player and organizer boundaries without introducing product data or premature business logic."
          eyebrow="Explore Palla"
          title="Built around your week"
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
