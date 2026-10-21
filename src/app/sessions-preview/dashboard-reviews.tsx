import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { DashboardReviewsView } from "@/features/organizer/dashboard/components/dashboard-reviews-view";
import { dashboardPreviewData } from "@/features/organizer/dashboard/components/dashboard-preview";
import {
  dashboardPeriodSchema,
  type DashboardPeriod
} from "@/features/organizer/dashboard/domain";
import { AppBottomSheet } from "@/components/atoms/bottom-sheet";
import { AppText } from "@/components/atoms";
export default function ReviewsPreview() {
  const params = useLocalSearchParams<{ period?: string; state?: string }>();
  const router = useRouter();
  const [period, setPeriod] = useState<DashboardPeriod>(
    () => dashboardPeriodSchema.safeParse(params.period).data ?? "this_month"
  );
  const [count, setCount] = useState(20);
  const [selected, setSelected] = useState(false);
  const items = Array.from({ length: count }, (_, i) => ({
    ...dashboardPreviewData.recent_reviews[i % 2],
    id: `da000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`
  }));
  return (
    <>
      <DashboardReviewsView
        items={
          params.state === "empty" ||
          params.state === "error" ||
          params.state === "loading"
            ? []
            : items
        }
        period={period}
        loading={params.state === "loading"}
        error={params.state === "error"}
        refreshing={false}
        loadingMore={false}
        hasMore={count < 40}
        preview
        onPeriod={(value) => {
          setPeriod(value);
          setCount(20);
        }}
        onBack={() =>
          router.canGoBack()
            ? router.back()
            : router.replace("/sessions-preview/organizer-dashboard")
        }
        onReview={() => setSelected(true)}
        onRefresh={() => setCount(20)}
        onMore={() => setCount(40)}
      />
      {selected && (
        <AppBottomSheet
          title="Review preview"
          closeLabel="Close review preview"
          busy={false}
          onClose={() => setSelected(false)}
        >
          <AppText>Illustrative review · No account changes</AppText>
        </AppBottomSheet>
      )}
    </>
  );
}
