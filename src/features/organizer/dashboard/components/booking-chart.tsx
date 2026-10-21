import { useState } from "react";
import { View, useWindowDimensions } from "react-native";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";
import { AppCard, AppHeading, AppText } from "@/components/atoms";
import { atomPalette as c } from "@/components/atoms/theme";
import {
  bookingChartGeometry,
  dashboardRange,
  type OrganizerDashboard
} from "../domain";

export function BookingChart({ data }: { data: OrganizerDashboard }) {
  const [width, setWidth] = useState(0);
  const { fontScale } = useWindowDimensions();
  const scale = Math.min(fontScale, 1.8);
  const chart = bookingChartGeometry(data.chart, width, scale);
  const total = data.current.bookings,
    previous = data.previous.bookings;
  const xLabels = Array.from(
    new Set([0, Math.floor((data.chart.length - 1) / 2), data.chart.length - 1])
  ).filter((i) => i >= 0);
  const range = dashboardRange(data.bounds.start_date, data.bounds.end_date);
  return (
    <AppCard surface="panel" padding="md" style={{ gap: 8 }}>
      <View
        style={{
          flexDirection: fontScale > 1.3 ? "column" : "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 8
        }}
      >
        <AppHeading variant="card">Booking trend</AppHeading>
        <AppText variant="caption" tone="subtle">
          {range}
        </AppText>
      </View>
      <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        {total || previous ? (
          width > 0 && (
            <Svg
              width={width}
              height={chart.height}
              accessible
              accessibilityRole="image"
              accessibilityLabel={`Cumulative confirmed places in completed sessions. ${total} this period; ${previous} in the previous period.`}
            >
              {[0, chart.ceiling / 2, chart.ceiling].map((value) => (
                <ViewGrid
                  key={value}
                  value={value}
                  chart={chart}
                  width={width}
                  scale={scale}
                />
              ))}
              {chart.current && (
                <Path
                  d={`${chart.current} L${chart.x(data.chart.length - 1)},${chart.y(0)} L${chart.x(0)},${chart.y(0)} Z`}
                  fill={c.surfaceLow}
                />
              )}
              {chart.previous && (
                <Path
                  d={chart.previous}
                  stroke={c.borderStrong}
                  strokeWidth={1.5}
                  strokeDasharray="4 5"
                  fill="none"
                />
              )}
              {chart.current && (
                <Path
                  d={chart.current}
                  stroke={c.text}
                  strokeWidth={2.5}
                  strokeLinejoin="round"
                  fill="none"
                />
              )}
              {!!data.chart.length && (
                <Circle
                  cx={chart.x(data.chart.length - 1)}
                  cy={chart.y(total)}
                  r={4.5}
                  fill={c.brand}
                  stroke={c.text}
                  strokeWidth={1.5}
                />
              )}
              {xLabels.map((i) => (
                <SvgText
                  key={i}
                  x={chart.x(i)}
                  y={chart.height - 4}
                  fill={c.textSubtle}
                  fontSize={11 * scale}
                  fontFamily="Hanken Grotesk"
                  textAnchor={
                    i === 0
                      ? "start"
                      : i === data.chart.length - 1
                        ? "end"
                        : "middle"
                  }
                >
                  {`Day ${data.chart[i].day}`}
                </SvgText>
              ))}
            </Svg>
          )
        ) : (
          <View style={{ minHeight: 110, justifyContent: "center", gap: 5 }}>
            <AppText variant="label">No bookings to compare yet</AppText>
            <AppText variant="bodySm" tone="subtle">
              Completed sessions will build your booking trend.
            </AppText>
          </View>
        )}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
        <Legend label="Selected period" color={c.text} />
        <Legend label="Previous period" color={c.borderStrong} />
      </View>
      <AppText variant="caption" tone="subtle">
        Counted by session date, not registration date.
      </AppText>
    </AppCard>
  );
}
function Legend({ label, color }: { label: string; color: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View
        style={{
          width: 15,
          height: 3,
          backgroundColor: color,
          borderRadius: 2
        }}
      />
      <AppText variant="caption" tone="subtle">
        {label}
      </AppText>
    </View>
  );
}
function ViewGrid({
  value,
  chart,
  width,
  scale
}: {
  value: number;
  chart: ReturnType<typeof bookingChartGeometry>;
  width: number;
  scale: number;
}) {
  return (
    <>
      <Line
        x1={chart.left}
        x2={width - 14}
        y1={chart.y(value)}
        y2={chart.y(value)}
        stroke={c.borderSubtle}
        strokeWidth={1}
      />
      <SvgText
        x={chart.left - 7}
        y={chart.y(value) + 4}
        textAnchor="end"
        fill={c.textSubtle}
        fontSize={11 * scale}
        fontFamily="Hanken Grotesk"
      >
        {value}
      </SvgText>
    </>
  );
}
