import { atomPalette } from "@/components/atoms/theme";
import { getSansFontStyle } from "@/theme/fonts";
import { Text } from "react-native";

export function PallaWordmark({ compact = false }: { compact?: boolean }) {
  return (
    <Text
      style={{
        color: atomPalette.text,
        fontSize: compact ? 24 : 30,
        letterSpacing: -0.8,
        lineHeight: compact ? 30 : 36,
        ...getSansFontStyle("700")
      }}
    >
      Palla
    </Text>
  );
}
