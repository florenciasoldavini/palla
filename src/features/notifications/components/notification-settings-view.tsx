import { ActivityIndicator, Switch, View } from "react-native";
import {
  ArrowLeft,
  MessageSquare,
  Star,
  Megaphone,
  CalendarX
} from "lucide-react-native";
import {
  AppButton,
  AppCard,
  AppHeading,
  AppText,
  ErrorState,
  Screen,
  SkeletonBlock
} from "@/components/atoms";
import { atomPalette as c } from "@/components/atoms/theme";
import {
  notificationCopy,
  type NotificationKind,
  type NotificationSetting
} from "../inbox-domain";
export function NotificationSettingsView({
  settings,
  loading,
  error,
  saving,
  onBack,
  onRetry,
  onChange
}: {
  settings: NotificationSetting[];
  loading: boolean;
  error: boolean;
  saving?: string;
  onBack: () => void;
  onRetry: () => void;
  onChange: (key: string, enabled: boolean) => void;
}) {
  return (
    <Screen>
      <View style={{ gap: 24 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <AppButton
            variant="ghost"
            layout="icon"
            fullWidth={false}
            icon={ArrowLeft}
            accessibilityLabel="Back to profile"
            onPress={onBack}
          />
          <AppHeading variant="section" style={{ flex: 1 }}>
            Notifications
          </AppHeading>
        </View>
        {loading ? (
          <SkeletonBlock height={220} />
        ) : error ? (
          <ErrorState
            title="Couldn’t load notification settings"
            onRetry={() => {
              onRetry();
            }}
          />
        ) : (
          ["Messages", "Sessions", "Reviews"]
            .filter((group) =>
              settings.some(
                (row) =>
                  notificationCopy[row.key as NotificationKind]?.group === group
              )
            )
            .map((group) => (
              <View key={group} style={{ gap: 12 }}>
                <AppHeading variant="card">{group}</AppHeading>
                {settings
                  .filter(
                    (row) =>
                      notificationCopy[row.key as NotificationKind]?.group ===
                      group
                  )
                  .map((row) => {
                    const copy = notificationCopy[row.key as NotificationKind],
                      Icon =
                        row.key === "chat_messages"
                          ? MessageSquare
                          : row.key === "session_cancellations"
                            ? CalendarX
                            : row.key === "session_announcements"
                              ? Megaphone
                              : Star;
                    const pending = saving === row.key;
                    return (
                      <AppCard key={row.key} surface="panel">
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 12
                          }}
                        >
                          <View
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 12,
                              backgroundColor: c.surfaceRaised,
                              alignItems: "center",
                              justifyContent: "center"
                            }}
                            accessibilityElementsHidden
                            importantForAccessibility="no-hide-descendants"
                          >
                            <Icon size={22} color={c.text} />
                          </View>
                          <View style={{ flex: 1, gap: 4 }}>
                            <AppText variant="label">{copy.title}</AppText>
                            <AppText variant="bodySm" tone="subtle">
                              {copy.description}
                            </AppText>
                          </View>
                          <Switch
                            accessibilityLabel={copy.title}
                            accessibilityHint="Controls push alerts. In-app notifications remain available."
                            disabled={saving !== undefined}
                            value={row.push_enabled}
                            trackColor={{
                              false: c.borderSubtle,
                              true: c.brand
                            }}
                            thumbColor={c.surface}
                            onValueChange={(enabled) =>
                              onChange(row.key, enabled)
                            }
                          />
                        </View>
                        {pending && (
                          <View
                            style={{
                              flexDirection: "row",
                              gap: 8,
                              marginTop: 12
                            }}
                          >
                            <ActivityIndicator
                              size="small"
                              color={c.textSubtle}
                            />
                            <AppText variant="caption" tone="subtle">
                              Saving…
                            </AppText>
                          </View>
                        )}
                      </AppCard>
                    );
                  })}
              </View>
            ))
        )}
        <AppText variant="bodySm" tone="subtle">
          These preferences control push alerts. Your in-app notifications stay
          available.
        </AppText>
      </View>
    </Screen>
  );
}
