import { useContext } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { AuthContext } from "@/features/auth/auth-provider";
import {
  loadDashboard,
  loadDashboardReviews
} from "../services/dashboard.service";
import type { DashboardPeriod, DashboardReviewCursor } from "../domain";

export function useOrganizerDashboard(period: DashboardPeriod) {
  const { user } = useContext(AuthContext);
  return useQuery({
    queryKey: ["organizer-dashboard", user?.id, period],
    queryFn: () => loadDashboard(period),
    enabled: user?.organizer_status === "active",
    staleTime: 30000,
    refetchInterval: 60000
  });
}
export function useDashboardReviews(period: DashboardPeriod, enabled: boolean) {
  const { user } = useContext(AuthContext);
  return useInfiniteQuery({
    queryKey: ["organizer-dashboard-reviews", user?.id, period],
    queryFn: ({ pageParam }) => loadDashboardReviews(period, pageParam),
    initialPageParam: undefined as DashboardReviewCursor | undefined,
    getNextPageParam: (page) => page.next_cursor ?? undefined,
    enabled: enabled && user?.organizer_status === "active",
    staleTime: 0
  });
}
