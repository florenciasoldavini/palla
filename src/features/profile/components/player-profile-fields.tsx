import { useFieldBackground } from "@/components/atoms/field-surface";
import { useState } from "react";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { Controller, useWatch, type UseFormReturn } from "react-hook-form";
import {
  ArrowLeft,
  ArrowRight,
  ArrowLeftRight,
  Award,
  ChevronDown,
  ChevronUp
} from "lucide-react-native";
import { AppCard, AppHeading, AppText, FieldMessage } from "@/components/atoms";
import { atomPalette as c } from "@/components/atoms/theme";
import { CategoryChoice } from "@/features/onboarding/components/category-choice";
import {
  playerCategoryLabel,
  handLabels,
  type CourtSide,
  type DominantHand
} from "../player-traits";
import type { ProfileInfoInput } from "../validation";

const sides = [
  { value: "left", label: "Left", detail: "(Revés)", Icon: ArrowLeft },
  { value: "right", label: "Right", detail: "(Drive)", Icon: ArrowRight },
  {
    value: "flexible",
    label: "Flexible",
    detail: "Both sides",
    Icon: ArrowLeftRight
  }
] as const;

export function PlayerProfileFields({
  form,
  disabled,
  onChange
}: {
  form: UseFormReturn<ProfileInfoInput>;
  disabled: boolean;
  onChange: () => void;
}) {
  const fieldBackground = useFieldBackground();
  const [categoryOpen, setCategoryOpen] = useState(false);
  const { fontScale } = useWindowDimensions();
  const [categoryStatus, playingCategory] = useWatch({
    control: form.control,
    name: ["categoryStatus", "playingCategory"]
  });
  return (
    <AppCard padding="lg" style={styles.section}>
      <AppHeading variant="section">Player profile</AppHeading>
      <View style={styles.field}>
        <AppText variant="formLabel">Playing category</AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Change playing category"
          accessibilityState={{ expanded: categoryOpen, disabled }}
          disabled={disabled}
          onPress={() => setCategoryOpen(!categoryOpen)}
          style={[
            styles.category,
            { backgroundColor: fieldBackground },
            disabled && styles.disabled
          ]}
        >
          <View style={styles.icon}>
            <Award size={24} color={c.text} strokeWidth={1.7} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <AppHeading variant="section">
              {playerCategoryLabel(categoryStatus, playingCategory)}
            </AppHeading>
            <AppText tone="subtle" variant="bodySm">
              {categoryStatus === "known" || categoryStatus === "beginner"
                ? "Self-reported category"
                : "Choose the option that fits you"}
            </AppText>
          </View>
          {categoryOpen ? (
            <ChevronUp size={20} color={c.textSubtle} />
          ) : (
            <ChevronDown size={20} color={c.textSubtle} />
          )}
        </Pressable>
        {categoryOpen && (
          <CategoryChoice
            status={categoryStatus}
            category={playingCategory}
            disabled={disabled}
            allowNotPlaying
            onChange={(status, category) => {
              form.setValue("categoryStatus", status, {
                shouldDirty: true,
                shouldValidate: true
              });
              form.setValue("playingCategory", category, {
                shouldDirty: true,
                shouldValidate: true
              });
              onChange();
            }}
          />
        )}
        {form.formState.errors.playingCategory && (
          <FieldMessage tone="error">
            {form.formState.errors.playingCategory.message}
          </FieldMessage>
        )}
      </View>
      <Controller
        control={form.control}
        name="preferredCourtSide"
        render={({ field, fieldState }) => (
          <View style={styles.field}>
            <AppText variant="formLabel">
              Preferred court position{" "}
              <AppText variant="bodySm" tone="subtle">
                (optional)
              </AppText>
            </AppText>
            <View
              accessibilityRole="radiogroup"
              accessibilityLabel="Preferred court position"
              style={[styles.sides, fontScale > 1.3 && styles.stacked]}
            >
              {sides.map(({ value, label, detail, Icon }) => {
                const selected = field.value === value;
                return (
                  <Pressable
                    key={value}
                    accessibilityRole="radio"
                    accessibilityLabel={
                      value === "flexible"
                        ? "Flexible, both sides"
                        : `${label} court, ${detail.slice(1, -1)}`
                    }
                    accessibilityState={{ checked: selected, disabled }}
                    disabled={disabled}
                    onPress={() => {
                      field.onChange(value satisfies CourtSide);
                      field.onBlur();
                      onChange();
                    }}
                    style={[
                      styles.side,
                      selected && styles.selectedSide,
                      disabled && styles.disabled
                    ]}
                  >
                    <Icon
                      size={26}
                      strokeWidth={1.8}
                      color={selected ? c.brand : c.textSubtle}
                    />
                    <AppText
                      variant="label"
                      style={[
                        styles.centered,
                        { color: selected ? c.surface : c.text }
                      ]}
                    >
                      {label}
                    </AppText>
                    <AppText
                      variant="bodySm"
                      style={[
                        styles.centered,
                        { color: selected ? c.textInverse : c.textSubtle }
                      ]}
                    >
                      {detail}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
            {fieldState.error && (
              <FieldMessage tone="error">
                {fieldState.error.message}
              </FieldMessage>
            )}
          </View>
        )}
      />
      <Controller
        control={form.control}
        name="dominantHand"
        render={({ field, fieldState }) => (
          <View style={styles.field}>
            <AppText variant="formLabel">
              Dominant hand{" "}
              <AppText variant="bodySm" tone="subtle">
                (optional)
              </AppText>
            </AppText>
            <View
              accessibilityRole="radiogroup"
              accessibilityLabel="Dominant hand"
              style={styles.handTray}
            >
              {(["right", "left"] as DominantHand[]).map((value) => (
                <Pressable
                  key={value}
                  accessibilityRole="radio"
                  accessibilityLabel={handLabels[value]}
                  accessibilityState={{
                    checked: field.value === value,
                    disabled
                  }}
                  disabled={disabled}
                  onPress={() => {
                    field.onChange(value);
                    field.onBlur();
                    onChange();
                  }}
                  style={[
                    styles.hand,
                    field.value === value && styles.selectedHand,
                    disabled && styles.disabled
                  ]}
                >
                  <AppText variant="label" style={styles.centered}>
                    {handLabels[value]}
                  </AppText>
                </Pressable>
              ))}
            </View>
            {fieldState.error && (
              <FieldMessage tone="error">
                {fieldState.error.message}
              </FieldMessage>
            )}
          </View>
        )}
      />
    </AppCard>
  );
}
const styles = StyleSheet.create({
  section: { gap: 24 },
  field: { gap: 12 },
  category: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: c.borderSubtle,
    borderRadius: 16
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: c.surfaceRaised,
    alignItems: "center",
    justifyContent: "center"
  },
  sides: { flexDirection: "row", gap: 8 },
  stacked: { flexDirection: "column" },
  side: {
    flex: 1,
    minHeight: 128,
    borderWidth: 1,
    borderColor: c.borderSubtle,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 8,
    gap: 8
  },
  selectedSide: { backgroundColor: c.text, borderColor: c.text },
  centered: { textAlign: "center", flexShrink: 1 },
  handTray: {
    flexDirection: "row",
    backgroundColor: c.surfaceLow,
    borderRadius: 16,
    padding: 4,
    gap: 4
  },
  hand: {
    flex: 1,
    minHeight: 48,
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent"
  },
  selectedHand: { backgroundColor: c.surface, borderColor: c.borderSubtle },
  disabled: { opacity: 0.6 }
});
