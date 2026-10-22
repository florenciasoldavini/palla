import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, BackHandler, ScrollView, View } from "react-native";
import { AppButton, AppText, EmptyState } from "@/components/atoms";
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
  onCardHeight
}: {
  topInset?: number;
  onCardHeight: (height: number) => void;
  sessions: DiscoverySession[];
  onArea: (b: Bounds | null, ids: string[]) => void;
  onOpen: (id: string) => void;
  preview?: boolean;
}) {
  const venues = useDiscoveryVenues(sessions);
  const [loaded, setLoaded] = useState(false),
    [failed, setFailed] = useState(false),
    [retry, setRetry] = useState(0);
  const [pending, setPending] = useState<Bounds | null>(null),
    [selected, setSelected] = useState<string | null>(null);
  const points = useMemo(
    () =>
      venues.points.map((p) => ({
        id: p.id,
        name: p.name,
        latitude: p.latitude,
        longitude: p.longitude,
        count: p.sessions.length
      })),
    [venues.points]
  );
  const pointKey = JSON.stringify(points) + ":" + topInset;
  useEffect(() => {
    setLoaded(false);
    setFailed(false);
    setPending(null);
  }, [pointKey, retry]);
  useEffect(() => {
    if (loaded) {
      setFailed(false);
      return;
    }
    const timer = setTimeout(() => setFailed(true), 25000);
    return () => clearTimeout(timer);
  }, [loaded, pointKey, retry]);
  const cards = useMemo(() => {
    const located = new Set(venues.points.map((p) => p.id));
    return sessions.filter((s) => located.has(s.venue.id));
  }, [venues.points, sessions]);
  const active = cards.find((s) => s.id === selected);
  const [cardHeight, setCardHeight] = useState(0);
  useEffect(() => {
    onCardHeight(active && loaded && !failed ? cardHeight : 0);
  }, [active, cardHeight, onCardHeight, loaded, failed]);
  useEffect(() => {
    if (selected && !cards.some((s) => s.id === selected)) setSelected(null);
  }, [cards, selected]);
  useEffect(() => {
    if (!active) return;
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        setSelected(null);
        return true;
      }
    );
    return () => subscription.remove();
  }, [active]);
  return (
    <View
      style={{
        flex: 1,
        minHeight: 0,
        overflow: "hidden",
        backgroundColor: c.surfaceLow
      }}
    >
      {sessions.length === 0 ? (
        <MapStatus topInset={topInset}>
          <EmptyState
            title="No sessions in this area"
            description="Try changing your location or filters to find another session."
          />
        </MapStatus>
      ) : points.length === 0 ? (
        <MapStatus topInset={topInset}>
          <EmptyState
            title="No venues on the map"
            description="Venue map locations haven’t been added yet. You can still browse every session in the list."
          />
        </MapStatus>
      ) : (
        <>
          <DiscoveryMap
            key={retry}
            points={points}
            topInset={topInset}
            bottomInset={active ? cardHeight + 24 : 104}
            selectedId={active?.venue.id}
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            onMove={setPending}
            onSelect={(id) => {
              const first = cards.find((s) => s.venue.id === id);
              if (first) setSelected(first.id);
            }}
          />
          {!loaded && !failed && (
            <View
              style={{
                position: "absolute",
                top: topInset + 8,
                left: 16,
                right: 16,
                padding: 16,
                backgroundColor: c.surface,
                borderRadius: 16
              }}
            >
              <ActivityIndicator
                color={c.accent}
                accessibilityLabel="Loading map"
              />
            </View>
          )}
          {failed && (
            <View
              style={{
                position: "absolute",
                top: topInset + 8,
                left: 16,
                right: 16,
                backgroundColor: c.surface,
                borderRadius: 16,
                padding: 16,
                gap: 8
              }}
            >
              <AppText>Couldn’t load the map.</AppText>
              <AppButton size="sm" onPress={() => setRetry((v) => v + 1)}>
                Retry map
              </AppButton>
            </View>
          )}
          {pending && loaded && !failed && (
            <View
              style={{
                position: "absolute",
                top: topInset + 8,
                alignSelf: "center"
              }}
            >
              <AppButton
                size="sm"
                fullWidth={false}
                onPress={() => {
                  onArea(
                    pending,
                    venues.points
                      .filter((p) => {
                        const b = pending;
                        return (
                          p.latitude >= b.south &&
                          p.latitude <= b.north &&
                          (b.west <= b.east
                            ? p.longitude >= b.west && p.longitude <= b.east
                            : p.longitude >= b.west || p.longitude <= b.east)
                        );
                      })
                      .map((p) => p.id)
                  );
                  setPending(null);
                }}
              >
                Search this area
              </AppButton>
            </View>
          )}
        </>
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

function MapStatus({
  topInset,
  children
}: {
  topInset: number;
  children: React.ReactNode;
}) {
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: "center",
        paddingTop: topInset + 16,
        paddingHorizontal: 20,
        paddingBottom: 96
      }}
    >
      {children}
    </ScrollView>
  );
}
