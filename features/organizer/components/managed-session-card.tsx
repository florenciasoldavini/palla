import { AppButton, AppCard, AppHeading, AppText } from "@/components/atoms";
import { atomRadii, atomSpacing } from "@/components/atoms/theme";
import { AvailabilityIndicator } from "@/features/session/components";
import { Image } from "expo-image";
import { View } from "react-native";

export function ManagedSessionCard({
  imageUrl,
  level,
  schedule,
  title
}: {
  imageUrl: string;
  level: string;
  schedule: string;
  title: string;
}) {
  return (
    <AppCard style={{ gap: atomSpacing[4] }}>
      <View style={{ flexDirection: "row", gap: atomSpacing[3] }}>
        <Image
          contentFit="cover"
          source={{ uri: imageUrl }}
          style={{ borderRadius: atomRadii.sm, height: 64, width: 64 }}
        />
        <View style={{ flex: 1, gap: atomSpacing[1] }}>
          <AppText tone="accent" variant="meta">
            {level}
          </AppText>
          <AppHeading variant="card">{title}</AppHeading>
          <AppText tone="muted" variant="bodySm">
            {schedule}
          </AppText>
        </View>
      </View>
      <View
        style={{
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "space-between"
        }}
      >
        <AvailabilityIndicator filled={3} label="3/4 players" />
        <AppButton fullWidth={false} size="sm">
          Manage list
        </AppButton>
      </View>
    </AppCard>
  );
}
