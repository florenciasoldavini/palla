import { useState } from "react";
import { Keyboard, View, useWindowDimensions } from "react-native";
import { AppButton, AppText, SelectMenu, TextField } from "@/components/atoms";
import { AppBottomSheet } from "@/components/atoms/bottom-sheet";
import { AttributeChips } from "@/features/attributes/components/attribute-chips";
import {
  sessionAttributeCodes,
  venueAttributeCodes,
  toggleSessionAttribute
} from "@/features/attributes/domain";
import {
  advancedFiltersSchema,
  defaultAdvancedFilters,
  type AdvancedFilters
} from "../advanced-filters";

export function DiscoveryAdvancedFilters({
  value,
  onApply,
  onClose
}: {
  value: AdvancedFilters;
  onApply: (value: AdvancedFilters) => void;
  onClose: () => void;
}) {
  const { fontScale } = useWindowDimensions();
  const [draft, setDraft] = useState<AdvancedFilters>({
    minPrice: value.minPrice,
    maxPrice: value.maxPrice,
    coverage: value.coverage,
    gender: value.gender,
    sessionAttributes: value.sessionAttributes,
    venueAttributes: value.venueAttributes
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  function apply() {
    const result = advancedFiltersSchema.safeParse(draft);
    if (!result.success) {
      setErrors(
        Object.fromEntries(
          result.error.issues.map((i) => [String(i.path[0]), i.message])
        )
      );
      return;
    }
    Keyboard.dismiss();
    onApply(draft);
    onClose();
  }
  return (
    <AppBottomSheet
      title="More filters"
      busy={false}
      onClose={onClose}
      footer={
        <View style={{ gap: 8 }}>
          {Object.values(errors)[0] && (
            <AppText
              tone="danger"
              variant="bodySm"
              accessibilityLiveRegion="polite"
            >
              {Object.values(errors)[0]}
            </AppText>
          )}
          <AppButton onPress={apply}>Apply filters</AppButton>
          <AppButton
            variant="ghost"
            onPress={() => {
              setDraft({ ...defaultAdvancedFilters });
              setErrors({});
            }}
          >
            Reset filters
          </AppButton>
        </View>
      }
    >
      <View style={{ gap: 24 }}>
        <View style={{ gap: 12 }}>
          <AppText variant="label">Price per player · ARS</AppText>
          <AppText variant="bodySm" tone="muted">
            Leave blank for any price. Enter 0 as the maximum for free sessions.
          </AppText>
          <View
            style={{
              flexDirection: fontScale > 1.2 ? "column" : "row",
              gap: 12
            }}
          >
            <View style={{ flex: 1 }}>
              <TextField
                label="Minimum"
                accessibilityLabel="Minimum price in ARS"
                keyboardType="decimal-pad"
                value={draft.minPrice}
                maxLength={12}
                onChangeText={(minPrice) => {
                  setDraft({ ...draft, minPrice });
                  setErrors({});
                }}
                errorText={errors.minPrice}
                placeholder="Any"
              />
            </View>
            <View style={{ flex: 1 }}>
              <TextField
                label="Maximum"
                accessibilityLabel="Maximum price in ARS"
                keyboardType="decimal-pad"
                value={draft.maxPrice}
                maxLength={12}
                onChangeText={(maxPrice) => {
                  setDraft({ ...draft, maxPrice });
                  setErrors({});
                }}
                errorText={errors.maxPrice}
                placeholder="Any"
              />
            </View>
          </View>
        </View>
        <View style={{ gap: 12 }}>
          <AppText variant="label">Court coverage</AppText>
          <SelectMenu
            accessibilityLabel="Court coverage filter"
            value={draft.coverage}
            options={[
              { value: "any", label: "Any coverage" },
              { value: "covered", label: "Covered" },
              { value: "uncovered", label: "Uncovered" }
            ]}
            onChange={(coverage) => setDraft({ ...draft, coverage })}
          />
        </View>
        <View style={{ gap: 12 }}>
          <AppText variant="label">Players</AppText>
          <SelectMenu
            accessibilityLabel="Gender filter"
            value={draft.gender}
            options={[
              { value: "any", label: "Any gender" },
              { value: "all", label: "All genders" },
              { value: "women_only", label: "Women only" },
              { value: "men_only", label: "Men only" }
            ]}
            onChange={(gender) => setDraft({ ...draft, gender })}
          />
        </View>
        <View style={{ gap: 12 }}>
          <AppText variant="label">Session includes</AppText>
          <AttributeChips
            codes={sessionAttributeCodes}
            selected={draft.sessionAttributes}
            onToggle={(code) => {
              if (
                sessionAttributeCodes.includes(
                  code as (typeof sessionAttributeCodes)[number]
                )
              )
                setDraft({
                  ...draft,
                  sessionAttributes: toggleSessionAttribute(
                    draft.sessionAttributes,
                    code as (typeof sessionAttributeCodes)[number]
                  )
                });
            }}
          />
        </View>
        <View style={{ gap: 12 }}>
          <AppText variant="label">Venue facilities</AppText>
          <AttributeChips
            codes={venueAttributeCodes}
            selected={draft.venueAttributes}
            onToggle={(code) => {
              if (
                venueAttributeCodes.includes(
                  code as (typeof venueAttributeCodes)[number]
                )
              ) {
                const attribute = code as (typeof venueAttributeCodes)[number];
                setDraft({
                  ...draft,
                  venueAttributes: draft.venueAttributes.includes(attribute)
                    ? draft.venueAttributes.filter((c) => c !== attribute)
                    : [...draft.venueAttributes, attribute]
                });
              }
            }}
          />
          <AppText variant="bodySm" tone="muted">
            Results must include every selected attribute. Venue facilities are
            reported by the host.
          </AppText>
        </View>
      </View>
    </AppBottomSheet>
  );
}
