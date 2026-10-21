import { View } from "react-native";
import { CalendarX, MessageSquare } from "lucide-react-native";
import {
  AppAvatar,
  AppButton,
  AppText,
  ErrorState,
  SkeletonBlock
} from "@/components/atoms";
import { AppBottomSheet } from "@/components/atoms/bottom-sheet";
import { atomPalette as c } from "@/components/atoms/theme";
import { SessionSummary } from "@/components/session-summary";
import { cancellationReasons, type CancellationContext } from "../domain";
export function CancellationReader({
  context,
  loading,
  error,
  messaging,
  onRetry,
  onMessage,
  onClose
}: {
  context?: CancellationContext;
  loading: boolean;
  error: boolean;
  messaging?: boolean;
  onRetry: () => void;
  onMessage?: () => void;
  onClose: () => void;
}) {
  return (
    <AppBottomSheet
      title="Session cancelled"
      closeLabel="Close cancellation"
      onClose={onClose}
      busy={!!messaging}
    >
      {loading ? (
        <View style={{ gap: 16 }}>
          <SkeletonBlock height={64} />
          <SkeletonBlock height={140} />
        </View>
      ) : error || !context ? (
        <ErrorState title="Couldn’t load cancellation" onRetry={onRetry} />
      ) : (
        <View style={{ gap: 22 }}>
          <SessionSummary context={context} />
          <View style={{ height: 1, backgroundColor: c.borderSubtle }} />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <AppAvatar
              name={context.host_name}
              imageUrl={context.host_avatar_url}
              size={44}
            />
            <View style={{ flex: 1, gap: 3 }}>
              <AppText variant="label">{context.host_name}</AppText>
              <AppText variant="caption" tone="subtle">
                Cancelled{" "}
                {context.cancelled_at &&
                  new Date(context.cancelled_at).toLocaleString(undefined, {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
              </AppText>
            </View>
          </View>
          <View style={{ gap: 8 }}>
            <AppText variant="caption" tone="subtle">
              Reason
            </AppText>
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
            >
              <CalendarX size={20} color={c.textSubtle} />
              <AppText variant="label" style={{ flex: 1 }}>
                {context.reason_code
                  ? cancellationReasons[context.reason_code]
                  : "Session cancelled"}
              </AppText>
            </View>
          </View>
          {!!context.message && <AppText>{context.message}</AppText>}
          <AppText variant="bodySm" tone="subtle">
            {context.recipient_status === "waitlisted"
              ? "Your waitlist entry has been cancelled."
              : "Your registration has been cancelled."}
          </AppText>
          {onMessage && (
            <AppButton
              color="neutral"
              icon={MessageSquare}
              iconAfter={false}
              loading={messaging}
              onPress={onMessage}
            >
              Message host
            </AppButton>
          )}
        </View>
      )}
    </AppBottomSheet>
  );
}
