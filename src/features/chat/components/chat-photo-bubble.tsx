import { StatusBar } from "expo-status-bar";
import { Image } from "expo-image";
import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions
} from "react-native";
import { X, Download } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppButton, AppText, ErrorState } from "@/components/atoms";
import { atomPalette as c, atomSpacing as sp } from "@/components/atoms/theme";
import type { ChatAttachment, LocalPhoto } from "../attachment-domain";
import { useChatPhoto } from "../hooks/use-chat-photo";
export function ChatPhotoBubble({
  attachment,
  local,
  actorId,
  caption,
  name,
  createdAt,
  onLongPress,
  interactive = true
}: {
  attachment?: ChatAttachment;
  local?: LocalPhoto;
  actorId: string;
  caption: string;
  name: string;
  createdAt: string;
  onLongPress?: () => void;
  interactive?: boolean;
}) {
  const query = useChatPhoto(attachment?.id, actorId, local),
    [open, setOpen] = useState(false),
    [imageLoading, setImageLoading] = useState(true),
    [imageAttempt, setImageAttempt] = useState(0),
    [imageError, setImageError] = useState(false);
  const { width, fontScale } = useWindowDimensions(),
    insets = useSafeAreaInsets();
  const source = local?.uri ?? query.data;
  const imageWidth = local?.width ?? attachment?.width ?? 1,
    imageHeight = local?.height ?? attachment?.height ?? 1;
  const retry = () => {
    setImageError(false);
    setImageLoading(true);
    setImageAttempt((attempt) => attempt + 1);
    if (attachment) void query.refetch();
  };
  const failed = imageError || (!source && query.isError);
  const feedback = (fullScreen = false) =>
    !source || imageLoading || imageError ? (
      <View style={styles.feedback}>
        {failed ? (
          <ErrorState
            contained
            variant={fullScreen ? "fullScreen" : "compact"}
            style={fullScreen ? styles.viewerError : undefined}
            title="Photo couldn’t load"
            description={fullScreen ? "Try loading it again." : null}
            retryLabel={fullScreen ? "Retry photo" : "Retry"}
            action={
              !fullScreen
                ? {
                    label: "Retry",
                    accessibilityLabel: "Retry photo",
                    onPress: retry
                  }
                : undefined
            }
            onRetry={retry}
          />
        ) : (
          <ActivityIndicator
            color={c.accent}
            accessibilityLabel="Loading photo"
          />
        )}
      </View>
    ) : null;
  return (
    <>
      <Pressable
        accessible={!failed}
        accessibilityRole="button"
        disabled={!interactive}
        accessibilityLabel="View photo"
        accessibilityHint="Tap to view, or long press for message actions"
        onPress={() => {
          if (attachment && query.isStale) void query.refetch();
          setOpen(true);
        }}
        onLongPress={onLongPress}
        style={{
          width: Math.min(width * 0.63, 300),
          aspectRatio:
            failed && fontScale > 1.2
              ? undefined
              : Math.max(0.65, Math.min(1.6, imageWidth / imageHeight)),
          borderRadius: 12,
          overflow: "hidden",
          backgroundColor: c.surfaceRaised
        }}
      >
        {source && (
          <Image
            key={imageAttempt}
            source={{ uri: source }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="memory"
            onLoadStart={() => setImageLoading(true)}
            onLoadEnd={() => setImageLoading(false)}
            onError={() => {
              setImageError(true);
            }}
          />
        )}
        {feedback()}
      </Pressable>
      {open && (
        <Modal
          visible
          animationType="fade"
          statusBarTranslucent
          navigationBarTranslucent
          onRequestClose={() => setOpen(false)}
        >
          <StatusBar style="dark" />
          <View style={{ flex: 1, backgroundColor: c.background }}>
            {source && !imageError && (
              <Image
                key={imageAttempt}
                source={{ uri: source }}
                contentFit="contain"
                style={StyleSheet.absoluteFill}
                cachePolicy="memory"
                onLoadStart={() => setImageLoading(true)}
                onLoadEnd={() => setImageLoading(false)}
                onError={() => setImageError(true)}
              />
            )}
            {feedback(true)}
            <View style={[styles.toolbar, { top: insets.top + sp[3] }]}>
              <AppButton
                variant="bordered"
                layout="icon"
                icon={X}
                style={styles.control}
                fullWidth={false}
                accessibilityLabel="Close photo"
                onPress={() => setOpen(false)}
              />
              <View style={styles.identity}>
                <AppText variant="label" numberOfLines={1}>
                  {name}
                </AppText>
                <AppText variant="caption" tone="subtle">
                  {new Date(createdAt).toLocaleString("en-GB", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </AppText>
              </View>
              {attachment || local ? (
                <AppButton
                  variant="bordered"
                  layout="icon"
                  icon={Download}
                  style={styles.control}
                  fullWidth={false}
                  accessibilityLabel="Save photo"
                  loading={query.saving}
                  onPress={() => void query.save()}
                />
              ) : (
                <View style={{ width: 48 }} />
              )}
            </View>
            {(caption || query.notice || query.saveError) && (
              <View
                style={[
                  styles.caption,
                  { paddingBottom: Math.max(insets.bottom, sp[4]) }
                ]}
              >
                {!!caption && <AppText>{caption}</AppText>}
                {query.notice && (
                  <AppText variant="caption" accessibilityLiveRegion="polite">
                    {query.notice}
                  </AppText>
                )}
                {query.saveError && (
                  <AppText
                    variant="caption"
                    tone="danger"
                    accessibilityLiveRegion="polite"
                  >
                    {query.saveError}
                  </AppText>
                )}
              </View>
            )}
          </View>
        </Modal>
      )}
    </>
  );
}
const styles = StyleSheet.create({
  viewerError: { flexGrow: 0 },
  feedback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: sp[2],
    padding: sp[3]
  },
  toolbar: {
    position: "absolute",
    left: sp[4],
    right: sp[4],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: sp[3]
  },
  control: { backgroundColor: c.surface },
  identity: {
    flexShrink: 1,
    backgroundColor: c.surface,
    borderRadius: 24,
    paddingHorizontal: sp[4],
    paddingVertical: sp[2],
    gap: sp[1]
  },
  caption: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: sp[4],
    gap: sp[2],
    backgroundColor: c.surface
  }
});
