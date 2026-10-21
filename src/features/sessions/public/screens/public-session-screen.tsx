import {
  AppButton,
  ErrorState,
  EmptyState,
  Screen,
  SkeletonBlock
} from "@/components/atoms";
import { useAppToast } from "@/components/atoms/toast";
import { AuthContext } from "@/features/auth/auth-provider";
import { useLocalSearchParams, useRouter } from "expo-router";
import { openSessionDestination } from "../services/public-session-navigation";
import { useContext } from "react";
import { View } from "react-native";
import { PublicSessionView } from "../components/public-session-view";
import { usePublicReviews } from "../hooks/use-public-reviews";
import { usePublicSession } from "../hooks/use-public-session";
import { useSessionShare } from "../hooks/use-session-share";
import { useCancelRegistration } from "@/features/registrations/hooks/use-cancel-registration";
import { cancelRegistrationError } from "@/features/registrations/services/cancel-registration.service";
import { useJoinSession } from "@/features/registrations/hooks/use-join-session";
import { joinErrorMessage } from "@/features/registrations/services/join.service";
import { venueDirectionsUrl } from "../services/public-session.service";

export default function PublicSessionScreen() {
  const { id: rawId } = useLocalSearchParams<{ id?: string | string[] }>();
  const id = typeof rawId === "string" ? rawId : "";
  const router = useRouter();
  const { user, session, isLoading } = useContext(AuthContext);
  const query = usePublicSession(id);
  const join = useJoinSession(id);
  const cancel = useCancelRegistration(id);
  const reviews = usePublicReviews(query.data ? id : "");
  const toast = useAppToast();
  const { share, sharing } = useSessionShare(
    id,
    query.data?.title ?? "Padel session",
    query.data?.description
  );
  const back = () =>
    router.canGoBack()
      ? router.back()
      : router.replace(
          user?.organizer_status === "active" &&
            user?.preferred_mode === "organizer"
            ? "/(organizer)/sessions"
            : user
              ? "/(player)/discover"
              : "/(auth)"
        );
  const open = async (url: string) => {
    try {
      await openSessionDestination(url);
    } catch {
      toast.show({
        title: "Couldn’t open this link",
        description: "Please try again.",
        tone: "error"
      });
    }
  };
  if (query.isPending)
    return (
      <Screen>
        <View style={{ gap: 20 }}>
          <SkeletonBlock height={320} />
          <SkeletonBlock height={140} />
          <AppButton variant="ghost" onPress={back}>
            Back
          </AppButton>
        </View>
      </Screen>
    );
  if (query.isError)
    return (
      <Screen>
        <ErrorState
          variant="fullScreen"
          title="Session couldn’t load"
          description="Check your connection and try again."
          onRetry={() => void query.refetch()}
          retrying={query.isFetching}
        />
        <AppButton variant="ghost" onPress={back}>
          Back
        </AppButton>
      </Screen>
    );
  const s = query.data;
  if (!s)
    return (
      <Screen>
        <EmptyState
          variant="fullScreen"
          title="Session unavailable"
          description="This session is private, removed, or hasn’t been published."
          action={{ label: "Go back", onPress: back }}
        />
      </Screen>
    );
  const maps = venueDirectionsUrl(s.venue);
  return (
    <PublicSessionView
      session={s}
      joining={join.isPending || isLoading}
      cancelling={cancel.isPending}
      cancellationError={
        cancel.isError ? cancelRegistrationError(cancel.error) : null
      }
      onCancelReset={cancel.reset}
      onCancel={async () => {
        if (cancel.isPending) return false;
        try {
          await cancel.mutateAsync();
          toast.show({
            title:
              s.viewer_registration === "waitlisted"
                ? "You left the waitlist"
                : "Registration cancelled",
            description:
              s.viewer_registration === "waitlisted"
                ? "You’re no longer in this session’s queue."
                : "Your place has been released.",
            tone: "success"
          });
          return true;
        } catch {
          return false;
        }
      }}
      onJoin={() => {
        if (join.isPending || isLoading) return;
        if (!session) {
          router.push("/sign-in");
          return;
        }
        if (!user?.onboarding_completed_at) {
          router.push("/onboarding");
          return;
        }
        join.mutate(undefined, {
          onSuccess: (result) =>
            toast.show({
              title:
                result.status === "confirmed"
                  ? "You’re registered"
                  : "You’re on the waitlist",
              description:
                result.status === "confirmed"
                  ? "Your place in this session is confirmed."
                  : "We’ll notify you when your place is confirmed.",
              tone: "success"
            }),
          onError: (error) =>
            toast.show({
              title: "Couldn’t join this session",
              description: joinErrorMessage(error),
              tone: "error"
            })
        });
      }}
      reviews={{
        data: reviews.data,
        loading: reviews.isPending,
        error: reviews.isError,
        retrying: reviews.isFetching,
        onRetry: () => void reviews.refetch(),
        onAll: () =>
          router.push({
            pathname: "/session-reviews",
            params: { id }
          })
      }}
      onBack={back}
      onShare={() =>
        s.visibility === "public"
          ? void share()
          : toast.show({
              title: "This session is private",
              description: "Only public sessions have public links.",
              tone: "info"
            })
      }
      sharing={sharing}
      onDirections={maps ? () => void open(maps) : undefined}
      onOpenApp={() =>
        void open(`palla://session?id=${encodeURIComponent(id)}`)
      }
      onRefresh={() => {
        void query.refetch();
        void reviews.refetch();
      }}
      refreshing={query.isRefetching}
    />
  );
}
