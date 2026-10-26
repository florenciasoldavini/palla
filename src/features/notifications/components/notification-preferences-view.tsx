import { NotificationIcon } from "./notification-icon";
import { ArrowLeft } from "lucide-react-native";
import { ActivityIndicator, StyleSheet, Switch, View } from "react-native";
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
export function NotificationPreferencesView({
  enabled,
  loading,
  error,
  saving,
  onChange,
  onRetry,
  onBack,
  preview = false
}: {
  enabled: boolean;
  loading: boolean;
  error: boolean;
  saving: boolean;
  onChange: (enabled: boolean) => void;
  onRetry: () => void;
  onBack: () => void;
  preview?: boolean;
}) {
  return (
    <Screen>
      <View style={styles.page}>
        <View style={styles.header}>
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
        {preview && (
          <AppText variant="caption" tone="subtle">
            Design preview · No account changes
          </AppText>
        )}
        {loading ? (
          <SkeletonBlock height={112} />
        ) : error ? (
          <ErrorState
            title="Couldn’t load notification settings"
            onRetry={onRetry}
          />
        ) : (
          <AppCard surface="panel">
            <View style={styles.row}>
              <NotificationIcon type="chat_messages" />
              <View style={styles.copy}>
                <AppText variant="label">Chat messages</AppText>
                <AppText variant="bodySm" tone="subtle">
                  Push notifications for new messages across all chats.
                </AppText>
              </View>
              <Switch
                accessibilityLabel="Chat messages"
                accessibilityHint="Applies to all your chats and devices."
                disabled={saving}
                value={enabled}
                onValueChange={onChange}
                trackColor={{ false: c.borderSubtle, true: c.brand }}
                thumbColor={c.surface}
              />
            </View>
            {saving && (
              <View style={styles.saving} accessibilityLiveRegion="polite">
                <ActivityIndicator color={c.textSubtle} size="small" />
                <AppText variant="caption" tone="subtle">
                  Saving…
                </AppText>
              </View>
            )}
          </AppCard>
        )}
      </View>
    </Screen>
  );
}
const styles = StyleSheet.create({
  page: { gap: 24 },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  copy: { flex: 1, gap: 4 },
  saving: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 }
});
