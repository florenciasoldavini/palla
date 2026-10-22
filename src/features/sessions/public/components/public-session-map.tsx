import {
  coverageLabel,
  type CourtCoverage
} from "@/features/venues/court-coverage";
import { AppButton, AppText, SkeletonBlock } from "@/components/atoms";
import { atomPalette as c, atomShadows } from "@/components/atoms/theme";
import { MapPreview } from "@/infrastructure/maps/map-preview";
import { Map } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import type { PublicSession } from "../domain";
import { storedVenueCoordinates } from "@/features/venues/coordinates";

export function PublicSessionMap({
  venue,
  court,
  coverage,
  onDirections
}: {
  venue: PublicSession["venue"];
  court: string | null;
  coverage?: CourtCoverage | null;
  onDirections?: () => void;
}) {
  const center = storedVenueCoordinates(venue);
  return (
    <View style={{ gap: 10 }}>
      {center && Math.abs(center.latitude) <= 85 ? (
        <VenueMap
          key={`${center.latitude}:${center.longitude}`}
          center={center}
          onDirections={onDirections}
        />
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
        {coverage
          ? ` · ${coverageLabel(coverage)} court`
          : " · Coverage not specified"}
      </AppText>
    </View>
  );
}

function VenueMap({
  center,
  onDirections
}: {
  center: { latitude: number; longitude: number };
  onDirections?: () => void;
}) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [attempt, setAttempt] = useState(0);
  const error = status === "error";
  const loading = status === "loading";
  const loaded = useCallback(() => setStatus("ready"), []);
  const failed = useCallback(() => setStatus("error"), []);
  useEffect(() => {
    if (status !== "loading") return;
    const timer = setTimeout(failed, 20_000);
    return () => clearTimeout(timer);
  }, [status, failed]);
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
      {!error ? (
        <View style={StyleSheet.absoluteFill}>
          <MapPreview
            key={attempt}
            center={center}
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
            onPress={() => {
              setStatus("loading");
              setAttempt((value) => value + 1);
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
