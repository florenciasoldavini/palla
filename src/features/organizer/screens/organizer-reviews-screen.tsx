import { useCallback, useState } from "react";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { ReviewSheet } from "@/features/reviews/components/review-sheet";
import { DashboardReviewsView } from "../dashboard/components/dashboard-reviews-view";
import { useDashboardReviews } from "../dashboard/hooks/use-dashboard";
import {
  dashboardPeriodSchema,
  type DashboardPeriod
} from "../dashboard/domain";

export default function OrganizerReviewsScreen() {
  const params = useLocalSearchParams<{ period?: string }>();
  const [period, setPeriod] = useState<DashboardPeriod>(
    () => dashboardPeriodSchema.safeParse(params.period).data ?? "this_month"
  );
  const [registration, setRegistration] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter(),
    client = useQueryClient();
  const query = useDashboardReviews(period, true);
  const refetch = query.refetch;
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch])
  );
  const seen = new Set<string>();
  const items = (query.data?.pages.flatMap((page) => page.items) ?? []).filter(
    (review) => {
      if (seen.has(review.id)) return false;
      seen.add(review.id);
      return true;
    }
  );
  return (
    <>
      <DashboardReviewsView
        items={items}
        period={period}
        loading={query.isPending}
        error={query.isError}
        refreshing={refreshing}
        loadingMore={query.isFetchingNextPage}
        hasMore={!!query.hasNextPage}
        onPeriod={setPeriod}
        onBack={() =>
          router.canGoBack()
            ? router.back()
            : router.replace("/(organizer)/dashboard")
        }
        onReview={setRegistration}
        onRefresh={() => {
          setRefreshing(true);
          void refetch().finally(() => setRefreshing(false));
        }}
        onMore={() => {
          if (!query.isFetching && query.hasNextPage)
            void query.fetchNextPage();
        }}
      />
      {registration && (
        <ReviewSheet
          registration={registration}
          onClose={() => {
            setRegistration(null);
            void refetch();
            void client.invalidateQueries({
              queryKey: ["organizer-dashboard"]
            });
          }}
        />
      )}
    </>
  );
}
