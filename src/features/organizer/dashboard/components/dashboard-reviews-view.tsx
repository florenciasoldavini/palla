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
import { SelectMenu } from "@/components/atoms/select-menu";
import { atomPalette as c } from "@/components/atoms/theme";
import { DashboardReviewCard } from "./dashboard-review-card";
import type { DashboardPeriod, DashboardReview } from "../domain";

export function DashboardReviewsView({
  items,
  period,
  loading,
  error,
  refreshing,
  loadingMore,
  hasMore,
  onPeriod,
  onBack,
  onReview,
  onRefresh,
  onMore,
  preview = false
}: {
  items: DashboardReview[];
  period: DashboardPeriod;
  loading: boolean;
  error: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  onPeriod: (period: DashboardPeriod) => void;
  onBack: () => void;
  onReview: (registration: string) => void;
  onRefresh: () => void;
  onMore: () => void;
  preview?: boolean;
}) {
  return (
    <Screen scrollable={false} contentStyle={{ flex: 1 }}>
      <View style={{ flex: 1, gap: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <AppButton
            variant="ghost"
            layout="icon"
            fullWidth={false}
            icon={ArrowLeft}
            accessibilityLabel="Back to overview"
            onPress={onBack}
          />
          <AppHeading variant="section" style={{ flex: 1 }}>
            Player feedback
          </AppHeading>
        </View>
        <FlatList
          key={period}
          data={items}
          keyExtractor={(item) => item.id}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (hasMore && !loadingMore && !loading && !error) onMore();
          }}
          initialNumToRender={6}
          windowSize={7}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ gap: 16, paddingBottom: 24 }}
          ListHeaderComponent={
            <View style={{ gap: 12 }}>
              <View style={{ alignSelf: "flex-start", width: 180 }}>
                <SelectMenu
                  accessibilityLabel="Review period"
                  minWidth={180}
                  value={period}
                  onChange={onPeriod}
                  options={[
                    { label: "This month", value: "this_month" },
                    { label: "Last month", value: "last_month" }
                  ]}
                />
              </View>
              <AppText variant="bodySm" tone="subtle">
                Reviews of your completed sessions in this period.
              </AppText>
              {preview && (
                <AppText variant="caption" tone="subtle">
                  Design preview · Illustrative reviews · No account changes
                </AppText>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <DashboardReviewCard
              review={item}
              timezone="America/Argentina/Buenos_Aires"
              onPress={() => onReview(item.registration_id)}
            />
          )}
          ListEmptyComponent={
            loading ? (
              <SkeletonBlock height={220} />
            ) : error ? (
              <ErrorState title="Couldn’t load reviews" onRetry={onRefresh} />
            ) : (
              <EmptyState
                title="No reviews yet"
                description="Published feedback for these sessions will appear here."
              />
            )
          }
          ListFooterComponent={
            items.length ? (
              <View style={{ gap: 12 }}>
                {error && (
                  <AppText tone="subtle">
                    Couldn’t load more reviews. Your loaded reviews are still
                    available.
                  </AppText>
                )}
                {(hasMore || error) && (
                  <AppButton
                    variant="ghost"
                    color="essential"
                    loading={loadingMore}
                    onPress={error && !hasMore ? onRefresh : onMore}
                  >
                    {error ? "Retry loading reviews" : "Load more reviews"}
                  </AppButton>
                )}
                {!hasMore && !error && (
                  <AppText
                    variant="caption"
                    tone="subtle"
                    style={{ textAlign: "center", color: c.textSubtle }}
                  >
                    You’re up to date.
                  </AppText>
                )}
              </View>
            ) : null
          }
        />
      </View>
    </Screen>
  );
}
