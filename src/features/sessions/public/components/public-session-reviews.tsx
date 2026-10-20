import { View } from "react-native";
import { ArrowRight } from "lucide-react-native";
import {
  AppButton,
  AppCard,
  AppHeading,
  AppText,
  ErrorState,
  SkeletonBlock
} from "@/components/atoms";
import { atomPalette as c } from "@/components/atoms/theme";
import { PublicReviewCard } from "./public-review-card";
import { PublicReviewOverview } from "./public-review-overview";
import type { PublicReviews } from "../reviews-domain";

export type PublicReviewsState = {
  data?: PublicReviews | null;
  loading: boolean;
  error: boolean;
  retrying?: boolean;
  onRetry: () => void;
  onAll: () => void;
};
export function PublicSessionReviews({
  data,
  loading,
  error,
  retrying,
  onRetry,
  onAll
}: PublicReviewsState) {
  return (
    <View style={{ gap: 20 }}>
      <AppHeading variant="section">Reviews from past sessions</AppHeading>
      {loading ? (
        <SkeletonBlock height={220} />
      ) : error ? (
        <ErrorState
          title="Couldn’t load reviews"
          onRetry={onRetry}
          retrying={retrying}
        />
      ) : !data?.total ? (
        <AppCard surface="panel" padding="md" style={{ gap: 6 }}>
          <AppHeading variant="card">No reviews yet</AppHeading>
          <AppText variant="bodySm" tone="muted">
            Feedback from past sessions will appear here.
          </AppText>
        </AppCard>
      ) : (
        <>
          <PublicReviewOverview data={data} />
          <View style={{ height: 1, backgroundColor: c.borderSubtle }} />
          {data.items.slice(0, 2).map((review) => (
            <PublicReviewCard key={review.id} review={review} />
          ))}
          <AppButton
            color="essential"
            variant="ghost"
            icon={ArrowRight}
            onPress={onAll}
          >
            See all {data.total} {data.total === 1 ? "review" : "reviews"}
          </AppButton>
        </>
      )}
    </View>
  );
}
