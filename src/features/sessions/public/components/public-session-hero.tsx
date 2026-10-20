import { AppBadge, AppButton, AppHeading, AppText } from "@/components/atoms";
import { atomPalette as c } from "@/components/atoms/theme";
import { Image } from "expo-image";
import { ArrowLeft, MapPin, Share2 } from "lucide-react-native";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { PublicSession } from "../domain";

export function PublicSessionHero({
  session,
  status
}: {
  session: PublicSession;
  status: string;
}) {
  return (
    <View style={{ padding: 20, paddingTop: 8, gap: 20 }}>
      <View style={{ borderRadius: 18, overflow: "hidden" }}>
        <Image
          source={require("@assets/images/sessions/court-artwork.jpg")}
          contentFit="cover"
          style={{ width: "100%", height: 182 }}
          accessible
          accessibilityLabel="Illustrative padel court artwork"
        />
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
