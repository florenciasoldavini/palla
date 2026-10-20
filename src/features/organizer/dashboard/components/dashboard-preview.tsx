import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AppText } from "@/components/atoms";
import { AppBottomSheet } from "@/components/atoms/bottom-sheet";
import { DashboardView } from "./dashboard-view";
import { DashboardReviewCard } from "./dashboard-review-card";
import type { DashboardPeriod, OrganizerDashboard } from "../domain";

export const dashboardPreviewData: OrganizerDashboard = {
  period: "this_month",
  bounds: {
    start_at: "2026-10-01T03:00:00Z",
    end_at: "2026-10-20T15:00:00Z",
    previous_start_at: "2026-09-01T03:00:00Z",
    previous_end_at: "2026-09-20T15:00:00Z",
    start_date: "2026-10-01",
    end_date: "2026-10-20",
    previous_start_date: "2026-09-01",
    previous_end_date: "2026-09-20",
    timezone: "America/Argentina/Buenos_Aires"
  },
  current: {
    sessions: 12,
    bookings: 84,
    capacity: 96,
    fill_rate: 87.5,
    average_rating: 4.8,
    review_count: 18
  },
  previous: {
    sessions: 9,
    bookings: 68,
    capacity: 84,
    fill_rate: 81,
    average_rating: 4.7,
    review_count: 13
  },
  chart: Array.from({ length: 20 }, (_, i) => ({
    day: i + 1,
    current: Math.round((84 * i) / 19),
    previous: Math.round((68 * i) / 19)
  })),
  recent_reviews: [
    {
      id: "da000000-0000-4000-8000-000000000001",
      registration_id: "da000000-0000-4000-8000-000000000011",
      rating: 5,
      comment:
        "Great organization and a friendly atmosphere. Already looking forward to the next session!",
      reviewer_name: "Marcos Rivera",
      reviewer_avatar_url: null,
      created_at: "2026-10-19T20:00:00Z",
      session_title: "Friday Social Padel",
      session_starts_at: "2026-10-16T20:00:00Z"
    },
    {
      id: "da000000-0000-4000-8000-000000000002",
      registration_id: "da000000-0000-4000-8000-000000000012",
      rating: 4,
      comment: "Plenty of playing time and everyone felt welcome.",
      reviewer_name: "Elena Salgado",
      reviewer_avatar_url: null,
      created_at: "2026-10-18T20:00:00Z",
      session_title: "Sunday Social Padel",
      session_starts_at: "2026-10-18T14:00:00Z"
    }
  ],
  attention: [
    {
      id: "da000000-0000-4000-8000-000000000021",
      title: "Evening Social Padel",
      starts_at: "2026-10-21T22:00:00Z",
      ends_at: "2026-10-21T23:30:00Z",
      capacity: 8,
      confirmed_count: 3,
      venue_name: "Club Padel Buenos Aires"
    }
  ],
  next_session: {
    id: "da000000-0000-4000-8000-000000000021",
    title: "Evening Social Padel",
    starts_at: "2026-10-21T22:00:00Z",
    ends_at: "2026-10-21T23:30:00Z",
    capacity: 8,
    confirmed_count: 3,
    venue_name: "Club Padel Buenos Aires"
  },
  unread_conversations: 2,
  generated_at: "2026-10-20T15:00:00Z"
};
export function DashboardPreview() {
  const { state } = useLocalSearchParams<{ state?: string }>();
  const router = useRouter();
  const [period, setPeriod] = useState<DashboardPeriod>("this_month");
  const [sheet, setSheet] = useState<string | null>(null);
  const empty = state === "empty";
  const data = {
    ...dashboardPreviewData,
    period,
    ...(period === "last_month"
      ? {
          current: dashboardPreviewData.previous,
          previous: dashboardPreviewData.current,
          bounds: {
            ...dashboardPreviewData.bounds,
            start_at: "2026-09-01T03:00:00Z",
            end_at: "2026-10-01T03:00:00Z",
            previous_start_at: "2026-08-01T03:00:00Z",
            previous_end_at: "2026-09-01T03:00:00Z",
            start_date: "2026-09-01",
            end_date: "2026-09-30",
            previous_start_date: "2026-08-01",
            previous_end_date: "2026-08-31"
          },
          chart: Array.from({ length: 31 }, (_, i) => ({
            day: i + 1,
            current: Math.round((68 * Math.min(i, 29)) / 29),
            previous: Math.round((84 * i) / 30)
          })),
          recent_reviews: dashboardPreviewData.recent_reviews.map((review) => ({
            ...review,
            session_starts_at: review.session_starts_at.replace(
              "2026-10",
              "2026-09"
            )
          }))
        }
      : {}),
    ...(empty
      ? {
          current: {
            sessions: 0,
            bookings: 0,
            capacity: 0,
            fill_rate: null,
            average_rating: null,
            review_count: 0
          },
          previous: {
            sessions: 0,
            bookings: 0,
            capacity: 0,
            fill_rate: null,
            average_rating: null,
            review_count: 0
          },
          chart: [],
          attention: [],
          recent_reviews: [],
          unread_conversations: 0,
          next_session: null
        }
      : {})
  };
  const action = () => setSheet("Preview action");
  return (
    <>
      <DashboardView
        data={state === "error" ? undefined : data}
        period={period}
        loading={state === "loading"}
        error={state === "error"}
        refreshing={false}
        preview
        onPeriod={setPeriod}
        onRefresh={action}
        onSession={action}
        onMessages={action}
        onSessions={action}
        onReview={() => setSheet("Review")}
        onReviews={() =>
          router.push({
            pathname: "/sessions-preview/dashboard-reviews",
            params: { period }
          })
        }
      />
      {sheet && (
        <AppBottomSheet
          title={sheet}
          closeLabel="Close dashboard preview"
          busy={false}
          onClose={() => setSheet(null)}
        >
          {sheet === "Preview action" ? (
            <AppText>Design preview · No account changes</AppText>
          ) : (
            dashboardPreviewData.recent_reviews
              .slice(0, sheet === "Review" ? 1 : 2)
              .map((review) => (
                <DashboardReviewCard
                  key={review.id}
                  review={review}
                  timezone={dashboardPreviewData.bounds.timezone}
                  onPress={() => setSheet("Review")}
                />
              ))
          )}
        </AppBottomSheet>
      )}
    </>
  );
}
