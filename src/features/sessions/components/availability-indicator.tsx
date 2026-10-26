import { AppText } from "@/components/atoms";
import { atomPalette, atomRadii, atomSpacing } from "@/components/atoms/theme";
import { View } from "react-native";

export function AvailabilityIndicator({
  filled,
  label,
  total = 4
}: {
  filled: number;
  label?: string;
  total?: number;
}) {
  return (
    <View
      style={{
        alignItems: "center",
        flexDirection: "row",
        gap: atomSpacing[2]
      }}
    >
      <View style={{ flexDirection: "row", gap: 3 }}>
        {Array.from({ length: total }, (_, index) => {
          const isFilled = index < filled;

          return (
            <View
              key={index}
              style={{
                backgroundColor: isFilled ? atomPalette.accent : "transparent",
                borderColor: isFilled ? atomPalette.accent : atomPalette.border,
                borderRadius: atomRadii.full,
                borderWidth: 1,
                height: 8,
                width: 8
              }}
            />
          );
        })}
      </View>
      {label ? (
        <AppText tone="muted" variant="meta">
          {label}
        </AppText>
      ) : null}
    </View>
  );
}
