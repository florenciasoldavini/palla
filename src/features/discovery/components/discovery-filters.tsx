import { DiscoveryAdvancedFilters } from "./discovery-advanced-filters";
import { advancedFilterCount } from "../advanced-filters";
import { useState, type ReactNode } from "react";
import { View, Keyboard } from "react-native";
import {
  AppButton,
  AppText,
  FilterChip,
  FilterChipGroup,
  SelectMenu,
  TextField
} from "@/components/atoms";
import { AppBottomSheet } from "@/components/atoms/bottom-sheet";
import { SessionDateTimeField } from "@/features/sessions/components/session-datetime-field";
import { dateKey, type DiscoveryFilters } from "../domain";
const categories = [
  { value: "all", label: "All categories" },
  ...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({
    value: String(n),
    label: `${n}${n === 1 ? "ra" : n === 2 ? "da" : n === 3 ? "ra" : n === 4 ? "ta" : n === 5 ? "ta" : n === 6 ? "ta" : n === 7 ? "ma" : "va"} category`
  }))
];
const times = [
  { value: "any", label: "Any time" },
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" }
];
const availability = [
  { value: "joinable", label: "Joinable" },
  { value: "spots", label: "Spots available" },
  { value: "waitlist", label: "Waitlist open" },
  { value: "all", label: "All sessions" }
];
function ChipSelect({
  value,
  options,
  onChange,
  label,
  active
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  label: string;
  active: boolean;
}) {
  return (
    <SelectMenu
      value={value}
      options={options}
      onChange={onChange}
      accessibilityLabel={label}
      renderTrigger={(open) => (
        <FilterChip
          label={options.find((o) => o.value === value)?.label ?? label}
          accessibilityLabel={label}
          selected={active}
          onPress={open}
        />
      )}
    />
  );
}
export function DiscoveryFiltersBar({
  filters,
  onChange,
  sortControl
}: {
  sortControl?: ReactNode;
  filters: DiscoveryFilters;
  onChange: (f: DiscoveryFilters) => void;
}) {
  const [range, setRange] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const count = advancedFilterCount(filters);
  const [from, setFrom] = useState(dateKey(Date.now()));
  const [to, setTo] = useState(dateKey(Date.now()));
  const [error, setError] = useState("");
  const today = dateKey(Date.now()),
    tomorrow = dateKey(Date.now() + 86400000);
  const dateValue =
    !filters.from && !filters.to
      ? "any"
      : filters.from === today && filters.to === today
        ? "today"
        : filters.from === tomorrow && filters.to === tomorrow
          ? "tomorrow"
          : "range";
  return (
    <>
      <FilterChipGroup>
        {sortControl}
        <FilterChip
          label={count ? `More filters · ${count}` : "More filters"}
          accessibilityLabel="More filters"
          selected={count > 0}
          onPress={() => setAdvanced(true)}
        />
        <ChipSelect
          value={dateValue}
          label="Filter by date"
          active={dateValue !== "any"}
          options={[
            { value: "any", label: "Any date" },
            { value: "today", label: "Today" },
            { value: "tomorrow", label: "Tomorrow" },
            {
              value: "range",
              label:
                dateValue === "range"
                  ? `${filters.from} – ${filters.to}`
                  : "Date range"
            }
          ]}
          onChange={(v) => {
            if (v === "range") {
              setFrom(filters.from || today);
              setTo(filters.to || today);
              setError("");
              setRange(true);
              return;
            }
            const day =
              v === "today" ? today : v === "tomorrow" ? tomorrow : "";
            onChange({ ...filters, from: day, to: day });
          }}
        />
        <ChipSelect
          value={filters.category}
          options={categories}
          label="Filter by category"
          active={filters.category !== "all"}
          onChange={(category) => onChange({ ...filters, category })}
        />
        <ChipSelect
          value={filters.time}
          options={times}
          label="Filter by time"
          active={filters.time !== "any"}
          onChange={(time) => onChange({ ...filters, time })}
        />
        <ChipSelect
          value={filters.availability}
          options={availability}
          label="Filter by availability"
          active={filters.availability !== "joinable"}
          onChange={(availability) => onChange({ ...filters, availability })}
        />
      </FilterChipGroup>
      {advanced && (
        <DiscoveryAdvancedFilters
          value={filters}
          onClose={() => setAdvanced(false)}
          onApply={(value) => onChange({ ...filters, ...value })}
        />
      )}
      {range && (
        <AppBottomSheet
          title="Choose dates"
          busy={false}
          onClose={() => setRange(false)}
        >
          <View style={{ gap: 16 }}>
            <SessionDateTimeField
              label="From date"
              mode="date"
              value={from}
              onChange={setFrom}
            />
            <SessionDateTimeField
              label="To date"
              mode="date"
              value={to}
              onChange={setTo}
            />
            {!!error && (
              <AppText tone="danger" variant="bodySm">
                {error}
              </AppText>
            )}
            <AppButton
              onPress={() => {
                if (from > to) {
                  setError("End date must be on or after the start date.");
                  return;
                }
                onChange({ ...filters, from, to });
                setRange(false);
              }}
            >
              Apply dates
            </AppButton>
          </View>
        </AppBottomSheet>
      )}
    </>
  );
}
export function DiscoveryLocationSheet({
  value,
  onChange,
  onClose
}: {
  value: string;
  onChange: (s: string) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(value),
    [error, setError] = useState("");
  function apply() {
    const text = draft.trim();
    if (text.length < 3) {
      setError("Enter at least 3 characters.");
      return;
    }
    Keyboard.dismiss();
    onChange(text);
    onClose();
  }
  return (
    <AppBottomSheet
      title="Where do you want to play?"
      busy={false}
      onClose={onClose}
    >
      <View style={{ gap: 16 }}>
        <TextField
          label="City or area"
          accessibilityLabel="City or area"
          value={draft}
          onChangeText={setDraft}
          maxLength={120}
          onSubmitEditing={apply}
          returnKeyType="done"
          errorText={error}
        />
        <AppText variant="bodySm" tone="muted">
          Search saved venue names and addresses. Try your city or neighborhood.
        </AppText>
        <AppButton onPress={apply}>Apply location</AppButton>
      </View>
    </AppBottomSheet>
  );
}
