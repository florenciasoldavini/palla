import { FilterChip, SelectMenu } from "@/components/atoms";
import type { DiscoveryFilters } from "../domain";
import { discoveryRadiusOptions } from "../radius";
import type { useDiscoverySort } from "../hooks/use-discovery-sort";
export function DiscoveryRadiusControl({
  filters,
  sorting
}: {
  filters: DiscoveryFilters;
  sorting: ReturnType<typeof useDiscoverySort>;
}) {
  return (
    <SelectMenu
      value={filters.radius}
      options={discoveryRadiusOptions}
      accessibilityLabel="Distance radius"
      onChange={(radius) => {
        void sorting.selectRadius(radius);
      }}
      renderTrigger={(open) => (
        <FilterChip
          label={
            sorting.pending === "radius"
              ? "Locating…"
              : discoveryRadiusOptions.find((o) => o.value === filters.radius)!
                  .label
          }
          accessibilityLabel="Distance radius"
          selected={filters.radius !== "any"}
          onPress={open}
        />
      )}
    />
  );
}
