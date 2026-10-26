import { z } from "zod";

export const dashboardPeriodSchema = z.enum(["this_month", "last_month"]);
export type DashboardPeriod = z.infer<typeof dashboardPeriodSchema>;
const count = z.number().int().nonnegative();
const timestamp = z.iso.datetime({ offset: true });
export const dashboardSummarySchema = z.object({
  sessions: count,
  bookings: count,
  capacity: count,
  fill_rate: z.number().min(0).max(100).nullable(),
  average_rating: z.number().min(1).max(5).nullable(),
  review_count: count
});
export type DashboardSummary = z.infer<typeof dashboardSummarySchema>;
export const dashboardReviewSchema = z.object({
  id: z.uuid(),
  registration_id: z.uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().nullable(),
  created_at: timestamp,
  reviewer_name: z.string(),
  reviewer_avatar_url: z.string().nullable(),
  session_title: z.string(),
  session_starts_at: timestamp
});
export type DashboardReview = z.infer<typeof dashboardReviewSchema>;
export const reviewCursorSchema = z.object({
  id: z.uuid(),
  created_at: timestamp
});
export type DashboardReviewCursor = z.infer<typeof reviewCursorSchema>;
export const dashboardReviewPageSchema = z.object({
  items: z.array(dashboardReviewSchema).max(20),
  next_cursor: reviewCursorSchema.nullable()
});
const upcomingSessionSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  starts_at: timestamp,
  ends_at: timestamp,
  capacity: count.positive(),
  venue_name: z.string(),
  confirmed_count: count
});
export type DashboardSession = z.infer<typeof upcomingSessionSchema>;
export const dashboardSchema = z.object({
  period: dashboardPeriodSchema,
  bounds: z.object({
    start_at: timestamp,
    end_at: timestamp,
    previous_start_at: timestamp,
    previous_end_at: timestamp,
    timezone: z.string(),
    start_date: z.iso.date(),
    end_date: z.iso.date(),
    previous_start_date: z.iso.date(),
    previous_end_date: z.iso.date()
  }),
  current: dashboardSummarySchema,
  previous: dashboardSummarySchema,
  chart: z
    .array(z.object({ day: count.positive(), current: count, previous: count }))
    .max(31),
  attention: z.array(upcomingSessionSchema).max(3),
  unread_conversations: count,
  next_session: upcomingSessionSchema.nullable(),
  recent_reviews: z.array(dashboardReviewSchema).max(2),
  generated_at: timestamp
});
export type OrganizerDashboard = z.infer<typeof dashboardSchema>;

export function bookingChange(current: number, previous: number) {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 100);
}
export function dashboardRange(start: string, end: string) {
  const format = (date: string) =>
    new Date(`${date}T12:00:00Z`).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      timeZone: "UTC"
    });
  return `${format(start)}–${format(end)}`;
}
export function bookingChartGeometry(
  points: OrganizerDashboard["chart"],
  width: number,
  fontScale = 1
) {
  const left = 30 * fontScale,
    right = 14,
    top = 16,
    bottom = 30 * fontScale;
  const height = 160 + 35 * (fontScale - 1);
  const ceiling = Math.max(
    4,
    Math.ceil(
      Math.max(...points.flatMap((p) => [p.current, p.previous]), 0) / 4
    ) * 4
  );
  const x = (index: number) =>
    left +
    (index / Math.max(1, points.length - 1)) *
      Math.max(1, width - left - right);
  const y = (value: number) =>
    top + (1 - value / ceiling) * (height - top - bottom);
  const path = (key: "current" | "previous") =>
    points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p[key])}`).join(" ");
  return {
    left,
    top,
    height,
    bottom,
    ceiling,
    x,
    y,
    current: path("current"),
    previous: path("previous")
  };
}
