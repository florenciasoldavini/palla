import { designTokens } from "@/theme/tokens";
import { AppText } from "@/components/atoms";
import { atomPalette, atomSpacing } from "@/components/atoms/theme";
import {
  categoryLabels,
  type CategoryStatus
} from "@/features/profile/playing-category";
import { ChevronDown, ChevronUp } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";

export function CategoryChoice({
  status,
  category,
  onChange,
  disabled = false,
  allowNotPlaying = false
}: {
  status: CategoryStatus | null;
  category: number | null;
  onChange: (status: CategoryStatus, category: number | null) => void;
  disabled?: boolean;
  allowNotPlaying?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const options: { value: CategoryStatus; label: string }[] = [
    { value: "known", label: "I know my category" },
    { value: "beginner", label: "I’m just starting" },
    { value: "unknown", label: "Not sure yet" },
    ...(allowNotPlaying
      ? [{ value: "not_playing" as const, label: "I don’t play" }]
      : [])
  ];
  return (
    <View style={{ gap: atomSpacing[3] }}>
      <AppText tone="muted" variant="bodySm">
        Lower numbers mean a higher playing level.
      </AppText>
      {options.map(({ value, label }) => {
        const selected = status === value;
        return (
          <View
            key={value}
            style={{
              borderWidth: 1,
              borderColor: selected ? atomPalette.accent : atomPalette.border,
              borderRadius: 12,
              backgroundColor: selected
                ? designTokens.colors.primitive.volt[50]
                : atomPalette.surface,
              overflow: "hidden"
            }}
          >
            <Pressable
              accessibilityRole="radio"
              accessibilityLabel={label}
              accessibilityState={{ checked: selected, disabled }}
              disabled={disabled}
              onPress={() => {
                onChange(value, value === "known" ? category : null);
                setExpanded(value === "known" && category === null);
              }}
              style={{
                minHeight: 72,
                padding: atomSpacing[5],
                flexDirection: "row",
                alignItems: "center",
                gap: atomSpacing[3]
              }}
            >
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: selected
                    ? atomPalette.accent
                    : atomPalette.borderStrong,
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                {selected ? (
                  <View
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 6,
                      backgroundColor: atomPalette.accent
                    }}
                  />
                ) : null}
              </View>
              <AppText variant="label" style={{ flex: 1 }}>
                {label}
              </AppText>
            </Pressable>
            {selected && value === "known" ? (
              <View
                style={{
                  paddingHorizontal: atomSpacing[5],
                  paddingBottom: atomSpacing[5],
                  gap: atomSpacing[3]
                }}
              >
                <AppText tone="muted" variant="bodySm">
                  Your category
                </AppText>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Your category, ${category ? categoryLabels[category] : "choose a category"}`}
                  accessibilityState={{ expanded, disabled }}
                  disabled={disabled}
                  onPress={() => setExpanded(!expanded)}
                  style={{
                    minHeight: 56,
                    borderRadius: 10,
                    backgroundColor: atomPalette.surface,
                    borderWidth: 1,
                    borderColor: atomPalette.border,
                    paddingHorizontal: atomSpacing[4],
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between"
                  }}
                >
                  <AppText>
                    {category ? categoryLabels[category] : "Choose a category"}
                  </AppText>
                  {expanded ? (
                    <ChevronUp size={20} color={atomPalette.text} />
                  ) : (
                    <ChevronDown size={20} color={atomPalette.text} />
                  )}
                </Pressable>
                {expanded ? (
                  <View
                    style={{
                      borderWidth: 1,
                      borderColor: atomPalette.border,
                      borderRadius: 10,
                      backgroundColor: atomPalette.surface
                    }}
                  >
                    {[8, 7, 6, 5, 4, 3, 2, 1].map((number) => (
                      <Pressable
                        key={number}
                        accessibilityRole="radio"
                        accessibilityLabel={categoryLabels[number]}
                        accessibilityState={{
                          checked: category === number,
                          disabled
                        }}
                        disabled={disabled}
                        onPress={() => {
                          onChange("known", number);
                          setExpanded(false);
                        }}
                        style={{
                          minHeight: 48,
                          paddingHorizontal: atomSpacing[4],
                          justifyContent: "center"
                        }}
                      >
                        <AppText
                          tone={category === number ? "accent" : "default"}
                        >
                          {categoryLabels[number]}
                        </AppText>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
                <AppText tone="muted" variant="bodySm">
                  Your choice is self-reported.
                </AppText>
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
