import { AppCard, AppHeading, AppText } from "@/components/atoms";
import { atomPalette as c } from "@/components/atoms/theme";
import { CalendarDays, Trophy } from "lucide-react-native";
import { View } from "react-native";

export function PublicSessionSummary({
  date,
  timeRange,
  duration,
  categories,
  price,
  stacked
}: {
  date: string;
  timeRange: string;
  duration: number;
  categories: string;
  price: string;
  stacked: boolean;
}) {
  return (
    <AppCard surface="panel" style={{ padding: 18, borderRadius: 20, gap: 16 }}>
      <View style={{ flexDirection: "row", gap: 13, alignItems: "center" }}>
        <CalendarDays size={22} color={c.accent} />
        <View style={{ flex: 1, gap: 2 }}>
          <AppHeading variant="card">{date}</AppHeading>
          <AppText variant="bodySm" tone="muted">
            {timeRange} · {duration} min
          </AppText>
        </View>
      </View>
      <View style={{ height: 1, backgroundColor: c.borderSubtle }} />
      <View style={{ flexDirection: stacked ? "column" : "row", gap: 16 }}>
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            gap: 13,
            alignItems: "center"
          }}
        >
          <Trophy size={22} color={c.accent} />
          <View style={{ flex: 1, gap: 3 }}>
            <AppText variant="caption" tone="muted">
              Player level
            </AppText>
            <AppHeading variant="card">{categories}</AppHeading>
          </View>
        </View>
        <View
          style={{
            flex: 1,
            gap: 3,
            borderLeftWidth: stacked ? 0 : 1,
            borderTopWidth: stacked ? 1 : 0,
            borderColor: c.borderSubtle,
            paddingLeft: stacked ? 0 : 16,
            paddingTop: stacked ? 16 : 0
          }}
        >
          <AppText variant="caption" tone="muted">
            Per player
          </AppText>
          <AppHeading variant="card">{price}</AppHeading>
        </View>
      </View>
    </AppCard>
  );
}
