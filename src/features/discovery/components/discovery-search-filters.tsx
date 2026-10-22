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
  floating = false
}: {
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
      <DiscoveryFiltersBar filters={filters} onChange={onChange} />
    </View>
  );
}
