import { AppCard, AppHeading, AppText } from "@/components/atoms";
import { atomRadii, atomSpacing } from "@/components/atoms/theme";
import { AvailabilityIndicator } from "@/features/session/components/availability-indicator";
import type { SessionPreview } from "@/features/session/types/session";
import { Image } from "expo-image";
import { View } from "react-native";

export function SessionListItem({ session }: { session: SessionPreview }) {
  return (
    <AppCard padding="sm">
      <View
        style={{
          alignItems: "center",
          flexDirection: "row",
          gap: atomSpacing[3]
        }}
      >
        <Image
          contentFit="cover"
          source={{ uri: session.imageUrl }}
          style={{ borderRadius: atomRadii.sm, height: 62, width: 72 }}
          transition={180}
        />
        <View style={{ flex: 1, gap: atomSpacing[1] }}>
          <View
            style={{
              alignItems: "flex-start",
              flexDirection: "row",
              gap: atomSpacing[2],
              justifyContent: "space-between"
            }}
          >
            <AppHeading style={{ flex: 1 }} variant="card">
              {session.title}
            </AppHeading>
            <AppText style={{ fontWeight: "700" }}>{session.price}</AppText>
          </View>
          <AppText tone="muted" variant="bodySm">
            {session.club} · {session.startsAt}
          </AppText>
          <AvailabilityIndicator
            filled={session.spotsFilled}
            total={session.spotsTotal}
          />
        </View>
      </View>
    </AppCard>
  );
}
