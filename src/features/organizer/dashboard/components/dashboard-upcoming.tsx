import { View, useWindowDimensions } from "react-native";
import {
  ArrowRight,
  CalendarClock,
  ChevronRight,
  MessageSquare
} from "lucide-react-native";
import { AppButton, AppCard, AppHeading, AppText } from "@/components/atoms";
import { atomPalette as c } from "@/components/atoms/theme";
import type { DashboardSession, OrganizerDashboard } from "../domain";

export function DashboardAttention({
  data,
  onSession,
  onMessages
}: {
  data: OrganizerDashboard;
  onSession: (id: string) => void;
  onMessages: () => void;
}) {
  const total = data.attention.length + (data.unread_conversations ? 1 : 0);
  return (
    <View style={{ gap: 12 }}>
      <AppHeading variant="section">Needs attention</AppHeading>
      <AppCard surface="panel" padding="md" style={{ gap: 14 }}>
        {!total && (
          <View style={{ gap: 5 }}>
            <AppHeading variant="card">You’re all caught up</AppHeading>
            <AppText variant="bodySm" tone="subtle">
              No low-fill sessions in the next 48 hours or unread player
              conversations.
            </AppText>
          </View>
        )}
        {data.attention.map((session, index) => (
          <View
            key={session.id}
            style={{
              paddingTop: index ? 14 : 0,
              borderTopWidth: index ? 1 : 0,
              borderTopColor: c.borderSubtle
            }}
          >
            <AttentionRow
              icon={CalendarClock}
              title={session.title}
              description={`${session.confirmed_count} of ${session.capacity} places booked · ${formatSessionTime(session, data.bounds.timezone)}`}
              label={`View ${session.title}`}
              onPress={() => onSession(session.id)}
            />
          </View>
        ))}
        {!!data.unread_conversations && (
          <View
            style={{
              paddingTop: data.attention.length ? 14 : 0,
              borderTopWidth: data.attention.length ? 1 : 0,
              borderTopColor: c.borderSubtle
            }}
          >
            <AttentionRow
              icon={MessageSquare}
              title={`${data.unread_conversations} unread ${data.unread_conversations === 1 ? "conversation" : "conversations"}`}
              description="Catch up with your players"
              label="Open player conversations"
              onPress={onMessages}
            />
          </View>
        )}
      </AppCard>
    </View>
  );
}
function AttentionRow({
  icon: Icon,
  title,
  description,
  label,
  onPress
}: {
  icon: typeof CalendarClock;
  title: string;
  description: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View
        style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          backgroundColor: c.surfaceLow,
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <Icon size={20} color={c.text} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <AppText variant="label">{title}</AppText>
        <AppText variant="caption" tone="subtle">
          {description}
        </AppText>
      </View>
      <AppButton
        variant="ghost"
        layout="icon"
        fullWidth={false}
        icon={ChevronRight}
        accessibilityLabel={label}
        onPress={onPress}
      />
    </View>
  );
}
export function DashboardNextSession({
  session,
  timezone,
  onSession,
  onAll
}: {
  session: DashboardSession | null;
  timezone: string;
  onSession: (id: string) => void;
  onAll: () => void;
}) {
  const { fontScale } = useWindowDimensions();
  return (
    <View style={{ gap: 12 }}>
      <View
        style={{
          flexDirection: fontScale > 1.3 ? "column" : "row",
          justifyContent: "space-between",
          alignItems: fontScale > 1.3 ? "flex-start" : "center",
          gap: 5
        }}
      >
        <AppHeading variant="section">Your next session</AppHeading>
        <AppButton
          color="essential"
          variant="ghost"
          fullWidth={false}
          size="sm"
          icon={ArrowRight}
          onPress={onAll}
        >
          View all
        </AppButton>
      </View>
      <AppCard surface="panel" padding="md">
        {session ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View
              style={{
                minWidth: 47,
                padding: 8,
                borderRadius: 12,
                backgroundColor: c.surfaceLow,
                alignItems: "center",
                gap: 2
              }}
            >
              <AppText variant="caption" tone="subtle">
                {new Date(session.starts_at)
                  .toLocaleDateString(undefined, {
                    timeZone: timezone,
                    month: "short"
                  })
                  .toLocaleUpperCase()}
              </AppText>
              <AppHeading variant="section">
                {new Date(session.starts_at).toLocaleDateString(undefined, {
                  timeZone: timezone,
                  day: "numeric"
                })}
              </AppHeading>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <AppHeading variant="card">{session.title}</AppHeading>
              <AppText variant="caption" tone="subtle">
                {formatSessionTime(session, timezone)}
              </AppText>
              <AppText variant="caption" tone="subtle">
                {session.venue_name} · {session.confirmed_count} /{" "}
                {session.capacity} players
              </AppText>
            </View>
            <AppButton
              variant="ghost"
              layout="icon"
              fullWidth={false}
              icon={ChevronRight}
              accessibilityLabel={`Manage ${session.title}`}
              onPress={() => onSession(session.id)}
            />
          </View>
        ) : (
          <View style={{ gap: 5 }}>
            <AppHeading variant="card">No upcoming sessions</AppHeading>
            <AppText variant="bodySm" tone="subtle">
              Create a session when you’re ready to host again.
            </AppText>
          </View>
        )}
      </AppCard>
    </View>
  );
}
function formatSessionTime(session: DashboardSession, timezone: string) {
  const date = new Date(session.starts_at);
  return (
    date.toLocaleDateString(undefined, {
      timeZone: timezone,
      weekday: "short",
      day: "numeric",
      month: "short"
    }) +
    " · " +
    date.toLocaleTimeString(undefined, {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    })
  );
}
