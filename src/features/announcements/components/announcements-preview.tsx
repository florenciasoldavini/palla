import { useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { View } from "react-native";
import { Megaphone } from "lucide-react-native";
import {
  AppButton,
  AppCard,
  AppHeading,
  AppText,
  Screen,
  useAppToast
} from "@/components/atoms";
import { NotificationInboxView } from "@/features/notifications/components/notification-inbox-view";
import { NotificationSettingsView } from "@/features/notifications/components/notification-settings-view";
import type {
  InboxItem,
  NotificationSetting
} from "@/features/notifications/inbox-domain";
import type { AnnouncementContext } from "../domain";
import { AnnouncementComposer } from "./announcement-composer";
import { AnnouncementReaderView } from "./announcement-reader";
const id = (n: number) =>
  `aa000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
export default function AnnouncementsPreview() {
  const params = useLocalSearchParams<{
    mode?: string;
    state?: string;
    run?: string;
  }>();
  return (
    <Fixture
      key={`${params.mode}:${params.state}:${params.run}`}
      mode={params.mode === "organizer" ? "organizer" : "player"}
      state={params.state}
    />
  );
}
function Fixture({
  mode,
  state
}: {
  mode: "organizer" | "player";
  state?: string;
}) {
  const [now] = useState(Date.now),
    [composing, setComposing] = useState(false),
    [reading, setReading] = useState(false),
    [busy, setBusy] = useState(false),
    [unread, setUnread] = useState(false),
    [read, setRead] = useState(false),
    [retried, setRetried] = useState(false),
    [sent, setSent] = useState(false);
  const router = useRouter(),
    toast = useAppToast();
  const [settings, setSettings] = useState<NotificationSetting[]>([
    { key: "chat_messages", audience: "shared", push_enabled: true },
    ...(mode === "player"
      ? [
          {
            key: "session_announcements",
            audience: "player" as const,
            push_enabled: true
          },
          {
            key: "review_reminders",
            audience: "player" as const,
            push_enabled: true
          }
        ]
      : [
          {
            key: "new_reviews",
            audience: "organizer" as const,
            push_enabled: true
          }
        ])
  ]);
  const context: AnnouncementContext = {
    session_id: id(1),
    session_title: "Social Padel",
    organizer_id: id(2),
    host_name: "Alex Rivera",
    host_avatar_url: null,
    starts_at: new Date(now + 86400000).toISOString(),
    ends_at: new Date(now + 91800000).toISOString(),
    timezone: "America/Argentina/Buenos_Aires",
    can_send: state !== "ended",
    recipient_count: state === "no-players" ? 0 : 8,
    announcements: [
      {
        id: id(3),
        body:
          state === "long"
            ? "Please arrive ten minutes early. ".repeat(30)
            : "We’re playing on court 3 today. Please arrive 10 minutes early so we can start on time.",
        created_at: new Date(now).toISOString(),
        removed_at: state === "removed" ? new Date(now).toISOString() : null,
        recipient_count: 8
      }
    ]
  };
  const item: InboxItem = {
    id: id(4),
    notification_type: "session_announcements",
    announcement_id: id(3),
    announcement_preview:
      state === "removed"
        ? "This announcement was removed."
        : context.announcements[0].body,
    registration_id: id(5),
    review_id: null,
    created_at: new Date(now).toISOString(),
    read_at: read ? new Date(now).toISOString() : null,
    session_id: id(1),
    session_title: context.session_title,
    deadline: new Date(now + 14 * 86400000).toISOString(),
    host_name: "Alex Rivera",
    reviewer_name: "",
    review_status: null,
    can_review: false
  };
  const back = () =>
    router.canGoBack()
      ? router.back()
      : router.replace("/sessions-preview/announcements");
  if (state === "settings")
    return (
      <NotificationSettingsView
        settings={settings}
        loading={false}
        error={false}
        onBack={back}
        onRetry={() => undefined}
        onChange={(key, enabled) =>
          setSettings((old) =>
            old.map((row) =>
              row.key === key ? { ...row, push_enabled: enabled } : row
            )
          )
        }
      />
    );
  return (
    <>
      {mode === "organizer" ? (
        <Screen>
          <View style={{ gap: 20 }}>
            <AppHeading>Social Padel</AppHeading>
            <AppText variant="caption" tone="subtle">
              Design preview · No account changes
            </AppText>
            <AppCard>
              <AppText>Tomorrow’s session</AppText>
              <AppText>Riverside Padel Club</AppText>
            </AppCard>
            <AppHeading variant="section">Announcements</AppHeading>
            <AppButton icon={Megaphone} onPress={() => setComposing(true)}>
              Message players
            </AppButton>
            {sent && <AppText>Sent to 8 players</AppText>}
            <AppButton variant="ghost" onPress={() => setReading(true)}>
              View announcement
            </AppButton>
          </View>
        </Screen>
      ) : (
        <NotificationInboxView
          mode="player"
          preview
          items={unread && read ? [] : [item]}
          loading={state === "loading"}
          error={state === "error" && !retried}
          unread={unread}
          onFilter={setUnread}
          onBack={back}
          onOpen={() => {
            setReading(true);
            setRead(true);
          }}
          onRefresh={() => setRetried(true)}
          refreshing={false}
          onMore={() => undefined}
          more={false}
        />
      )}
      {composing && (
        <AnnouncementComposer
          context={context}
          recipients={[
            "Marcos Silva",
            "Elena Vega",
            "Diego Keller",
            "Lucia Ramos",
            "Sofia Torres"
          ].map((name, index) => ({
            id: id(index + 60),
            name,
            tone: index > 2 ? ("info" as const) : ("neutral" as const)
          }))}
          recipientsLoading={state === "recipients-loading"}
          busy={busy}
          onClose={() => setComposing(false)}
          onSend={async () => {
            setBusy(true);
            await new Promise((resolve) => setTimeout(resolve, 700));
            setBusy(false);
            if (state === "save-error") {
              toast.show({
                title: "Couldn’t send announcement",
                description: "Check your connection and try again.",
                tone: "error"
              });
            } else {
              setComposing(false);
              setSent(true);
              toast.show({ title: "Sent to 8 players", tone: "success" });
            }
          }}
        />
      )}
      {reading && (
        <AnnouncementReaderView
          context={context}
          announcement={context.announcements[0]}
          loading={state === "reader-loading"}
          error={state === "reader-error" && !retried}
          onRetry={() => setRetried(true)}
          onClose={() => setReading(false)}
          onMessage={
            mode === "player"
              ? () => {
                  setReading(false);
                  toast.show({
                    title: "Chat opens here in the live app",
                    tone: "info"
                  });
                }
              : undefined
          }
        />
      )}
    </>
  );
}
