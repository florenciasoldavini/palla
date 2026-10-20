import { View, useWindowDimensions } from "react-native";
import { ArrowRight } from "lucide-react-native";
import {
  AppButton,
  AppCard,
  AppHeading,
  AppText,
  ErrorState,
  Screen,
  SkeletonBlock
} from "@/components/atoms";
import { SelectMenu } from "@/components/atoms/select-menu";
import { DashboardStats } from "./dashboard-stats";
import { BookingChart } from "./booking-chart";
import { DashboardReviewCard } from "./dashboard-review-card";
import { DashboardAttention, DashboardNextSession } from "./dashboard-upcoming";
import type { DashboardPeriod, OrganizerDashboard } from "../domain";

export function DashboardView({
  data,
  period,
  loading,
  error,
  refreshing,
  preview = false,
  onPeriod,
  onRefresh,
  onSession,
  onMessages,
  onSessions,
  onReview,
  onReviews
}: {
  data?: OrganizerDashboard;
  period: DashboardPeriod;
  loading: boolean;
  error: boolean;
  refreshing: boolean;
  preview?: boolean;
  onPeriod: (period: DashboardPeriod) => void;
  onRefresh: () => void;
  onSession: (id: string) => void;
  onMessages: () => void;
  onSessions: () => void;
  onReview: (registration: string) => void;
  onReviews: () => void;
}) {
  const { fontScale } = useWindowDimensions();
  return (
    <Screen
      scrollResetKey={period}
      onRefresh={onRefresh}
      refreshing={refreshing}
    >
      <View style={{ gap: 24, paddingBottom: 24 }}>
        <View style={{ gap: 8 }}>
          <View
            style={{
              flexDirection: fontScale > 1.3 ? "column" : "row",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 12
            }}
          >
            <AppHeading variant="title">Overview</AppHeading>
            <View style={{ width: fontScale > 1.3 ? "100%" : 160 }}>
              <SelectMenu
                accessibilityLabel="Dashboard period"
                minWidth={138}
                value={period}
                onChange={onPeriod}
                options={[
                  { label: "This month", value: "this_month" },
                  { label: "Last month", value: "last_month" }
                ]}
              />
            </View>
          </View>
          <AppText variant="bodySm" tone="subtle">
            Your hosting, at a glance.
          </AppText>
          {preview && (
            <AppText variant="caption" tone="subtle">
              Design preview · Illustrative data · No account changes
            </AppText>
          )}
        </View>
        {loading ? (
          <View style={{ gap: 16 }}>
            <SkeletonBlock height={260} />
            <SkeletonBlock height={200} />
            <SkeletonBlock height={130} />
          </View>
        ) : !data ? (
          <ErrorState title="Couldn’t load your overview" onRetry={onRefresh} />
        ) : (
          <>
            {error && (
              <ErrorState
                title="Couldn’t refresh your overview"
                description="Showing the last loaded results."
                onRetry={onRefresh}
              />
            )}
            <DashboardStats current={data.current} previous={data.previous} />
            <AppText variant="caption" tone="subtle">
              All performance figures use completed sessions in this period.
              Fill rate measures booked places, not attendance.
            </AppText>
            <BookingChart data={data} />
            <View style={{ gap: 12 }}>
              <View
                style={{
                  flexDirection: fontScale > 1.3 ? "column" : "row",
                  justifyContent: "space-between",
                  alignItems: fontScale > 1.3 ? "flex-start" : "center",
                  gap: 5
                }}
              >
                <AppHeading variant="section">Player feedback</AppHeading>
                {!!data.current.review_count && (
                  <AppButton
                    color="essential"
                    variant="ghost"
                    size="sm"
                    fullWidth={false}
                    icon={ArrowRight}
                    onPress={onReviews}
                  >
                    View all reviews
                  </AppButton>
                )}
              </View>
              <AppText variant="caption" tone="subtle">
                Reviews of the completed sessions in this period.
              </AppText>
              {data.recent_reviews.length ? (
                data.recent_reviews.map((review) => (
                  <DashboardReviewCard
                    key={review.id}
                    review={review}
                    timezone={data.bounds.timezone}
                    onPress={() => onReview(review.registration_id)}
                  />
                ))
              ) : (
                <AppCard surface="panel" padding="md" style={{ gap: 5 }}>
                  <AppHeading variant="card">No reviews yet</AppHeading>
                  <AppText variant="bodySm" tone="subtle">
                    Published feedback for these sessions will appear here.
                  </AppText>
                </AppCard>
              )}
            </View>
            <DashboardAttention
              data={data}
              onSession={onSession}
              onMessages={onMessages}
            />
            <DashboardNextSession
              session={data.next_session}
              timezone={data.bounds.timezone}
              onSession={onSession}
              onAll={onSessions}
            />
          </>
        )}
      </View>
    </Screen>
  );
}
