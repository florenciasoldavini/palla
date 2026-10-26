import { View } from "react-native";
import {
  AppHeading,
  AppText,
  FilterChip,
  SelectMenu
} from "@/components/atoms";
import {
  coverageLabel,
  coverageOptions,
  type CourtCoverage
} from "../court-coverage";
export function CourtCoverageFields({
  venueCoverage,
  coverage,
  onVenueChange,
  onChange,
  disabled,
  canEditVenue,
  error
}: {
  venueCoverage: CourtCoverage[];
  coverage: CourtCoverage | null;
  onVenueChange: (value: CourtCoverage[]) => void;
  onChange: (value: CourtCoverage | null) => void;
  disabled: boolean;
  canEditVenue: boolean;
  error?: string;
}) {
  return (
    <View style={{ gap: 12 }}>
      <AppHeading variant="card">Court coverage</AppHeading>
      <AppText variant="bodySm" tone="muted">
        Does the venue have a roof over its courts? Select both if it has both.
      </AppText>
      {canEditVenue ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {coverageOptions.map((o) => (
            <FilterChip
              key={o.value}
              label={o.label}
              accessibilityLabel={`Venue courts: ${o.label.toLowerCase()}`}
              selected={venueCoverage.includes(o.value)}
              disabled={disabled}
              onPress={() =>
                onVenueChange(
                  venueCoverage.includes(o.value)
                    ? venueCoverage.filter((v) => v !== o.value)
                    : [...venueCoverage, o.value]
                )
              }
            />
          ))}
        </View>
      ) : (
        <AppText>
          {venueCoverage.length
            ? venueCoverage.map(coverageLabel).join(" and ")
            : "Not specified"}
        </AppText>
      )}
      {canEditVenue && !venueCoverage.length && (
        <AppText variant="caption" tone="muted">
          Not specified
        </AppText>
      )}
      {venueCoverage.length !== 1 ? (
        <>
          <AppText variant="formLabel">Court for this session</AppText>
          <View pointerEvents={disabled ? "none" : "auto"}>
            <SelectMenu
              accessibilityLabel="Court for this session"
              value={coverage ?? ""}
              options={[
                { value: "", label: "Not specified" },
                ...coverageOptions
              ]}
              onChange={(v) => onChange(v ? (v as CourtCoverage) : null)}
            />
          </View>
          <AppText variant="caption" tone="muted">
            {venueCoverage.length === 2
              ? "Choose whether this session uses a covered or uncovered court."
              : "You can specify the session’s court even when the venue details are unknown."}
          </AppText>
        </>
      ) : (
        <AppText variant="bodySm">
          This session: {coverageLabel(venueCoverage[0])} court
        </AppText>
      )}
      {!!error && (
        <AppText variant="bodySm" tone="danger">
          {error}
        </AppText>
      )}
    </View>
  );
}
