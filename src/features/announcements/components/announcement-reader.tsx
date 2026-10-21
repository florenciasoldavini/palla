import { View } from "react-native";
import { Image } from "expo-image";
import { MessageSquare } from "lucide-react-native";
import {
  AppButton,
  AppText,
  ErrorState,
  SkeletonBlock
} from "@/components/atoms";
import { AppBottomSheet } from "@/components/atoms/bottom-sheet";
import { atomPalette as c } from "@/components/atoms/theme";
import type { Announcement, AnnouncementContext } from "../domain";
import { AnnouncementSummary } from "./announcement-summary";
export function AnnouncementReaderView({
  context,
  announcement,
  loading,
  error,
  messaging,
  onRetry,
  onMessage,
  onClose
}: {
  context?: AnnouncementContext;
  announcement?: Announcement;
  loading: boolean;
  error: boolean;
  messaging?: boolean;
  onRetry: () => void;
  onMessage?: () => void;
  onClose: () => void;
}) {
  return (
    <AppBottomSheet
      title="Session announcement"
      closeLabel="Close announcement"
      busy={!!messaging}
      onClose={onClose}
    >
      {loading ? (
        <SkeletonBlock height={240} />
      ) : error || !context || !announcement ? (
        <ErrorState title="Couldn’t load announcement" onRetry={onRetry} />
      ) : (
        <View style={{ gap: 24 }}>
          <AnnouncementSummary context={context} />
          <View style={{ height: 1, backgroundColor: c.borderSubtle }} />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: c.surfaceRaised,
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden"
              }}
            >
              {context.host_avatar_url ? (
                <Image
                  source={context.host_avatar_url}
                  style={{ width: 44, height: 44 }}
                />
              ) : (
                <AppText variant="label" maxFontSizeMultiplier={1.2}>
                  {context.host_name
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((p) => p[0])
                    .join("")}
                </AppText>
              )}
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <AppText variant="label">{context.host_name}</AppText>
              <AppText variant="caption" tone="subtle">
                Host ·{" "}
                {new Date(announcement.created_at).toLocaleString(undefined, {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit"
                })}
              </AppText>
            </View>
          </View>
          <AppText tone={announcement.removed_at ? "subtle" : "default"}>
            {announcement.removed_at
              ? "This announcement was removed."
              : announcement.body}
          </AppText>
          {onMessage && (
            <AppButton
              variant="solid"
              color="neutral"
              icon={MessageSquare}
              iconAfter={false}
              loading={messaging}
              isDisabled={messaging}
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
