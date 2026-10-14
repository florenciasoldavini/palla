import { OrganizerAttendance } from "@/features/registrations/components/organizer-attendance";
import {
  AppButton,
  AppText,
  Screen,
  SelectField,
  SkeletonBlock
} from "@/components/atoms";
import { SessionOccurrenceDetail } from "../components/session-occurrence-detail";
import {
  CancellationReason,
  SessionConfirmation
} from "../components/session-confirmation";
import {
  useOrganizerSessions,
  useSessionMutations
} from "../hooks/use-organizer-sessions";
import { sessionErrorMessage } from "../services/organizer-sessions.service";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

export default function SessionOccurrenceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const query = useOrganizerSessions();
  const { cancel } = useSessionMutations();
  const [confirming, setConfirming] = useState(false);
  const [scope, setScope] = useState<"one" | "future">("one");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const session = query.data?.sessions.find((s) => s.id === id);
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
          <AppText tone="danger">{sessionErrorMessage(query.error)}</AppText>
          <AppButton
            loading={query.isFetching}
            onPress={() => void query.refetch()}
          >
            Retry
          </AppButton>
          <AppButton variant="ghost" onPress={back}>
            Back to sessions
          </AppButton>
        </View>
      </Screen>
    );
  if (!session)
    return (
      <Screen>
        <AppText>This session is unavailable.</AppText>
        <AppButton variant="ghost" onPress={back}>
          Back to sessions
        </AppButton>
      </Screen>
    );
  const next = query.data?.sessions.find(
    (s) =>
      s.series_id === session.series_id &&
      s.status === "published" &&
      s.starts_at > session.starts_at
  );
  const affected =
    query.data?.sessions.filter(
      (s) =>
        s.status === "published" &&
        Date.parse(s.starts_at) > Date.now() &&
        (s.id === session.id ||
          (scope === "future" &&
            s.series_id === session.series_id &&
            s.occurrence_date! >= session.occurrence_date!))
    ) ?? [];
  return (
    <>
      <SessionOccurrenceDetail
        attendance={(between) => (
          <OrganizerAttendance
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
        onCancel={() => {
          setError(null);
          setConfirming(true);
        }}
      />
      <SessionConfirmation
        visible={confirming}
        title="Cancel session?"
        description={`${affected.length} upcoming ${affected.length === 1 ? "session" : "sessions"} will be cancelled. Cancelled dates remain in your history. Payments and court arrangements remain your responsibility.`}
        confirmLabel={
          scope === "one" ? "Confirm cancellation" : "Cancel future sessions"
        }
        keepLabel="Keep session"
        busy={cancel.isPending}
        error={error}
        onClose={() => setConfirming(false)}
        onConfirm={() => {
          if (!affected.length) {
            setError(
              "This session has already started or changed. Reload your sessions."
            );
            return;
          }
          void cancel
            .mutateAsync({
              id,
              scope,
              reason,
              expectedVersion: session.updated_at
            })
            .then(() => {
              setConfirming(false);
            })
            .catch((e) => setError(sessionErrorMessage(e)));
        }}
      >
        {weekly && (
          <SelectField
            label="Cancel"
            value={scope}
            onChange={setScope}
            options={[
              { label: "Only this date", value: "one" },
              { label: "This and future dates", value: "future" }
            ]}
          />
        )}
        <CancellationReason value={reason} onChange={setReason} />
      </SessionConfirmation>
    </>
  );
}
