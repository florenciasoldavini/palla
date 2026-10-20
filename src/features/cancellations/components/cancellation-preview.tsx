import { useState } from "react";
import { Alert, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Megaphone } from "lucide-react-native";
import {
  AppButton,
  AppHeading,
  AppText,
  useAppToast
} from "@/components/atoms";
import { SessionOccurrenceDetail } from "@/features/sessions/components/session-occurrence-detail";
import { sample } from "@/features/sessions/occurrence-preview-fixture";
import { NotificationInboxView } from "@/features/notifications/components/notification-inbox-view";
import { NotificationSettingsView } from "@/features/notifications/components/notification-settings-view";
import type {
  InboxItem,
  NotificationSetting
} from "@/features/notifications/inbox-domain";
import { CancellationScreenView } from "./cancellation-screen-view";
import { CancellationReader } from "./cancellation-reader";
import { cancellationPreviewContext } from "../preview-fixture";
export function CancellationPreview() {
  const {
    mode = "organizer",
    state = "",
    screen
  } = useLocalSearchParams<{
    mode?: string;
    state?: string;
    screen?: string;
  }>();
  const router = useRouter(),
    toast = useAppToast();
  const [base] = useState(cancellationPreviewContext);
  const [form, setForm] = useState(screen === "form"),
    [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false),
    [sent, setSent] = useState(false),
    [reading, setReading] = useState(screen === "reader"),
    [read, setRead] = useState(false),
    [unread, setUnread] = useState(false),
    [retried, setRetried] = useState(false);
  const [context, setContext] = useState(base);
  const current = {
    ...context,
    can_cancel: state !== "unavailable",
    ...(state === "empty"
      ? { confirmed_count: 0, waitlisted_count: 0, recipients: [] }
      : {})
  };
  const back = () => {
    if (dirty)
      Alert.alert(
        "Discard cancellation?",
        "Your cancellation has not been sent. Your selections and message will be lost.",
        [
          { text: "Keep editing", style: "cancel" },
          {
            text: "Discard",
            style: "destructive",
            onPress: () => {
              setForm(false);
              setDirty(false);
            }
          }
        ]
      );
    else setForm(false);
  };
  const cancelled = {
    ...current,
    can_cancel: false,
    cancellation_id: "ca000000-0000-4000-8000-000000000099",
    cancelled_at: new Date().toISOString(),
    reason_code: context.reason_code ?? ("weather" as const),
    message:
      state === "long"
        ? "The outdoor courts are closed for maintenance. ".repeat(20)
        : (context.message ??
          "Heavy rain has flooded the outdoor courts, so the club has closed them for safety."),
    recipient_status:
      state === "waitlisted" ? ("waitlisted" as const) : ("confirmed" as const)
  };
  const item: InboxItem = {
    id: "ca000000-0000-4000-8000-000000000100",
    notification_type: "session_cancellations",
    registration_id: "ca000000-0000-4000-8000-000000000101",
    review_id: null,
    cancellation_id: cancelled.cancellation_id,
    cancellation_reason_code: cancelled.reason_code,
    recipient_status: cancelled.recipient_status,
    created_at: new Date().toISOString(),
    read_at: read ? new Date().toISOString() : null,
    session_starts_at: current.starts_at,
    session_ends_at: current.ends_at,
    session_timezone: current.timezone,
    session_id: current.session_id,
    session_title: current.session_title,
    deadline: new Date(
      Date.parse(current.ends_at) + 14 * 86400000
    ).toISOString(),
    host_name: current.host_name,
    reviewer_name: "",
    review_status: null,
    can_review: false
  };
  const [settings, setSettings] = useState<NotificationSetting[]>([
    { key: "chat_messages", audience: "shared", push_enabled: true },
    { key: "review_reminders", audience: "player", push_enabled: true },
    { key: "session_announcements", audience: "player", push_enabled: true },
    { key: "session_cancellations", audience: "player", push_enabled: true }
  ]);
  if (state === "settings")
    return (
      <NotificationSettingsView
        settings={settings}
        loading={false}
        error={false}
        onBack={() => router.back()}
        onRetry={() => undefined}
        onChange={(key, push_enabled) =>
          setSettings((rows) =>
            rows.map((row) =>
              row.key === key ? { ...row, push_enabled } : row
            )
          )
        }
      />
    );
  if (mode === "organizer" && form)
    return (
      <CancellationScreenView
        context={current}
        preview
        loading={state === "loading"}
        error={state === "error" && !retried}
        busy={busy}
        onDirty={setDirty}
        onBack={back}
        onRetry={() => setRetried(true)}
        onCancel={async (input) => {
          setBusy(true);
          await new Promise((resolve) => setTimeout(resolve, 700));
          setBusy(false);
          if (state === "save-error") {
            toast.show({
              title: "Couldn’t cancel session",
              description:
                "Check your connection and try again. Your message has been kept.",
              tone: "error"
            });
            return;
          }
          setContext((old) => ({
            ...old,
            reason_code: input.reason_code,
            message: input.message
          }));
          setSent(true);
          setDirty(false);
          setForm(false);
          toast.show({ title: "Session cancelled", tone: "success" });
        }}
      />
    );
  if (mode === "organizer")
    return (
      <SessionOccurrenceDetail
        preview
        attendance={() => null}
        waitlist={null}
        session={{
          ...sample,
          id: current.session_id,
          title: current.session_title,
          capacity: 8,
          organizer_id: current.organizer_id,
          starts_at: current.starts_at,
          ends_at: current.ends_at,
          registration_closes_at: current.starts_at,
          cancellation_deadline_at: null,
          occurrence_date: current.starts_at.slice(0, 10),
          status: sent ? "cancelled" : "published",
          cancelled_at: sent ? new Date().toISOString() : null,
          cancellation_reason_code: sent ? context.reason_code : null,
          cancellation_reason: sent ? context.message : null
        }}
        venue={{
          id: sample.venue_id,
          name: current.venue_name,
          address: "Buenos Aires",
          google_place_id: null,
          created_by: current.organizer_id,
          is_active: true,
          created_at: current.updated_at,
          updated_at: current.updated_at,
          arrival_instructions: null
        }}
        registeredCount={8}
        occupancyLoading={false}
        occupancyError={false}
        weekly
        nextStart={new Date(
          Date.parse(current.starts_at) + 7 * 86400000
        ).toISOString()}
        onBack={() => router.back()}
        onEdit={() =>
          toast.show({
            title: "Editing opens here",
            description:
              "Cancellation is available from occurrence detail only.",
            tone: "info"
          })
        }
        onCancel={() => setForm(true)}
        announcements={
          <View style={{ gap: 12 }}>
            <AppHeading variant="section">Announcements</AppHeading>
            {!sent && (
              <AppButton
                icon={Megaphone}
                iconAfter={false}
                onPress={() =>
                  router.push({
                    pathname: "/sessions-preview/announcements",
                    params: { mode: "organizer" }
                  })
                }
              >
                Message players
              </AppButton>
            )}
            <AppText variant="bodySm" tone="subtle">
              Session updates you send to confirmed players will appear here.
            </AppText>
          </View>
        }
      />
    );
  return (
    <>
      <NotificationInboxView
        mode="player"
        preview
        items={unread && read ? [] : [item]}
        loading={false}
        error={false}
        unread={unread}
        onFilter={setUnread}
        onBack={() => router.back()}
        onOpen={() => {
          setRead(true);
          setReading(true);
        }}
        onRefresh={() => undefined}
        refreshing={false}
        onMore={() => undefined}
        more={false}
      />
      {reading && (
        <CancellationReader
          context={cancelled}
          loading={state === "reader-loading"}
          error={state === "reader-error" && !retried}
          onRetry={() => setRetried(true)}
          onClose={() => setReading(false)}
          onMessage={() =>
            toast.show({
              title: "Chat opens here in the live app",
              tone: "info"
            })
          }
        />
      )}
    </>
  );
}
