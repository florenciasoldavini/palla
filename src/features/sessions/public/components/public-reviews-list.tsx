import { FlatList, View } from "react-native";
import { ArrowLeft } from "lucide-react-native";
import {
  AppButton,
  AppHeading,
  AppText,
  EmptyState,
  ErrorState,
  Screen,
  SkeletonBlock
} from "@/components/atoms";
import { PublicReviewOverview } from "./public-review-overview";
import { PublicReviewCard } from "./public-review-card";
import type { PublicReview, PublicReviews } from "../reviews-domain";

export function PublicReviewsList({
  title,
  summary,
  items,
  loading,
  error,
  refreshing,
  loadingMore,
  hasMore,
  onBack,
  onRefresh,
  onMore,
  preview = false,
  unavailable = false
}: {
  title: string;
  summary?: PublicReviews | null;
  items: PublicReview[];
  loading: boolean;
  error: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  onBack: () => void;
  onRefresh: () => void;
  onMore: () => void;
  preview?: boolean;
  unavailable?: boolean;
}) {
  return (
    <Screen scrollable={false} contentStyle={{ flex: 1 }}>
      <View style={{ flex: 1, gap: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <AppButton
            variant="ghost"
            layout="icon"
            fullWidth={false}
            icon={ArrowLeft}
            accessibilityLabel="Back to session"
            onPress={onBack}
          />
          <AppHeading variant="section" style={{ flex: 1 }}>
            Past session reviews
          </AppHeading>
        </View>
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <PublicReviewCard review={item} />}
          initialNumToRender={5}
          windowSize={7}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ gap: 16, paddingBottom: 24 }}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListHeaderComponent={
            <View style={{ gap: 16 }}>
              <AppText tone="muted">{title}</AppText>
              {preview && (
                <AppText variant="caption" tone="subtle">
                  Design preview · Illustrative reviews
                </AppText>
              )}
              {summary && <PublicReviewOverview data={summary} />}
            </View>
          }
          ListEmptyComponent={
            loading ? (
              <SkeletonBlock height={240} />
            ) : error ? (
              <ErrorState
                title="Couldn’t load reviews"
                onRetry={onRefresh}
                retrying={refreshing}
              />
            ) : unavailable ? (
              <EmptyState
                title="Session unavailable"
                description="This session is private, removed, or hasn’t been published."
              />
            ) : (
              <EmptyState
                title="No reviews yet"
                description="Published feedback from past sessions will appear here."
              />
            )
          }
          ListFooterComponent={
            items.length > 0 && (hasMore || error) ? (
              <View style={{ gap: 12 }}>
                {error && (
                  <AppText tone="muted">
                    Couldn’t load more reviews. Please try again.
                  </AppText>
                )}
                <AppButton
                  variant="bordered"
                  loading={loadingMore}
                  onPress={onMore}
                >
                  {error ? "Try again" : "Load more reviews"}
                </AppButton>
              </View>
            ) : null
          }
        />
      </View>
    </Screen>
  );
}
