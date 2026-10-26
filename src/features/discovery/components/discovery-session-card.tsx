import { useState } from "react";
import { Pressable, View, Linking, StyleSheet } from "react-native";
import { Image } from "expo-image";
import {
  CalendarDays,
  ChevronRight,
  ImageOff,
  MapPin
} from "lucide-react-native";
import {
  AppBadge,
  AppHeading,
  AppText,
  SkeletonBlock
} from "@/components/atoms";
import { atomPalette as c, atomShadows } from "@/components/atoms/theme";
import { useSessionCover } from "@/features/session-covers/hooks/use-cover";
import { categoriesLabel } from "@/features/sessions/public/domain";
import { sessionStatus, type DiscoverySession } from "../domain";
import { discoveryDistanceLabel } from "../distance";
export function DiscoverySessionCard({
  session,
  featured = false,
  mapCard = false,
  onPress,
  preview = false
}: {
  session: DiscoverySession;
  featured?: boolean;
  mapCard?: boolean;
  onPress: () => void;
  preview?: boolean;
}) {
  const cover = useSessionCover(session.id, !preview),
    [failed, setFailed] = useState<string | null>(null);
  const url = cover.data?.url,
    show = url && url !== failed;
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: session.timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).format(new Date(session.starts_at));
  const day = new Intl.DateTimeFormat("en-GB", {
    timeZone: session.timezone,
    weekday: "short",
    day: "numeric",
    month: "short"
  }).format(new Date(session.starts_at));
  const price = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: session.currency,
    maximumFractionDigits: session.price_minor % 100 ? 2 : 0
  }).format(session.price_minor / 100);
  const end = new Intl.DateTimeFormat("en-GB", {
    timeZone: session.timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).format(new Date(session.ends_at));
  const spots = Math.max(0, session.capacity - session.confirmed_count);
  const distance = discoveryDistanceLabel(session.distance_m);
  const venueLabel = (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        columnGap: 6,
        rowGap: 2,
        flexShrink: 1
      }}
    >
      <AppText
        variant={mapCard ? "bodySm" : "caption"}
        tone="muted"
        numberOfLines={1}
        style={{ flexShrink: 1 }}
      >
        {session.venue.name}
      </AppText>
      {distance && (
        <AppText variant="caption" tone="accent">
          {distance}
        </AppText>
      )}
    </View>
  );
  const status =
    session.viewer_is_host ||
    session.viewer_registration ||
    !spots ||
    session.waitlisted_count > 0
      ? sessionStatus(session)
      : `${spots} ${spots === 1 ? "spot" : "spots"} left`;
  return (
    <View
      style={[
        styles.card,
        featured ? { width: 278 } : null,
        mapCard && { boxShadow: atomShadows.floating }
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${session.title}, ${session.venue.name}${distance ? `, ${distance}` : ""}, ${categoriesLabel(session.allowed_categories)}, ${day}, ${time}, ${mapCard ? status : sessionStatus(session)}, ${price}`}
        onPress={onPress}
        style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
      >
        <View style={featured ? undefined : styles.row}>
          <View
            style={[
              styles.photo,
              featured
                ? { height: 152, width: "100%" }
                : mapCard
                  ? { width: 100, minHeight: 124, alignSelf: "stretch" }
                  : { width: 82, height: 88 }
            ]}
          >
            {cover.isFetching ? (
              <SkeletonBlock height={featured ? 152 : 88} />
            ) : preview && mapCard ? (
              <Image
                source={require("../../../../assets/images/sessions/court-artwork.jpg")}
                contentFit="cover"
                style={{ width: "100%", height: "100%", position: "absolute" }}
                accessibilityLabel="Sample padel court photo"
              />
            ) : show ? (
              <Image
                source={{ uri: url }}
                cachePolicy="none"
                contentFit="cover"
                style={{ width: "100%", height: "100%" }}
                onError={() => setFailed(url)}
                accessibilityLabel="Session venue photo"
              />
            ) : (
              <ImageOff size={24} color={c.textMuted} />
            )}
            {mapCard && (
              <View
                style={{
                  position: "absolute",
                  top: 6,
                  left: 6,
                  alignItems: "flex-start"
                }}
              >
                <AppText
                  variant="caption"
                  style={{
                    fontSize: 11,
                    lineHeight: 14,
                    fontWeight: "600",
                    backgroundColor: c.brand,
                    color: c.brandText,
                    paddingHorizontal: 6,
                    paddingVertical: 4,
                    borderRadius: 12,
                    maxWidth: 88
                  }}
                >
                  {status}
                </AppText>
              </View>
            )}
          </View>
          <View
            style={{
              padding: featured ? 16 : 0,
              gap: 7,
              flex: featured ? undefined : 1
            }}
          >
            {mapCard ? (
              <>
                <AppHeading variant="card" numberOfLines={2}>
                  {session.title}
                </AppHeading>
                <View
                  style={{ flexDirection: "row", gap: 6, alignItems: "center" }}
                >
                  <MapPin size={16} color={c.accent} />
                  {venueLabel}
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    gap: 6,
                    alignItems: "flex-start"
                  }}
                >
                  <CalendarDays size={16} color={c.accent} />
                  <AppText variant="caption" tone="muted" style={{ flex: 1 }}>
                    {day} · {time}–{end}
                  </AppText>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    gap: 8,
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    marginTop: 4
                  }}
                >
                  <AppBadge>
                    {categoriesLabel(session.allowed_categories)}
                  </AppBadge>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4
                    }}
                  >
                    <AppText variant="label">{price}</AppText>
                    <ChevronRight size={18} color={c.textMuted} />
                  </View>
                </View>
              </>
            ) : (
              <>
                {venueLabel}
                <AppHeading variant="card" numberOfLines={2}>
                  {session.title}
                </AppHeading>
                <AppText variant="bodySm" tone="muted">
                  {day} · {time}
                </AppText>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    gap: 8,
                    flexWrap: "wrap"
                  }}
                >
                  <AppText variant="caption" tone="accent">
                    {categoriesLabel(session.allowed_categories)}
                  </AppText>
                  <AppText variant="label">{price}</AppText>
                </View>
                <View style={{ alignSelf: "flex-start" }}>
                  <AppBadge
                    tone={session.viewer_registration ? "essential" : "default"}
                  >
                    {sessionStatus(session)}
                  </AppBadge>
                </View>
              </>
            )}
          </View>
        </View>
      </Pressable>
      {show && cover.data?.source === "google" && (
        <View style={{ paddingHorizontal: 12, paddingBottom: 8, gap: 2 }}>
          <AppText
            variant="caption"
            tone="muted"
            accessibilityRole={cover.data.googleMapsUrl ? "link" : "text"}
            onPress={() => {
              if (cover.data?.googleMapsUrl)
                void Linking.openURL(cover.data.googleMapsUrl).catch(() => {});
            }}
          >
            Google Maps
          </AppText>
          {cover.data.authors.map((author, i) => (
            <AppText
              key={i}
              variant="caption"
              tone="muted"
              accessibilityRole={author.url ? "link" : "text"}
              onPress={() => {
                if (author.url)
                  void Linking.openURL(author.url).catch(() => {});
              }}
            >
              Photo: {author.name}
            </AppText>
          ))}
        </View>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  card: {
    backgroundColor: c.surface,
    borderWidth: 1,
    borderColor: c.borderSubtle,
    borderRadius: 20,
    overflow: "hidden"
  },
  row: { flexDirection: "row", padding: 12, gap: 12, alignItems: "center" },
  photo: {
    backgroundColor: c.surfaceLow,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    overflow: "hidden"
  }
});
