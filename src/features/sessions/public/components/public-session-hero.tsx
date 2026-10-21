import {
  AppBadge,
  AppButton,
  AppHeading,
  AppText,
  SkeletonBlock
} from "@/components/atoms";
import { atomPalette as c } from "@/components/atoms/theme";
import { Image } from "expo-image";
import { ArrowLeft, MapPin, Share2, ImageOff } from "lucide-react-native";
import { View, Linking } from "react-native";
import { useState } from "react";
import { useSessionCover } from "@/features/session-covers/hooks/use-cover";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { PublicSession } from "../domain";

export function PublicSessionHero({
  session,
  status,
  preview = false,
  previewCoverUri
}: {
  session: PublicSession;
  status: string;
  preview?: boolean;
  previewCoverUri?: string;
}) {
  const cover = useSessionCover(session.id, !preview);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const url = preview ? previewCoverUri : cover.data?.url;
  const showPhoto = url && url !== failedUrl;
  return (
    <View style={{ padding: 20, paddingTop: 8, gap: 20 }}>
      <View style={{ borderRadius: 18, overflow: "hidden" }}>
        {cover.isFetching ? (
          <SkeletonBlock height={182} />
        ) : showPhoto ? (
          <Image
            source={{ uri: url }}
            cachePolicy="none"
            contentFit="cover"
            style={{ width: "100%", height: 182 }}
            onError={() => setFailedUrl(url)}
            accessible
            accessibilityLabel={
              cover.data?.source === "google"
                ? "Venue photo from Google Maps"
                : "Session cover photo"
            }
          />
        ) : (
          <View
            style={{
              height: 182,
              backgroundColor: c.surfaceLow,
              alignItems: "center",
              justifyContent: "center",
              gap: 8
            }}
          >
            <ImageOff size={28} color={c.textMuted} />
            <AppText variant="bodySm" tone="muted">
              Venue photo unavailable
            </AppText>
            {(cover.isError || failedUrl) && (
              <AppButton
                variant="ghost"
                size="sm"
                fullWidth={false}
                onPress={() => {
                  setFailedUrl(null);
                  void cover.refetch();
                }}
              >
                Retry photo
              </AppButton>
            )}
          </View>
        )}
        <View
          style={{
            position: "absolute",
            bottom: 12,
            left: 12,
            right: 12,
            alignItems: "flex-start"
          }}
        >
          <AppBadge
            tone={session.status === "cancelled" ? "danger" : "essential"}
          >
            {status}
          </AppBadge>
        </View>
      </View>
      {showPhoto && cover.data?.source === "google" && (
        <View style={{ gap: 4 }}>
          <AppText
            variant="caption"
            accessibilityRole={cover.data.googleMapsUrl ? "link" : "text"}
            style={{ fontWeight: "400", color: "#5E5E5E" }}
            onPress={
              cover.data.googleMapsUrl
                ? () => {
                    void Linking.openURL(cover.data!.googleMapsUrl!).catch(
                      () => {}
                    );
                  }
                : undefined
            }
          >
            Google Maps
          </AppText>
          {cover.data.authors.map((author, index) => (
            <AppText
              key={index}
              accessibilityRole={author.url ? "link" : "text"}
              variant="caption"
              tone="muted"
              onPress={
                author.url
                  ? () => {
                      void Linking.openURL(author.url!).catch(() => {});
                    }
                  : undefined
              }
            >
              Photo: {author.name}
            </AppText>
          ))}
        </View>
      )}
      <View style={{ gap: 10 }}>
        <AppHeading variant="title">{session.title}</AppHeading>
        <View
          style={{ flexDirection: "row", gap: 7, alignItems: "flex-start" }}
        >
          <MapPin color={c.accent} size={17} style={{ marginTop: 3 }} />
          <AppText variant="bodySm" tone="muted" style={{ flex: 1 }}>
            {session.venue.name ?? "Venue details pending"}
            {session.venue.address ? ` · ${session.venue.address}` : ""}
          </AppText>
        </View>
      </View>
    </View>
  );
}

export function PublicSessionHeader({
  onBack,
  onShare,
  sharing
}: {
  onBack: () => void;
  onShare: () => void;
  sharing: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        backgroundColor: c.background
      }}
      pointerEvents="box-none"
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingHorizontal: 20,
          paddingTop: insets.top + 8,
          paddingBottom: 12
        }}
      >
        <View style={{ backgroundColor: c.surfaceLow, borderRadius: 9999 }}>
          <AppButton
            layout="icon"
            variant="ghost"
            fullWidth={false}
            icon={ArrowLeft}
            accessibilityLabel="Back"
            onPress={onBack}
          />
        </View>
        <AppHeading variant="card" style={{ flex: 1 }}>
          Session details
        </AppHeading>
        <View style={{ backgroundColor: c.surfaceLow, borderRadius: 9999 }}>
          <AppButton
            layout="icon"
            variant="ghost"
            fullWidth={false}
            icon={Share2}
            accessibilityLabel="Share session"
            onPress={onShare}
            loading={sharing}
          />
        </View>
      </View>
    </View>
  );
}
