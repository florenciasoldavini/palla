import { supabase } from "@/lib/supabase";
import type { DashboardPeriod, DashboardReviewCursor } from "../domain";

export async function fetchDashboard(period: DashboardPeriod) {
  if (!supabase) throw new Error("Dashboard access is unavailable.");
  const { data, error } = await supabase.rpc("get_organizer_dashboard", {
    p_period: period
  });
  if (error) throw error;
  return data;
}
export async function fetchDashboardReviews(
  period: DashboardPeriod,
  cursor?: DashboardReviewCursor
) {
  if (!supabase) throw new Error("Reviews are unavailable.");
  const { data, error } = await supabase.rpc(
    "get_organizer_dashboard_reviews",
    {
      p_period: period,
      p_cursor: cursor ?? null,
      p_limit: 20
    }
  );
  if (error) throw error;
  return data;
}
