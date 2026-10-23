import { DiscoveryRadiusControl } from "./discovery-radius";
import { ActivityIndicator } from "react-native";
import { AppText } from "@/components/atoms";
import { atomPalette } from "@/components/atoms/theme";
import type { useDiscoverySort } from "../hooks/use-discovery-sort";
import { DiscoverySortControl } from "./discovery-sort";
import { View } from "react-native";
import { SearchField } from "@/components/atoms/search-field";
import type { DiscoveryFilters } from "../domain";
import { DiscoveryFiltersBar } from "./discovery-filters";
/** List and map share both the controls and their controlled filter values. */
export function DiscoverySearchFilters({
  filters,
  draft,
  onDraftChange,
  onChange,
  sorting,
  floating = false
}: {
  sorting: ReturnType<typeof useDiscoverySort>;
  floating?: boolean;
  filters: DiscoveryFilters;
  draft: string;
  onDraftChange: (value: string) => void;
  onChange: (filters: DiscoveryFilters) => void;
}) {
  return (
    <View pointerEvents="box-none" style={{ gap: 18 }}>
      <SearchField
        floating={floating}
        value={draft}
        onChangeText={onDraftChange}
        placeholder="Search clubs or sessions"
        onSearch={() => onChange({ ...filters, search: draft.trim() })}
      />
      <DiscoveryFiltersBar
        filters={filters}
        onChange={onChange}
        sortControl={
          <>
            <DiscoverySortControl filters={filters} sorting={sorting} />
            <DiscoveryRadiusControl filters={filters} sorting={sorting} />
          </>
        }
      />
      {sorting.locating && (
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <ActivityIndicator color={atomPalette.accent} />
          <AppText variant="bodySm" accessibilityLiveRegion="polite">
            Finding your location…
          </AppText>
        </View>
      )}
      {!!sorting.error && (
        <AppText
          variant="bodySm"
          tone="danger"
          accessibilityLiveRegion="polite"
        >
          {sorting.error}
        </AppText>
      )}
    </View>
  );
}
