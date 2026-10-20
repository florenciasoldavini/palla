import {
  AppBadge,
  AppButton,
  AppCard,
  AppHeading,
  AppText
} from "@/components/atoms";
import { AppBottomSheet } from "@/components/atoms/bottom-sheet";
import { atomPalette as c } from "@/components/atoms/theme";
import { ArrowRight, Clock3, Repeat2, Users } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  Platform,
  RefreshControl,
  ScrollView,
  useWindowDimensions,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  categoriesLabel,
  publicSessionState,
  type PublicSession
} from "../domain";
import { PublicSessionHeader, PublicSessionHero } from "./public-session-hero";
import { PublicSessionMap } from "./public-session-map";
import { PublicSessionPlayers } from "./public-session-players";
import { PublicSessionSummary } from "./public-session-summary";
import { PublicSessionPolicies } from "./public-session-policies";

import {
  PublicSessionReviews,
  type PublicReviewsState
} from "./public-session-reviews";

export function PublicSessionView({
  session: s,
  onBack,
  onShare,
  sharing = false,
  onDirections,
  onOpenApp,
  onRefresh,
  refreshing = false,
  preview = false,
  reviews
}: {
  session: PublicSession;
  onBack: () => void;
  onShare: () => void;
  sharing?: boolean;
  onDirections?: () => void;
  onOpenApp?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  preview?: boolean;
  reviews: PublicReviewsState;
}) {
  const { fontScale, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [now, setNow] = useState(Date.now());
  const [joining, setJoining] = useState(false);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const state = publicSessionState(s, now);
  const remaining = Math.max(0, s.capacity - s.confirmed_count);
  const status = {
    cancelled: "Session cancelled",
    completed: "Completed",
    started: "In progress",
    closed: "Registration closed",
    not_open: "Registration opens soon",
    full: "Session full",
    available: `${remaining} ${remaining === 1 ? "spot" : "spots"} left`
  }[state];
  const price = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: s.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(s.price_minor / 100);
  const date = (value: string) =>
    new Date(value).toLocaleDateString("en-GB", {
      timeZone: s.timezone,
      weekday: "short",
      day: "numeric",
      month: "short"
    });
  const time = (value: string) =>
    new Date(value).toLocaleTimeString("en-GB", {
      timeZone: s.timezone,
      hour: "2-digit",
      minute: "2-digit"
    });
  const timeRange = `${time(s.starts_at)}–${time(s.ends_at)}`;
  const stacked = fontScale > 1.2 || width < 350;
  const blocked =
    state !== "available" || s.viewer_is_host || Boolean(s.viewer_registration);
  const action = s.viewer_is_host
    ? "You’re hosting"
    : s.viewer_registration === "confirmed"
      ? "You’re registered"
      : s.viewer_registration === "waitlisted"
        ? "On the waitlist"
        : state === "available"
          ? "Join session"
          : status;
  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <PublicSessionHeader
        onBack={onBack}
        onShare={onShare}
        sharing={sharing}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={c.accent}
              colors={[c.accent]}
            />
          ) : undefined
        }
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View style={{ width: "100%", maxWidth: 600, alignSelf: "center" }}>
          <PublicSessionHero session={s} status={status} />
          <View style={{ paddingHorizontal: 20, paddingBottom: 28, gap: 28 }}>
            {preview ? (
              <AppText tone="subtle" variant="caption">
                Design preview · Illustrative session and players
              </AppText>
            ) : null}
            {s.visibility === "private" ? (
              <AppText tone="subtle" variant="bodySm">
                Private session · This preview is only visible to you.
              </AppText>
            ) : null}
            <PublicSessionSummary
              date={date(s.starts_at)}
              timeRange={timeRange}
              duration={Math.round(
                (Date.parse(s.ends_at) - Date.parse(s.starts_at)) / 60000
              )}
              categories={categoriesLabel(s.allowed_categories)}
              price={price}
              stacked={stacked}
            />
            <PublicSessionMap
              venue={s.venue}
              court={s.court_label}
              onDirections={onDirections}
            />
            {s.status !== "cancelled" ? (
              <PublicSessionPlayers session={s} />
            ) : (
              <AppCard tone="muted">
                <AppText>
                  This occurrence has been cancelled. Registration is no longer
                  available.
                </AppText>
              </AppCard>
            )}
            <View style={{ gap: 12 }}>
              <AppHeading variant="section">About the session</AppHeading>
              <AppText tone="muted">
                {s.description || "The host hasn’t added a description yet."}
              </AppText>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <AppBadge icon={Clock3}>
                  {Math.round(
                    (Date.parse(s.ends_at) - Date.parse(s.starts_at)) / 60000
                  )}{" "}
                  minutes
                </AppBadge>
                <AppBadge icon={Users}>
                  {
                    {
                      all: "All genders",
                      men_only: "Men only",
                      women_only: "Women only"
                    }[s.participant_gender_policy]
                  }
                </AppBadge>
                {s.weekly ? <AppBadge icon={Repeat2}>Weekly</AppBadge> : null}
              </View>
            </View>
            <PublicSessionReviews {...reviews} />
            <PublicSessionPolicies
              registrationCloses={
                s.registration_closes_at
                  ? `${date(s.registration_closes_at)} · ${time(s.registration_closes_at)}`
                  : null
              }
              registrationOpens={
                s.registration_opens_at && state === "not_open"
                  ? `${date(s.registration_opens_at)} · ${time(s.registration_opens_at)}`
                  : null
              }
              cancellationDeadline={
                s.cancellation_deadline_at
                  ? `${date(s.cancellation_deadline_at)} · ${time(s.cancellation_deadline_at)}`
                  : null
              }
              arrivalInstructions={s.venue.arrival_instructions}
              paymentInstructions={s.payment_instructions}
              timezone={s.timezone}
            />
          </View>
        </View>
      </ScrollView>
      <View
        style={{
          borderTopWidth: 1,
          borderColor: c.borderSubtle,
          backgroundColor: c.surface,
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: Math.max(insets.bottom, 16)
        }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: 560,
            alignSelf: "center",
            gap: 12,
            flexDirection: stacked ? "column" : "row",
            alignItems: stacked ? "stretch" : "center"
          }}
        >
          <View style={{ gap: 2 }}>
            <AppText variant="caption" tone="muted">
              Total for 1 player · {s.currency}
            </AppText>
            <AppHeading variant="title">{price}</AppHeading>
          </View>
          <AppButton
            style={{ flex: stacked ? undefined : 1 }}
            fullWidth={stacked}
            color="essential"
            icon={ArrowRight}
            isDisabled={blocked && Platform.OS !== "web"}
            onPress={() =>
              Platform.OS === "web" ? onOpenApp?.() : setJoining(true)
            }
          >
            {Platform.OS === "web" ? "Open in Palla" : action}
          </AppButton>
        </View>
      </View>
      {joining ? (
        <AppBottomSheet
          busy={false}
          title="Join this session"
          onClose={() => setJoining(false)}
          footer={
            <AppButton color="essential" onPress={() => setJoining(false)}>
              Got it
            </AppButton>
          }
        >
          <AppText>
            Joining sessions in Palla is coming soon. No place has been
            reserved.
          </AppText>
        </AppBottomSheet>
      ) : null}
    </View>
  );
}
