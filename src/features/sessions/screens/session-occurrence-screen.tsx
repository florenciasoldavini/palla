import { useAppToast } from "@/components/atoms/toast";
import { useSessionShare } from "../public/hooks/use-session-share";
import { SessionAnnouncements } from "@/features/announcements/components/session-announcements";
import { useOrganizerRoster } from "@/features/registrations/hooks/use-organizer-attendance";
import { OrganizerWaitlist } from "@/features/registrations/components/organizer-waitlist";
import { OrganizerAttendance } from "@/features/registrations/components/organizer-attendance";
import {
  AppButton,
  EmptyState,
  ErrorState,
  Screen,
  SkeletonBlock
} from "@/components/atoms";
import { SessionOccurrenceDetail } from "../components/session-occurrence-detail";
import { useOrganizerSessions } from "../hooks/use-organizer-sessions";
import { sessionErrorMessage } from "../services/organizer-sessions.service";
import { useLocalSearchParams, useRouter } from "expo-router";
import { View } from "react-native";

export default function SessionOccurrenceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const query = useOrganizerSessions();
  const roster = useOrganizerRoster(id ?? "");
  const session = query.data?.sessions.find((s) => s.id === id);
  const toast = useAppToast();
  const { share, sharing } = useSessionShare(
    id ?? "",
    session?.title ?? "Padel session",
    session?.description
  );
  const series = query.data?.series.find((s) => s.id === session?.series_id);
  const weekly = series?.draft_input.repeat === "weekly";
  const back = () =>
    router.canGoBack()
      ? router.back()
      : router.replace("/(organizer)/sessions");
  if (query.isPending)
    return (
      <Screen>
        <SkeletonBlock height={320} />
      </Screen>
    );
  if (query.isError && !query.data)
    return (
      <Screen>
        <View style={{ gap: 16 }}>
          <ErrorState
            variant="fullScreen"
            title="Session couldn’t load"
            description={sessionErrorMessage(query.error)}
            onRetry={() => void query.refetch()}
            retrying={query.isFetching}
          />
          <AppButton variant="ghost" onPress={back}>
            Back to sessions
          </AppButton>
        </View>
      </Screen>
    );
  if (!session)
    return (
      <Screen>
        <EmptyState
          variant="fullScreen"
          title="Session unavailable"
          description="This session may have been removed or is no longer accessible."
          action={{ label: "Back to sessions", onPress: back }}
        />
      </Screen>
    );
  const next = query.data?.sessions.find(
    (s) =>
      s.series_id === session.series_id &&
      s.status === "published" &&
      s.starts_at > session.starts_at
  );
  return (
    <>
      <SessionOccurrenceDetail
        sharing={sharing}
        onShare={() =>
          session.visibility === "public"
            ? void share()
            : toast.show({
                title: "This session is private",
                description: "Only public sessions have public links.",
                tone: "info"
              })
        }
        onPublicView={() =>
          router.push({ pathname: "/session", params: { id: session.id } })
        }
        announcements={
          <SessionAnnouncements
            sessionId={session.id}
            recipients={roster.data}
            recipientsLoading={roster.isPending}
          />
        }
        timeZone={series?.timezone}
        registeredCount={roster.data?.length}
        occupancyLoading={roster.isPending}
        occupancyError={roster.isError}
        waitlist={
          <OrganizerWaitlist
            key={session.id}
            sessionId={session.id}
            published={session.status === "published"}
          />
        }
        attendance={(between) => (
          <OrganizerAttendance
            capacity={session.capacity}
            key={session.id}
            sessionId={session.id}
            timeZone={series?.timezone ?? "America/Argentina/Buenos_Aires"}
            published={session.status === "published"}
            between={between}
          />
        )}
        session={session}
        venue={query.data?.venues.find((v) => v.id === session.venue_id)}
        weekly={weekly}
        nextStart={weekly ? next?.starts_at : undefined}
        onBack={back}
        onEdit={() =>
          router.push({ pathname: "/organizer-session/edit", params: { id } })
        }
        onCancel={() =>
          router.push({
            pathname: "/organizer-session/cancel",
            params: { id: session.id }
          })
        }
      />
    </>
  );
}
