import { View, useWindowDimensions } from "react-native";
import {
  CalendarCheck,
  Users,
  ChartNoAxesCombined,
  Star,
  TrendingUp,
  TrendingDown,
  Minus,
  type LucideIcon
} from "lucide-react-native";
import { AppCard, AppHeading, AppText } from "@/components/atoms";
import { atomPalette as c } from "@/components/atoms/theme";
import { bookingChange, type DashboardSummary } from "../domain";

function Metric({
  label,
  value,
  icon: Icon,
  detail,
  change
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  detail: string;
  change?: number | null;
}) {
  const Trend =
    change === undefined || change === null
      ? null
      : change > 0
        ? TrendingUp
        : change < 0
          ? TrendingDown
          : Minus;
  return (
    <AppCard surface="panel" padding="md" style={{ flex: 1, gap: 9 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
        <AppText variant="bodySm" tone="subtle" style={{ flex: 1 }}>
          {label}
        </AppText>
        <Icon size={17} color={c.textSubtle} />
      </View>
      <AppHeading variant="title" style={{ fontVariant: ["tabular-nums"] }}>
        {value}
      </AppHeading>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 5 }}>
        {Trend && (
          <Trend size={14} color={change! > 0 ? c.accent : c.textSubtle} />
        )}
        <AppText
          variant="caption"
          style={{
            flex: 1,
            color:
              change !== undefined && change !== null && change > 0
                ? c.accent
                : c.textSubtle
          }}
        >
          {detail}
        </AppText>
      </View>
    </AppCard>
  );
}
export function DashboardStats({
  current,
  previous
}: {
  current: DashboardSummary;
  previous: DashboardSummary;
}) {
  const { fontScale, width } = useWindowDimensions();
  const stacked = fontScale > 1.3 || width < 350;
  const sessions = current.sessions - previous.sessions;
  const bookings = bookingChange(current.bookings, previous.bookings);
  const fill =
    current.fill_rate === null || previous.fill_rate === null
      ? null
      : Math.round((current.fill_rate - previous.fill_rate) * 10) / 10;
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: stacked ? "column" : "row", gap: 12 }}>
        <Metric
          label="Sessions hosted"
          value={String(current.sessions)}
          icon={CalendarCheck}
          change={previous.sessions ? sessions : null}
          detail={
            !previous.sessions
              ? "No previous sessions"
              : sessions === 0
                ? "Same as last period"
                : `${Math.abs(sessions)} ${sessions > 0 ? "more" : "fewer"} than last period`
          }
        />
        <Metric
          label="Player bookings"
          value={String(current.bookings)}
          icon={Users}
          change={bookings}
          detail={
            bookings === null
              ? "No previous bookings"
              : bookings === 0
                ? "Same as last period"
                : `${Math.abs(bookings)}% ${bookings > 0 ? "higher" : "lower"} than last period`
          }
        />
      </View>
      <View style={{ flexDirection: stacked ? "column" : "row", gap: 12 }}>
        <Metric
          label="Fill rate"
          value={
            current.fill_rate === null
              ? "—"
              : `${Math.round(current.fill_rate)}%`
          }
          icon={ChartNoAxesCombined}
          change={fill}
          detail={
            current.fill_rate === null
              ? "No completed sessions"
              : fill === null
                ? "No previous fill rate"
                : fill === 0
                  ? "Same as last period"
                  : `${Math.abs(fill)} ${Math.abs(fill) === 1 ? "point" : "points"} ${fill > 0 ? "higher" : "lower"}`
          }
        />
        <Metric
          label="Average rating"
          value={
            current.average_rating === null
              ? "—"
              : `${current.average_rating.toFixed(1)} / 5`
          }
          icon={Star}
          detail={
            current.review_count
              ? `${current.review_count} ${current.review_count === 1 ? "review" : "reviews"}`
              : "No reviews yet"
          }
        />
      </View>
    </View>
  );
}
