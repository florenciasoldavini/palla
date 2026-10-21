import { AppButton, AppText, SkeletonBlock } from "@/components/atoms";
import { atomPalette as c, atomShadows } from "@/components/atoms/theme";
import { MapPreview } from "@/infrastructure/maps/map-preview";
import { Map } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import type { PublicSession } from "../domain";
import { useVenueMap } from "../hooks/use-venue-map";

export function PublicSessionMap({
  venue,
  court,
  onDirections
}: {
  venue: PublicSession["venue"];
  court: string | null;
  onDirections?: () => void;
}) {
  const address = venue.address?.trim();
  return (
    <View style={{ gap: 10 }}>
      {address && address.length >= 3 ? (
        <VenueMap key={address} address={address} onDirections={onDirections} />
      ) : onDirections ? (
        <AppButton
          variant="bordered"
          size="sm"
          icon={Map}
          fullWidth={false}
          onPress={onDirections}
        >
          Open in Maps
        </AppButton>
      ) : null}
      <AppText variant="bodySm" tone="muted">
        {venue.address ?? venue.name ?? "Venue details pending"}
        {court ? ` · ${court}` : ""}
      </AppText>
    </View>
  );
}

function VenueMap({
  address,
  onDirections
}: {
  address: string;
  onDirections?: () => void;
}) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const location = useVenueMap(address);
  const [attempt, setAttempt] = useState(0);
  const error =
    location.isError || location.data === null || status === "error";
  const loading = location.isPending || status === "loading";
  const loaded = useCallback(() => setStatus("ready"), []);
  const failed = useCallback(() => setStatus("error"), []);
  useEffect(() => {
    if (status !== "loading" || !location.data) return;
    const timer = setTimeout(failed, 20_000);
    return () => clearTimeout(timer);
  }, [status, failed, location.data]);
  return (
    <View
      style={{
        height: error ? undefined : 220,
        minHeight: 220,
        borderRadius: 16,
        overflow: "hidden",
        backgroundColor: c.surfaceLow,
        borderColor: c.borderSubtle,
        borderWidth: 1
      }}
    >
      {!error && location.data ? (
        <View style={StyleSheet.absoluteFill}>
          <MapPreview
            key={attempt}
            center={location.data}
            onLoad={loaded}
            onError={failed}
          />
        </View>
      ) : null}
      {loading && !error ? (
        <View
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel="Loading venue map"
          accessibilityState={{ busy: true }}
        >
          <SkeletonBlock height={220} />
        </View>
      ) : null}
      {error ? (
        <View style={{ padding: 20, gap: 8, alignItems: "center" }}>
          <Map size={24} color={c.textMuted} />
          <AppText variant="bodySm" tone="muted">
            Map couldn’t load
          </AppText>
          <AppButton
            size="sm"
            variant="ghost"
            fullWidth={false}
            loading={location.isFetching}
            onPress={() => {
              setStatus("loading");
              setAttempt((value) => value + 1);
              if (!location.data) void location.refetch();
            }}
          >
            Retry map
          </AppButton>
          {onDirections ? (
            <AppButton
              fullWidth={false}
              variant="bordered"
              size="sm"
              icon={Map}
              iconAfter={false}
              onPress={onDirections}
            >
              Open in Maps
            </AppButton>
          ) : null}
        </View>
      ) : null}
      {onDirections && !error ? (
        <View
          pointerEvents="box-none"
          style={[
            StyleSheet.absoluteFill,
            {
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 16
            }
          ]}
        >
          <View
            style={{
              backgroundColor: c.surface,
              borderRadius: 12,
              boxShadow: atomShadows.raised
            }}
          >
            <AppButton
              fullWidth={false}
              variant="ghost"
              size="sm"
              icon={Map}
              iconAfter={false}
              onPress={onDirections}
            >
              Open in Maps
            </AppButton>
          </View>
        </View>
      ) : null}
    </View>
  );
}
