import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, BackHandler, View } from "react-native";
import { AppButton, AppText } from "@/components/atoms";
import { atomPalette as c } from "@/components/atoms/theme";
import { DiscoveryMap } from "@/infrastructure/maps/discovery-map";
import type { Bounds, DiscoverySession } from "../domain";
import { useDiscoveryVenues } from "../hooks/use-discovery-venues";
import { DiscoveryMapCarousel } from "./discovery-map-carousel";
export function DiscoveryMapPanel({
  sessions,
  onArea,
  onOpen,
  preview = false,
  topInset = 16,
  onCardHeight,
  searching = false,
  error = false,
  onRetry,
  center,
  initialBounds
}: {
  sessions: DiscoverySession[];
  onArea: (bounds: Bounds) => void;
  onOpen: (id: string) => void;
  preview?: boolean;
  topInset?: number;
  onCardHeight: (height: number) => void;
  searching?: boolean;
  error?: boolean;
  onRetry: () => void;
  center?: { latitude: number; longitude: number };
  initialBounds?: Bounds | null;
}) {
  const venues = useDiscoveryVenues(sessions);
  const [loaded, setLoaded] = useState(false),
    [failed, setFailed] = useState(false),
    [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState<string | null>(null),
    [cardHeight, setCardHeight] = useState(0);
  const points = useMemo(
    () =>
      venues.points.map(({ id, name, latitude, longitude, sessions }) => ({
        id,
        name,
        latitude,
        longitude,
        count: sessions.length
      })),
    [venues.points]
  );
  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [retry]);
  useEffect(() => {
    if (loaded) return;
    const timer = setTimeout(() => setFailed(true), 25000);
    return () => clearTimeout(timer);
  }, [loaded, retry]);
  const cards = useMemo(() => {
    const ids = new Set(points.map((p) => p.id));
    return sessions.filter((s) => ids.has(s.venue.id));
  }, [points, sessions]);
  const active = cards.find((s) => s.id === selected);
  useEffect(() => {
    onCardHeight(active && loaded && !failed ? cardHeight : 0);
  }, [active, loaded, failed, cardHeight, onCardHeight]);
  useEffect(() => {
    if (selected && !cards.some((s) => s.id === selected)) setSelected(null);
  }, [cards, selected]);
  useEffect(() => {
    if (!active) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      setSelected(null);
      return true;
    });
    return () => sub.remove();
  }, [active]);
  return (
    <View style={{ flex: 1, backgroundColor: c.surfaceLow }}>
      <DiscoveryMap
        key={retry}
        points={points}
        center={center}
        initialBounds={initialBounds}
        topInset={topInset}
        bottomInset={active ? cardHeight + 24 : 104}
        selectedId={active?.venue.id}
        onLoad={() => {
          setLoaded(true);
          setFailed(false);
        }}
        onError={() => setFailed(true)}
        onMove={onArea}
        onSelect={(id) => {
          const first = cards.find((s) => s.venue.id === id);
          if (first) setSelected(first.id);
        }}
      />
      {(!loaded || searching || error || failed || !points.length) && (
        <View
          pointerEvents="box-none"
          style={{
            position: "absolute",
            top: topInset + 8,
            left: 20,
            right: 20
          }}
        >
          <View
            style={{
              alignSelf: "center",
              backgroundColor: c.surface,
              borderRadius: 16,
              padding: 12,
              gap: 8,
              flexDirection: "row",
              alignItems: "center",
              flexWrap: "wrap"
            }}
          >
            {failed ? (
              <>
                <AppText>Couldn’t load the map.</AppText>
                <AppButton
                  size="sm"
                  fullWidth={false}
                  onPress={() => setRetry((v) => v + 1)}
                >
                  Retry map
                </AppButton>
              </>
            ) : error ? (
              <>
                <AppText>Couldn’t update this area.</AppText>
                <AppButton size="sm" fullWidth={false} onPress={onRetry}>
                  Try again
                </AppButton>
              </>
            ) : !loaded || searching ? (
              <>
                <ActivityIndicator color={c.accent} />
                <AppText variant="bodySm" accessibilityLiveRegion="polite">
                  {loaded ? "Searching this area…" : "Loading map…"}
                </AppText>
              </>
            ) : (
              <AppText variant="bodySm" accessibilityLiveRegion="polite">
                No sessions in this area. Move the map or change filters.
              </AppText>
            )}
          </View>
        </View>
      )}
      {active && loaded && !failed && (
        <DiscoveryMapCarousel
          sessions={cards}
          selected={active.id}
          onSelect={setSelected}
          onOpen={onOpen}
          onHeight={setCardHeight}
          preview={preview}
        />
      )}
    </View>
  );
}
