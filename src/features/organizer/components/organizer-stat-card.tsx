import { AppCard, AppText } from "@/components/atoms";
import { atomPalette, atomSpacing } from "@/components/atoms/theme";
import type { AppIconComponent } from "@/components/icons";
import { View } from "react-native";

export function OrganizerStatCard({
  icon: Icon,
  label,
  value
}: {
  icon: AppIconComponent;
  label: string;
  value: string;
}) {
  return (
    <AppCard style={{ flex: 1, gap: atomSpacing[3] }}>
      <View
        style={{
          alignItems: "center",
          flexDirection: "row",
          justifyContent: "space-between"
        }}
      >
        <AppText tone="muted" variant="bodySm">
          {label}
        </AppText>
        <Icon color={atomPalette.accent} size="sm" />
      </View>
      <AppText style={{ fontSize: 28, fontWeight: "700", lineHeight: 32 }}>
        {value}
      </AppText>
    </AppCard>
  );
}
