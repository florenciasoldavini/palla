import { View, useWindowDimensions } from "react-native";
import { AppHeading, AppText } from "@/components/atoms";
import { atomPalette as c } from "@/components/atoms/theme";
import { ReviewStars } from "@/features/reviews/components/review-stars";
import type { PublicReviews } from "../reviews-domain";

export function PublicReviewOverview({ data }: { data: PublicReviews }) {
  const { fontScale } = useWindowDimensions();
  if (!data.total || data.average === null) return null;
  return (
    <View
      style={{
        flexDirection: fontScale > 1.3 ? "column" : "row",
        gap: 28,
        alignItems: fontScale > 1.3 ? "stretch" : "center",
        paddingVertical: 4
      }}
    >
      <View style={{ gap: 7 }}>
        <AppHeading variant="hero">{data.average.toFixed(1)}</AppHeading>
        <ReviewStars value={data.average} size={18} />
        <AppText variant="caption" tone="muted">
          {data.total} {data.total === 1 ? "review" : "reviews"}
        </AppText>
      </View>
      <View style={{ flex: 1, gap: 7 }}>
        {data.distribution.map((count, index) => (
          <View
            key={index}
            accessible
            accessibilityLabel={`${5 - index} stars: ${count} ${count === 1 ? "review" : "reviews"}`}
            style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
          >
            <AppText variant="caption" style={{ width: 14 * fontScale }}>
              {5 - index}
            </AppText>
            <View
              style={{
                flex: 1,
                height: 7,
                borderRadius: 4,
                backgroundColor: c.surfaceLow,
                overflow: "hidden"
              }}
            >
              <View
                style={{
                  width: `${(count / data.total) * 100}%`,
                  height: "100%",
                  backgroundColor: c.text,
                  borderRadius: 4
                }}
              />
            </View>
            <AppText
              variant="caption"
              tone="muted"
              style={{ minWidth: 22 * fontScale, textAlign: "right" }}
            >
              {count}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}
