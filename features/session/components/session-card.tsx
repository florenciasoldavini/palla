import { AppBadge, AppCard, AppHeading, AppText } from "@/components/atoms";
import { atomPalette, atomRadii, atomSpacing } from "@/components/atoms/theme";
import { AvailabilityIndicator } from "@/features/session/components/availability-indicator";
import type { SessionPreview } from "@/features/session/types/session";
import { Image } from "expo-image";
import { View } from "react-native";

export function SessionCard({ session }: { session: SessionPreview }) {
  const remaining = session.spotsTotal - session.spotsFilled;

  return (
    <AppCard style={{ padding: 0, width: 270 }}>
      <View style={{ height: 142 }}>
        <Image
          contentFit="cover"
          source={{ uri: session.imageUrl }}
          style={{ height: "100%", width: "100%" }}
          transition={180}
        />
        {session.urgency ? (
          <View
            style={{
              backgroundColor: atomPalette.brand,
              borderRadius: atomRadii.sm,
              paddingHorizontal: atomSpacing[2],
              paddingVertical: atomSpacing[1],
              position: "absolute",
              right: atomSpacing[3],
              top: atomSpacing[3]
            }}
          >
            <AppText style={{ color: atomPalette.brandText }} variant="meta">
              {session.urgency}
            </AppText>
          </View>
        ) : null}
      </View>
      <View style={{ gap: atomSpacing[3], padding: atomSpacing[4] }}>
        <View style={{ gap: atomSpacing[1] }}>
          <AppText tone="subtle" variant="meta">
            {session.club}
          </AppText>
          <AppHeading variant="card">{session.title}</AppHeading>
          <AppText tone="muted" variant="bodySm">
            {session.location} · {session.startsAt}
          </AppText>
        </View>
        <View
          style={{
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "space-between"
          }}
        >
          <AppBadge>{session.level}</AppBadge>
          <AppText style={{ fontWeight: "700" }}>{session.price}</AppText>
        </View>
        <AvailabilityIndicator
          filled={session.spotsFilled}
          label={`${remaining} ${remaining === 1 ? "spot" : "spots"} left`}
          total={session.spotsTotal}
        />
      </View>
    </AppCard>
  );
}
