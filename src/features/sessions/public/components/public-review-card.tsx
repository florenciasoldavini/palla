import { View, useWindowDimensions } from "react-native";
import { AppAvatar, AppCard, AppHeading, AppText } from "@/components/atoms";
import { ReviewStars } from "@/features/reviews/components/review-stars";
import type { PublicReview } from "../reviews-domain";

export function PublicReviewCard({ review }: { review: PublicReview }) {
  const { fontScale } = useWindowDimensions();
  return (
    <AppCard surface="panel" padding="md" style={{ gap: 16 }}>
      <View
        style={{
          flexDirection: fontScale > 1.2 ? "column" : "row",
          gap: 12,
          alignItems: "flex-start"
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            flex: 1
          }}
        >
          <AppAvatar
            name={review.reviewer_name}
            imageUrl={review.reviewer_avatar_url}
            size={38}
            decorative
          />
          <View style={{ flex: 1, gap: 3 }}>
            <AppHeading variant="card">{review.reviewer_name}</AppHeading>
            <AppText variant="caption" tone="muted">
              Session ·{" "}
              {new Date(review.session_starts_at).toLocaleDateString("en-GB", {
                timeZone: review.timezone,
                day: "numeric",
                month: "short",
                year: "numeric"
              })}
            </AppText>
          </View>
        </View>
        <ReviewStars value={review.rating} size={16} />
      </View>
      {review.comment ? (
        <AppText>{review.comment}</AppText>
      ) : (
        <AppText variant="bodySm" tone="subtle">
          Rating without a comment
        </AppText>
      )}
    </AppCard>
  );
}
