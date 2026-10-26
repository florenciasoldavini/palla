import { mergeDiscoveryPages } from "./pagination";
import { normalizeMapBounds, sameMapBounds } from "./map-bounds";
import { cityLabel, type DiscoveryCity } from "./cities";
import { useDiscoverySort } from "./hooks/use-discovery-sort";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  View
} from "react-native";
import { Tabs, useRouter } from "expo-router";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import { useCallback } from "react";
import { Map, List, ChevronDown, MapPin } from "lucide-react-native";
import {
  AppButton,
  AppHeading,
  AppText,
  EmptyState,
  ErrorState,
  Screen
} from "@/components/atoms";
import { atomPalette as c } from "@/components/atoms/theme";
import { NavigationChromeContext } from "@/components/navigation/chrome-context";
import { AuthContext } from "@/features/auth/auth-provider";
import {
  defaultFilters,
  eligibleSession,
  hasFilters,
  sections,
  type DiscoveryFilters,
  type DiscoverySession
} from "./domain";
import { useDiscovery } from "./hooks/use-discovery";
import { useDiscoveryLocation } from "./hooks/use-discovery-location";
import { DiscoveryLocationSheet } from "./components/discovery-location-sheet";
import { DiscoverySearchFilters } from "./components/discovery-search-filters";
import { DiscoveryNavigationHeader } from "./components/discovery-navigation-header";
import { DiscoverySessionCard } from "./components/discovery-session-card";
import { DiscoveryMapPanel } from "./components/discovery-map-panel";
export default function DiscoveryScreen() {
  const saved = useDiscoveryLocation();
  const focused = useIsFocused();
  const [filters, setFilters] = useState(defaultFilters);
  const applied = useMemo(
    () => ({ ...filters, location: saved.location, city: saved.city }),
    [filters, saved.location, saved.city]
  );
  const query = useDiscovery(applied, saved.ready && focused);
  const sessions = useMemo(
    () => mergeDiscoveryPages(query.data?.pages ?? []),
    [query.data]
  );
  const refresh = query.refetch;
  const loadMore = useCallback(() => {
    if (
      query.canLoadMore &&
      !query.isFetching &&
      !query.isPlaceholderData &&
      query.hasNextPage
    )
      void query.fetchNextPage({ cancelRefetch: false });
  }, [
    query.canLoadMore,
    query.isFetching,
    query.isPlaceholderData,
    query.hasNextPage,
    query.fetchNextPage
  ]);
  useFocusEffect(
    useCallback(() => {
      if (saved.ready) void refresh();
    }, [refresh, saved.ready])
  );
  return (
    <DiscoveryContent
      filters={applied}
      onFilters={setFilters}
      onLocation={saved.changeLocation}
      sessions={sessions}
      loading={!saved.ready || query.isPending}
      error={query.isError && !query.data}
      refreshing={query.isRefetching && !query.isFetchingNextPage}
      refresh={() => refresh()}
      hasMore={!!query.hasNextPage && !query.isPlaceholderData}
      refreshError={query.isRefetchError}
      loadingMore={query.isFetchingNextPage}
      loadMoreError={query.isFetchNextPageError}
      loadMore={loadMore}
    />
  );
}
export function DiscoveryContent({
  filters,
  onFilters,
  onLocation,
  sessions,
  loading,
  error,
  refreshing,
  refresh,
  hasMore = false,
  loadingMore = false,
  loadMoreError = false,
  refreshError = false,
  loadMore,
  preview = false
}: {
  filters: DiscoveryFilters;
  onFilters: (f: DiscoveryFilters) => void;
  onLocation: (city: DiscoveryCity) => Promise<void> | void;
  sessions: DiscoverySession[];
  loading: boolean;
  error: boolean;
  refreshing: boolean;
  refresh: () => Promise<unknown> | void;
  hasMore?: boolean;
  loadingMore?: boolean;
  loadMoreError?: boolean;
  refreshError?: boolean;
  loadMore?: () => void;
  preview?: boolean;
}) {
  const router = useRouter();
  const listRef = useRef<FlatList>(null);
  const filterKey = JSON.stringify(filters);
  const lastFilterKey = useRef(filterKey);
  useEffect(() => {
    if (lastFilterKey.current !== filterKey) {
      lastFilterKey.current = filterKey;
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
    }
  }, [filterKey]);
  const [mapRevision, setMapRevision] = useState(0);
  const applyFilters = (next: DiscoveryFilters) => {
    if (filters.bounds && !next.bounds) setMapRevision((value) => value + 1);
    onFilters(next);
  };
  const sorting = useDiscoverySort(filters, applyFilters);
  const hasNavigationChrome = useContext(NavigationChromeContext);
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const [mapCardHeight, setMapCardHeight] = useState(0);
  const [mapControlsHeight, setMapControlsHeight] = useState(132);
  async function pullRefresh() {
    setPullRefreshing(true);
    try {
      await refresh();
    } finally {
      setPullRefreshing(false);
    }
  }
  const { user } = useContext(AuthContext);
  const [draft, setDraft] = useState(filters.search),
    [locationOpen, setLocationOpen] = useState(false),
    [map, setMap] = useState(false);
  useEffect(() => {
    if (
      map &&
      hasMore &&
      !loadingMore &&
      !loadMoreError &&
      !loading &&
      !refreshing &&
      !refreshError &&
      !error
    )
      loadMore?.();
  }, [
    map,
    hasMore,
    loadingMore,
    loadMoreError,
    refreshError,
    loading,
    refreshing,
    error,
    loadMore
  ]);
  const locationLabel = filters.bounds
    ? "Map area"
    : filters.radius === "any"
      ? filters.location
      : "Near me";
  const openLocation = useCallback(() => {
    Keyboard.dismiss();
    setLocationOpen(true);
  }, []);
  const navigationOptions = useMemo(
    () => ({
      header: () => (
        <DiscoveryNavigationHeader
          location={locationLabel}
          onLocation={openLocation}
        />
      )
    }),
    [locationLabel, openLocation]
  );
  const area = filters.bounds ?? null;
  const [group, setGroup] = useState<"soon" | "today" | "upcoming" | null>(
    null
  );
  useEffect(() => {
    setDraft(filters.search);
    setGroup(null);
  }, [filters]);
  const groups = useMemo(() => sections(sessions), [sessions]);
  const filtered =
    hasFilters(filters) ||
    filters.sort !== "soonest" ||
    area !== null ||
    group !== null;
  const shown = useMemo(
    () =>
      group
        ? groups[group]
        : filters.sort !== "soonest"
          ? sessions.filter((s) => eligibleSession(s))
          : [...groups.soon, ...groups.today, ...groups.upcoming],
    [groups, group, sessions, filters.sort]
  );
  const open = (id: string) => {
    if (!preview) router.push({ pathname: "/session", params: { id } });
  };
  const changeFilters = (f: DiscoveryFilters) => {
    Keyboard.dismiss();
    applyFilters(f);
  };
  const title =
    group === "soon"
      ? "Starting soon"
      : group === "today"
        ? "Available today"
        : group === "upcoming"
          ? "Upcoming sessions"
          : "Sessions";
  const section = (label: string, key: typeof group) => (
    <View style={styles.sectionHeader}>
      <AppHeading variant="section" style={{ flex: 1 }}>
        {label}
      </AppHeading>
      <AppButton
        size="sm"
        color="accent"
        variant="ghost"
        fullWidth={false}
        onPress={() => setGroup(key)}
      >
        See all
      </AppButton>
    </View>
  );
  const header = (
    <View style={{ gap: 18 }}>
      {preview && !hasNavigationChrome && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Change location, ${locationLabel}`}
          onPress={() => {
            Keyboard.dismiss();
            setLocationOpen(true);
          }}
          style={{
            flexDirection: "row",
            gap: 8,
            alignItems: "center",
            minHeight: 48
          }}
        >
          <MapPin size={21} color={c.accent} />
          <AppHeading variant="section" style={{ flexShrink: 1 }}>
            {locationLabel}
          </AppHeading>
          <ChevronDown size={20} color={c.text} />
        </Pressable>
      )}
      <DiscoverySearchFilters
        sorting={sorting}
        filters={filters}
        draft={draft}
        onDraftChange={setDraft}
        onChange={changeFilters}
      />
      {(hasFilters(filters) || group || area) && (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            flexWrap: "wrap"
          }}
        >
          <AppText variant="bodySm" tone="muted" style={{ flex: 1 }}>
            {area
              ? "Selected map area"
              : group
                ? title
                : `${shown.length} matching ${shown.length === 1 ? "session" : "sessions"}`}
          </AppText>
          <AppButton
            size="sm"
            variant="ghost"
            color="accent"
            fullWidth={false}
            onPress={() => {
              setGroup(null);
              sorting.cancel();
              changeFilters({
                ...defaultFilters,
                location: filters.location,
                city: filters.city
              });
            }}
          >
            Clear filters
          </AppButton>
        </View>
      )}
      {refreshError && !error && (
        <View style={{ gap: 8 }}>
          <AppText variant="bodySm" accessibilityLiveRegion="polite">
            Couldn’t refresh sessions. Showing your previous results.
          </AppText>
          <AppButton
            size="sm"
            variant="ghost"
            color="accent"
            fullWidth={false}
            onPress={() => {
              void refresh();
            }}
          >
            Try again
          </AppButton>
        </View>
      )}
      {error && (
        <ErrorState
          title="Couldn’t load sessions"
          description="Check your connection, then try again."
          onRetry={refresh}
          retrying={refreshing}
        />
      )}
      {loading && !error && (
        <View style={{ padding: 32, gap: 16, alignItems: "center" }}>
          <ActivityIndicator color={c.accent} />
          <AppText>Finding sessions…</AppText>
        </View>
      )}
      {!loading && !error && !shown.length && (
        <EmptyState
          title="No sessions found"
          description="Try another date, category or area. New sessions will appear here when hosts publish them."
          action={{
            label: "Change location",
            onPress: () => setLocationOpen(true)
          }}
        />
      )}
      {!loading && !error && !filtered && groups.soon.length > 0 && (
        <View style={{ gap: 12 }}>
          {section("Starting soon", "soon")}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 12, paddingRight: 4 }}
          >
            {groups.soon.slice(0, 6).map((s) => (
              <DiscoverySessionCard
                key={s.id}
                session={s}
                featured
                preview={preview}
                onPress={() => open(s.id)}
              />
            ))}
          </ScrollView>
        </View>
      )}
      {!loading &&
        !error &&
        !filtered &&
        groups.today.length > 0 &&
        section("Available today", "today")}
      {!loading && !error && filtered && shown.length > 0 && (
        <AppHeading variant="section">{title}</AppHeading>
      )}
    </View>
  );
  type Row =
    { kind: "session"; session: DiscoverySession } | { kind: "heading" };
  const rows: Row[] =
    loading || error
      ? []
      : filtered
        ? shown.map((session) => ({ kind: "session", session }))
        : [
            ...groups.today.map((session) => ({
              kind: "session" as const,
              session
            })),
            ...(groups.upcoming.length
              ? [
                  { kind: "heading" as const },
                  ...groups.upcoming.map((session) => ({
                    kind: "session" as const,
                    session
                  }))
                ]
              : [])
          ];
  return (
    <Screen
      scrollable={false}
      contentContainerStyle={{ paddingTop: 0, paddingBottom: 0 }}
      contentStyle={{ paddingHorizontal: 0, flex: 1 }}
    >
      {(!preview || hasNavigationChrome) && (
        <Tabs.Screen options={navigationOptions} />
      )}
      <View style={{ flex: 1 }}>
        <View
          style={{ flex: 1, opacity: map ? 0 : 1 }}
          pointerEvents={map ? "none" : "auto"}
          accessibilityElementsHidden={map}
          importantForAccessibility={map ? "no-hide-descendants" : "auto"}
        >
          <FlatList
            ref={listRef}
            data={rows}
            keyExtractor={(r) =>
              r.kind === "heading" ? "upcoming" : r.session.id
            }
            ListHeaderComponent={header}
            onEndReached={() => {
              if (!map && hasMore && !loadMoreError) loadMore?.();
            }}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
              hasMore && !error ? (
                <View style={{ gap: 8, paddingVertical: 16 }}>
                  {loadMoreError && (
                    <AppText variant="bodySm" accessibilityLiveRegion="polite">
                      Couldn’t load more sessions. Your results are still here.
                    </AppText>
                  )}
                  <AppButton
                    color="accent"
                    variant="ghost"
                    loading={loadingMore}
                    onPress={loadMore}
                  >
                    {loadMoreError
                      ? "Retry loading sessions"
                      : "Load more sessions"}
                  </AppButton>
                </View>
              ) : null
            }
            renderItem={({ item }) =>
              item.kind === "heading" ? (
                section("Upcoming sessions", "upcoming")
              ) : (
                <DiscoverySessionCard
                  session={item.session}
                  preview={preview}
                  onPress={() => open(item.session.id)}
                />
              )
            }
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            contentContainerStyle={{
              padding: 20,
              paddingTop: 4,
              paddingBottom: 100,
              gap: 12
            }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            onRefresh={() => {
              void pullRefresh();
            }}
            refreshing={pullRefreshing && !loading}
            initialNumToRender={6}
            windowSize={5}
          />
        </View>
        {map && (
          <View
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: c.surfaceLow }
            ]}
          >
            <DiscoveryMapPanel
              key={`${filters.city?.id ?? filters.location}:${mapRevision}`}
              sessions={shown}
              center={
                filters.radius !== "any" && filters.origin
                  ? filters.origin
                  : (filters.city ?? undefined)
              }
              initialBounds={filters.bounds}
              topInset={mapControlsHeight + 24}
              onCardHeight={setMapCardHeight}
              searching={loading || refreshing || loadingMore}
              error={error || refreshError || loadMoreError}
              errorMessage={
                loadMoreError
                  ? "Couldn’t load all sessions in this area."
                  : undefined
              }
              onRetry={() => {
                if (loadMoreError) loadMore?.();
                else void refresh();
              }}
              onArea={(bounds) => {
                const next = normalizeMapBounds(bounds);
                if (sameMapBounds(filters.bounds, next)) return;
                setGroup(null);
                sorting.cancel();
                onFilters({
                  ...filters,
                  bounds: next,
                  radius: "any",
                  origin: filters.sort === "nearest" ? filters.origin : null
                });
              }}
              onOpen={open}
              preview={preview}
            />
            <View
              pointerEvents="box-none"
              onLayout={({ nativeEvent }) =>
                setMapControlsHeight(Math.ceil(nativeEvent.layout.height))
              }
              style={{
                position: "absolute",
                top: 12,
                left: 20,
                right: 20,
                gap: 12
              }}
            >
              <DiscoverySearchFilters
                sorting={sorting}
                floating
                filters={filters}
                draft={draft}
                onDraftChange={setDraft}
                onChange={changeFilters}
              />
            </View>
          </View>
        )}
        <View
          style={{
            position: "absolute",
            bottom: map ? mapCardHeight + 32 : 16,
            right: 20
          }}
        >
          <AppButton
            fullWidth={false}
            icon={map ? List : Map}
            layout="icon"
            size="iconLg"
            style={{ width: 56, height: 56, minHeight: 56, paddingVertical: 0 }}
            color="neutral"
            onPress={() => {
              Keyboard.dismiss();
              setMap((v) => !v);
            }}
            accessibilityLabel={map ? "Show session list" : "Show session map"}
          />
        </View>
        {locationOpen && (
          <DiscoveryLocationSheet
            onClose={() => setLocationOpen(false)}
            onChange={async (v) => {
              setGroup(null);
              sorting.cancel();
              await onLocation(v);
              changeFilters({
                ...filters,
                location: cityLabel(v),
                city: v,
                bounds: null,
                radius: "any",
                origin: filters.sort === "nearest" ? filters.origin : null
              });
            }}
          />
        )}
        {preview && (
          <AppText
            variant="caption"
            tone="muted"
            style={{
              position: "absolute",
              bottom: map ? mapCardHeight + 104 : 0,
              left: 20,
              backgroundColor: c.surface,
              paddingHorizontal: 6,
              borderRadius: 6
            }}
          >
            Design preview · {user ? "Signed in" : "No account changes"}
          </AppText>
        )}
      </View>
    </Screen>
  );
}
const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16
  }
});
