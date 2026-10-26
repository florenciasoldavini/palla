import {
  dashboardPeriodSchema,
  dashboardReviewPageSchema,
  dashboardSchema,
  reviewCursorSchema,
  type DashboardPeriod,
  type DashboardReviewCursor
} from "../domain";
import {
  fetchDashboard,
  fetchDashboardReviews
} from "../repositories/dashboard.repository";

export async function loadDashboard(period: DashboardPeriod) {
  return dashboardSchema.parse(
    await fetchDashboard(dashboardPeriodSchema.parse(period))
  );
}
export async function loadDashboardReviews(
  period: DashboardPeriod,
  cursor?: DashboardReviewCursor
) {
  return dashboardReviewPageSchema.parse(
    await fetchDashboardReviews(
      dashboardPeriodSchema.parse(period),
      cursor && reviewCursorSchema.parse(cursor)
    )
  );
}
