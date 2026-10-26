import { useCallback, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { ReviewSheet } from "@/features/reviews/components/review-sheet";
import { DashboardView } from "../dashboard/components/dashboard-view";
import { useOrganizerDashboard } from "../dashboard/hooks/use-dashboard";
import { type DashboardPeriod } from "../dashboard/domain";

export default function OrganizerDashboardScreen() {
  const router = useRouter();
  const [period, setPeriod] = useState<DashboardPeriod>("this_month");
  const [refreshing, setRefreshing] = useState(false);
  const [registration, setRegistration] = useState<string | null>(null);
  const query = useOrganizerDashboard(period);
  const refetch = query.refetch;
  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch])
  );
  return (
    <>
      <DashboardView
        data={query.data}
        period={period}
        loading={query.isPending}
        error={query.isError}
        refreshing={refreshing}
        onPeriod={setPeriod}
        onRefresh={() => {
          setRefreshing(true);
          void refetch().finally(() => setRefreshing(false));
        }}
        onSession={(id) =>
          router.push({ pathname: "/organizer-session/[id]", params: { id } })
        }
        onSessions={() => router.push("/(organizer)/sessions")}
        onMessages={() => router.push("/(organizer)/organizer-messages")}
        onReview={setRegistration}
        onReviews={() =>
          router.push({ pathname: "/organizer-reviews", params: { period } })
        }
      />
      {registration && (
        <ReviewSheet
          registration={registration}
          onClose={() => {
            setRegistration(null);
            void refetch();
          }}
        />
      )}
    </>
  );
}
