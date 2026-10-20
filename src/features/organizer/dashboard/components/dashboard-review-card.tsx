import { Pressable, View, useWindowDimensions } from "react-native";
import { AppAvatar, AppCard, AppHeading, AppText } from "@/components/atoms";
import { ReviewStars } from "@/features/reviews/components/review-stars";
import type { DashboardReview } from "../domain";

export function DashboardReviewCard({
  review,
  timezone,
  onPress
}: {
  review: DashboardReview;
  timezone: string;
  onPress: () => void;
}) {
  const { fontScale } = useWindowDimensions();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${review.reviewer_name}, ${review.rating} out of 5 stars. ${review.comment ?? "Rating without a comment"}. Open review.`}
      onPress={onPress}
    >
      <AppCard surface="panel" padding="md" style={{ gap: 13 }}>
        <View
          style={{
            flexDirection: fontScale > 1.3 ? "column" : "row",
            alignItems: "flex-start",
            gap: 10
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              flex: 1,
              gap: 10
            }}
          >
            <AppAvatar
              name={review.reviewer_name}
              imageUrl={review.reviewer_avatar_url}
              size={36}
              decorative
            />
            <AppHeading variant="card" style={{ flex: 1 }}>
              {review.reviewer_name}
            </AppHeading>
          </View>
          <View style={{ width: 126 }}>
            <ReviewStars value={review.rating} />
          </View>
        </View>
        <AppText numberOfLines={4}>
          {review.comment || "This player left a rating without a comment."}
        </AppText>
        <View style={{ gap: 3 }}>
          <AppText variant="caption" tone="subtle">
            {review.session_title} ·{" "}
            {new Date(review.session_starts_at).toLocaleDateString(undefined, {
              timeZone: timezone,
              day: "numeric",
              month: "short"
            })}
          </AppText>
          <AppText variant="caption" tone="subtle">
            Reviewed{" "}
            {new Date(review.created_at).toLocaleDateString(undefined, {
              timeZone: timezone,
              day: "numeric",
              month: "short"
            })}
          </AppText>
        </View>
      </AppCard>
    </Pressable>
  );
}
