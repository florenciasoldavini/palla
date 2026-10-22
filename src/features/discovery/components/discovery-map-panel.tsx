import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { AppButton, AppText, EmptyState, ErrorState } from "@/components/atoms";
import { AppBottomSheet } from "@/components/atoms/bottom-sheet";
import { atomPalette as c } from "@/components/atoms/theme";
import { DiscoveryMap } from "@/infrastructure/maps/discovery-map";
import type { Bounds, DiscoverySession } from "../domain";
import { useDiscoveryVenues } from "../hooks/use-discovery-venues";
import { DiscoverySessionCard } from "./discovery-session-card";
export function DiscoveryMapPanel({
  sessions,
  onArea,
  onOpen,
  preview = false
}: {
  sessions: DiscoverySession[];
  onArea: (b: Bounds | null, ids: string[]) => void;
  onOpen: (id: string) => void;
  preview?: boolean;
}) {
  const venues = useDiscoveryVenues(sessions, true);
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
  const pointKey = JSON.stringify(points);
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
  const visibleVenues = venues.points.filter((p) => p.id === selected);
  return (
    <View
      style={{
        flex: 1,
        minHeight: 300,
        borderRadius: 20,
        overflow: "hidden",
        backgroundColor: c.surfaceLow
      }}
    >
      {venues.isPending ? (
        <View style={{ padding: 32, gap: 16, alignItems: "center" }}>
          <ActivityIndicator color={c.accent} />
          <AppText>Finding venues on the map…</AppText>
        </View>
      ) : venues.isError ? (
        <ErrorState
          title="Couldn’t locate venues"
          onRetry={() => {
            void venues.refetch();
          }}
        />
      ) : sessions.length === 0 ? (
        <EmptyState
          title="No sessions in this area"
          description="Try changing your location or filters to find another session."
        />
      ) : points.length === 0 ? (
        <EmptyState
          title="No venues on the map"
          description="These addresses couldn’t be located. You can still browse every session in the list."
        />
      ) : (
        <>
          <DiscoveryMap
            key={retry}
            points={points}
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            onMove={setPending}
            onSelect={setSelected}
          />
          {!loaded && !failed && (
            <View
              style={{
                position: "absolute",
                top: 16,
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
                top: 16,
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
              style={{ position: "absolute", top: 16, alignSelf: "center" }}
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
          <View
            style={{
              position: "absolute",
              bottom: 30,
              left: 12,
              right: 12,
              gap: 6
            }}
          >
            <AppText
              variant="caption"
              style={{
                backgroundColor: c.surface,
                padding: 6,
                borderRadius: 6
              }}
            >
              Approximate locations ·{" "}
              {venues.unresolved
                ? `${venues.unresolved} ${venues.unresolved === 1 ? "venue is" : "venues are"} available in list only`
                : "Based on venue addresses"}
            </AppText>
          </View>
        </>
      )}
      {selected && (
        <AppBottomSheet
          title={visibleVenues[0]?.name ?? "Venue sessions"}
          busy={false}
          onClose={() => {
            setSelected(null);
          }}
        >
          <View style={{ gap: 16 }}>
            {visibleVenues.map((v) => (
              <View key={v.id} style={{ gap: 12 }}>
                {v.sessions.map((s) => (
                  <DiscoverySessionCard
                    key={s.id}
                    session={s}
                    preview={preview}
                    onPress={() => {
                      setSelected(null);
                      onOpen(s.id);
                    }}
                  />
                ))}
              </View>
            ))}
          </View>
        </AppBottomSheet>
      )}
    </View>
  );
}
