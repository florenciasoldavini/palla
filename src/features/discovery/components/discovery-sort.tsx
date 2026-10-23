import { FilterChip, SelectMenu } from "@/components/atoms";
import type { DiscoveryFilters } from "../domain";
import { discoverySortOptions } from "../sorting";
import type { useDiscoverySort } from "../hooks/use-discovery-sort";
export function DiscoverySortControl({
  filters,
  sorting
}: {
  filters: DiscoveryFilters;
  sorting: ReturnType<typeof useDiscoverySort>;
}) {
  return (
    <SelectMenu
      value={filters.sort}
      options={discoverySortOptions}
      accessibilityLabel="Sort sessions"
      onChange={(sort) => {
        void sorting.select(sort);
      }}
      renderTrigger={(open) => (
        <FilterChip
          label={
            sorting.pending === "sort"
              ? "Locating…"
              : `Sort: ${discoverySortOptions.find((o) => o.value === filters.sort)?.label}`
          }
          accessibilityLabel="Sort sessions"
          selected={filters.sort !== "soonest"}
          onPress={open}
        />
      )}
    />
  );
}
