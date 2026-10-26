import { useSessionShare } from "@/features/sessions/public/hooks/use-session-share";
import {
  AppButton,
  ErrorState,
  Screen,
  SkeletonBlock
} from "@/components/atoms";
import { useAppToast } from "@/components/atoms/toast";
import { PublicSessionView } from "@/features/sessions/public/components/public-session-view";
import { publicSessionPreview } from "@/features/sessions/public/preview-fixture";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  publicReviewsPreview,
  emptyPublicReviews
} from "@/features/sessions/public/reviews-preview-fixture";
import { useState } from "react";

export default function PublicSessionPreview() {
  const { state } = useLocalSearchParams<{ state?: string }>();
  return <PublicSessionPreviewContent key={state ?? "default"} state={state} />;
}

function PublicSessionPreviewContent({ state }: { state?: string }) {
  const router = useRouter();
  const toast = useAppToast();
  const sharing = useSessionShare(
    publicSessionPreview.id,
    "Design preview · Friday Social Padel"
  );
  const [reviewsError, setReviewsError] = useState(state === "reviews-error");
  const [previewCancelled, setPreviewCancelled] = useState(false);
  const waitlistedPreview = state === "waitlisted" && !previewCancelled;
  const priorityPreview = [
    "waitlist-priority",
    "waitlist-priority-full",
    "waitlist-priority-closed"
  ].includes(state ?? "");
  const queuePreview = ["waitlist", "waitlist-full", "waitlisted"].includes(
    state ?? ""
  );
  const registeredPreview = state === "registered" && !previewCancelled;
  const [error, setError] = useState(state === "error");
  const back = () =>
    router.canGoBack()
      ? router.back()
      : router.replace("/sessions-preview/occurrence");
  if (state === "loading")
    return (
      <Screen>
        <SkeletonBlock height={320} />
        <SkeletonBlock height={140} />
        <AppButton variant="ghost" onPress={back}>
          Back
        </AppButton>
      </Screen>
    );
  if (error)
    return (
      <Screen>
        <ErrorState
          variant="fullScreen"
          title="Session couldn’t load"
          description="Check your connection and try again."
          onRetry={() => setError(false)}
        />
        <AppButton variant="ghost" onPress={back}>
          Back
        </AppButton>
      </Screen>
    );
  const s = {
    ...publicSessionPreview,
    ...(waitlistedPreview
      ? { viewer_registration: "waitlisted" as const }
      : {}),
    ...(queuePreview || priorityPreview
      ? {
          waitlist_enabled: state !== "waitlist-priority-closed",
          waitlist_capacity: 2,
          waitlisted_count:
            state === "waitlist-full" || state === "waitlist-priority-full"
              ? 2
              : 1
        }
      : {}),
    ...(registeredPreview ? { viewer_registration: "confirmed" as const } : {}),
    ...(state === "full" || registeredPreview || queuePreview
      ? {
          confirmed_count: 4,
          players: [
            ...publicSessionPreview.players,
            { name: "Sofia T.", avatar_url: null, category: 7 }
          ]
        }
      : {}),
    ...(priorityPreview
      ? {
          confirmed_count: 3,
          starts_at: new Date(Date.now() + 86400000).toISOString(),
          ends_at: new Date(Date.now() + 91800000).toISOString(),
          registration_closes_at: null,
          cancellation_deadline_at: null
        }
      : {}),
    ...(state === "cancelled" ? { status: "cancelled" as const } : {}),
    ...(state === "completed" ? { status: "completed" as const } : {}),
    ...(state === "anonymous" ? { players: [] } : {}),
    ...(state === "empty"
      ? {
          confirmed_count: 0,
          players: [],
          description: null,
          attributes: [],
          venue: { ...publicSessionPreview.venue, attributes: [] }
        }
      : {}),
    ...(state === "map-unavailable"
      ? {
          venue: {
            ...publicSessionPreview.venue,
            latitude: null,
            longitude: null,
            address: "zzqvxxkqvvxxzqvzzqxxvv"
          }
        }
      : {}),
    ...(state === "map-missing"
      ? {
          venue: {
            ...publicSessionPreview.venue,
            latitude: null,
            longitude: null,
            address: null,
            google_place_id: null
          }
        }
      : {}),
    ...(state === "closed"
      ? { registration_closes_at: new Date(Date.now() - 3600000).toISOString() }
      : {}),
    ...(state === "not-open"
      ? { registration_opens_at: new Date(Date.now() + 3600000).toISOString() }
      : {})
  };
  return (
    <PublicSessionView
      preview
      onCancel={async () => {
        setPreviewCancelled(true);
        toast.show({
          title: "Design preview",
          description:
            "No account changes. This shows the cancelled registration state.",
          tone: "info"
        });
        return true;
      }}
      reviews={{
        data:
          state === "reviews-empty" ? emptyPublicReviews : publicReviewsPreview,
        loading: state === "reviews-loading",
        error: reviewsError,
        onRetry: () => setReviewsError(false),
        onAll: () => router.push("/sessions-preview/public-reviews")
      }}
      session={s}
      onBack={back}
      onShare={() => void sharing.share()}
      sharing={sharing.sharing}
      onDirections={
        state === "map-missing"
          ? undefined
          : () =>
              toast.show({
                title: "Design preview",
                description: "A real venue opens in Maps.",
                tone: "info"
              })
      }
      onRefresh={() => toast.show({ title: "Preview refreshed", tone: "info" })}
    />
  );
}
