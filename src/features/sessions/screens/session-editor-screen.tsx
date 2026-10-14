import {
  AppButton,
  AppHeading,
  AppText,
  Screen,
  SelectField,
  SkeletonBlock
} from "@/components/atoms";
import { atomSpacing } from "@/components/atoms/theme";
import { SessionForm } from "@/features/sessions/components/session-form";
import {
  SessionConfirmation,
  CancellationReason
} from "@/features/sessions/components/session-confirmation";
import {
  useOrganizerSessions,
  useSessionMutations
} from "@/features/sessions/hooks/use-organizer-sessions";
import {
  formFromSession,
  sessionErrorMessage
} from "@/features/sessions/services/organizer-sessions.service";
import {
  initialSessionForm,
  type SessionFormValues
} from "@/features/sessions/validation/session-form";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useNavigation, usePreventRemove } from "@react-navigation/native";
import type { NavigationAction } from "@react-navigation/native";
import { View, useWindowDimensions } from "react-native";
import { randomUUID } from "expo-crypto";

export default function SessionEditorScreen() {
  const { id, draft } = useLocalSearchParams<{ id?: string; draft?: string }>();
  const { fontScale } = useWindowDimensions();
  const query = useOrganizerSessions();
  const mutations = useSessionMutations();
  const router = useRouter();
  const navigation = useNavigation();
  const [requestId] = useState(randomUUID);
  const [snapshot, setSnapshot] = useState<{
    identity: string;
    input: SessionFormValues;
    version?: string;
  } | null>(null);
  const [formStep, setFormStep] = useState(0);
  const [scope, setScope] = useState<"one" | "future">("one");
  const [dirty, setDirty] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [pendingAction, setPendingAction] = useState<NavigationAction | null>(
    null
  );
  const [confirmation, setConfirmation] = useState<"cancel" | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const session = query.data?.sessions.find((s) => s.id === id);
  const series = query.data?.series.find(
    (s) => s.id === (session?.series_id ?? draft)
  );
  const busy =
    mutations.save.isPending ||
    mutations.cancel.isPending ||
    mutations.remove.isPending;
  usePreventRemove((dirty || busy) && !leaving, ({ data }) => {
    if (!busy) setPendingAction(data.action);
  });
  useEffect(() => {
    if (leaving) {
      if (pendingAction) navigation.dispatch(pendingAction);
      else router.replace("/(organizer)/sessions");
    }
  }, [leaving, pendingAction, navigation, router]);
  const editable =
    !session ||
    (session.status === "published" &&
      Date.parse(session.starts_at) > Date.now());
  const identity = id ?? draft ?? requestId;
  const currentInput =
    session && series
      ? formFromSession(
          session,
          query.data?.venues.find((v) => v.id === session.venue_id),
          series.draft_input
        )
      : (series?.draft_input ?? initialSessionForm());
  useEffect(() => {
    if (snapshot && snapshot.identity !== identity) {
      setSnapshot(null);
      return;
    }
    if (!query.data || snapshot || (id && !session) || (draft && !series))
      return;
    setSnapshot({
      identity,
      input:
        session && series
          ? formFromSession(
              session,
              query.data.venues.find((v) => v.id === session.venue_id),
              series.draft_input
            )
          : (series?.draft_input ?? initialSessionForm()),
      version: session?.updated_at ?? series?.updated_at
    });
  }, [query.data, snapshot, id, draft, session, series, identity]);
  const affected = session
    ? (query.data?.sessions ?? []).filter(
        (s) =>
          s.series_id === session.series_id &&
          s.status === "published" &&
          Date.parse(s.starts_at) > Date.now() &&
          (s.id === session.id ||
            (scope === "future" &&
              s.occurrence_date! >= session.occurrence_date!))
      )
    : [];
  const dates = affected.map((s) => s.starts_at).sort();
  const displayDate = (value: string) =>
    new Date(value).toLocaleDateString("en-GB", {
      timeZone: "America/Argentina/Buenos_Aires",
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  const impact = dates.length
    ? `${dates.length} upcoming ${dates.length === 1 ? "session" : "sessions"} · ${displayDate(dates[0])}${dates.length > 1 ? `–${displayDate(dates[dates.length - 1])}` : ""}`
    : "No upcoming sessions in this scope";
  async function destructive() {
    setError(null);
    try {
      if (confirmation === "cancel" && session)
        await mutations.cancel.mutateAsync({
          id: session.id,
          scope,
          reason,
          expectedVersion: snapshot!.version!
        });
      setConfirmation(null);
      setLeaving(true);
    } catch (error) {
      setError(sessionErrorMessage(error));
    }
  }
  return (
    <Screen
      keyboardSafe
      scrollable={false}
      contentStyle={{ flex: 1, paddingHorizontal: 0 }}
      contentContainerStyle={{ flex: 1, paddingTop: 0, paddingBottom: 0 }}
    >
      <View style={{ flex: 1, gap: atomSpacing[3] }}>
        {(!snapshot || !editable) && (
          <View
            style={{
              flexDirection: fontScale > 1.2 ? "column" : "row",
              alignItems: fontScale > 1.2 ? "flex-start" : "center",
              gap: atomSpacing[4]
            }}
          >
            <AppButton
              variant="ghost"
              fullWidth={false}
              size="sm"
              isDisabled={busy}
              onPress={() => {
                if (navigation.canGoBack()) router.back();
                else if (dirty)
                  setPendingAction({
                    type: "REPLACE",
                    payload: { name: "(organizer)" }
                  });
                else setLeaving(true);
              }}
            >
              Back
            </AppButton>
            <AppHeading variant="section">
              {session
                ? editable
                  ? "Edit session"
                  : "Session details"
                : "Create session"}
            </AppHeading>
          </View>
        )}
        {query.isPending ? (
          <SkeletonBlock height={300} />
        ) : query.isError && !query.data ? (
          <>
            <AppText tone="danger">{sessionErrorMessage(query.error)}</AppText>
            <AppButton onPress={() => void query.refetch()}>Retry</AppButton>
          </>
        ) : (id && !session) || (draft && !series) ? (
          <AppText>
            This session is unavailable. Go back to your sessions and reload.
          </AppText>
        ) : !editable && session ? (
          <>
            <AppHeading variant="title">{session.title}</AppHeading>
            <AppText>
              {session.status === "cancelled"
                ? "Cancelled"
                : "This session has started."}
            </AppText>
            <AppText>
              {new Date(session.starts_at).toLocaleString("en-GB", {
                timeZone: "America/Argentina/Buenos_Aires"
              })}
            </AppText>
            <AppText>
              {currentInput.venueName} · {currentInput.venueAddress}
            </AppText>
            <AppText>
              {session.cancellation_reason ?? session.description}
            </AppText>
          </>
        ) : (
          <>
            {session && (
              <View pointerEvents={busy ? "none" : "auto"}>
                <SelectField
                  required
                  helperText={impact}
                  label="Apply changes to"
                  value={scope}
                  onChange={(v) => {
                    if (!busy) setScope(v);
                  }}
                  options={[
                    { label: "Only this session", value: "one" },
                    { label: "This and future sessions", value: "future" }
                  ]}
                />
              </View>
            )}
            {!snapshot || snapshot.identity !== identity ? (
              <SkeletonBlock height={300} />
            ) : (
              <SessionForm
                key={session?.id ?? series?.id ?? requestId}
                initialValues={snapshot.input}
                venues={query.data?.venues ?? []}
                editing={Boolean(session)}
                onExit={() => {
                  if (navigation.canGoBack()) router.back();
                  else if (dirty)
                    setPendingAction({
                      type: "REPLACE",
                      payload: { name: "(organizer)" }
                    });
                  else setLeaving(true);
                }}
                reviewSummary={
                  session ? `Changes apply to ${impact}.` : undefined
                }
                onDirtyChange={setDirty}
                onStepChange={setFormStep}
                onSave={async (input, publish) => {
                  await mutations.save.mutateAsync({
                    id: series?.id ?? requestId,
                    input,
                    publish,
                    sessionId: session?.id,
                    scope,
                    expectedVersion: snapshot.version
                  });
                  setDirty(false);
                  setLeaving(true);
                }}
              />
            )}
            {formStep === 5 && session && (
              <AppButton
                color="danger"
                variant="ghost"
                isDisabled={busy}
                onPress={() => {
                  setError(null);
                  setConfirmation("cancel");
                }}
              >
                Cancel session
              </AppButton>
            )}
          </>
        )}
        <SessionConfirmation
          visible={pendingAction !== null && !leaving}
          title="Discard your changes?"
          description="Your unsaved changes will be lost."
          confirmLabel="Discard changes"
          keepLabel="Keep editing"
          onConfirm={() => setLeaving(true)}
          onClose={() => setPendingAction(null)}
        />
        <SessionConfirmation
          visible={confirmation !== null}
          title="Cancel this session?"
          description={`${impact} will be cancelled. Cancelled sessions stay in your history. Court arrangements and payments remain your responsibility.`}
          confirmLabel={
            scope === "future" ? "Cancel future sessions" : "Cancel session"
          }
          keepLabel="Keep session"
          busy={busy}
          error={error}
          onConfirm={() => void destructive()}
          onClose={() => setConfirmation(null)}
        >
          {confirmation === "cancel" && (
            <>
              <View pointerEvents={busy ? "none" : "auto"}>
                <SelectField
                  required
                  helperText={impact}
                  label="Cancel"
                  value={scope}
                  onChange={(v) => {
                    if (!busy) setScope(v);
                  }}
                  options={[
                    { label: "Only this session", value: "one" },
                    { label: "This and future sessions", value: "future" }
                  ]}
                />
              </View>
              <CancellationReason value={reason} onChange={setReason} />
            </>
          )}
        </SessionConfirmation>
      </View>
    </Screen>
  );
}
