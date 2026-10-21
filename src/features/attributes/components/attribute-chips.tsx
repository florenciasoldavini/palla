import { View, Pressable } from "react-native";
import { Check } from "lucide-react-native";
import { AppText } from "@/components/atoms";
import { atomPalette as c } from "@/components/atoms/theme";
import { attributeCatalog, orderedAttributes } from "../catalog";
import type { AttributeCode } from "../domain";

export function AttributeChips({
  codes,
  selected,
  onToggle,
  disabled = false,
  compact = false
}: {
  codes: readonly AttributeCode[];
  selected?: readonly AttributeCode[];
  onToggle?: (code: AttributeCode) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const shown = onToggle ? codes : orderedAttributes([...codes]);
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
      {shown.map((code) => {
        const { label, icon: Icon } = attributeCatalog[code];
        const checked = selected?.includes(code) ?? false;
        const content = (
          <>
            <Icon size={compact ? 17 : 21} color={c.accent} strokeWidth={1.8} />
            <AppText
              variant={compact ? "caption" : "label"}
              style={{ flexShrink: 1 }}
            >
              {label}
            </AppText>
            {onToggle && checked && <Check size={16} color={c.accent} />}
          </>
        );
        const style = {
          flexDirection: "row" as const,
          alignItems: "center" as const,
          gap: 8,
          maxWidth: "100%" as const,
          paddingHorizontal: compact ? 12 : 15,
          paddingVertical: compact ? 8 : 11,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: onToggle && checked ? c.accent : "transparent",
          backgroundColor:
            onToggle && checked ? c.successSurface : c.surfaceLow,
          minHeight: onToggle ? 48 : undefined
        };
        return onToggle ? (
          <Pressable
            key={code}
            accessibilityRole="checkbox"
            accessibilityLabel={label}
            accessibilityState={{ checked, disabled }}
            disabled={disabled}
            onPress={() => onToggle(code)}
            style={[style, { opacity: disabled ? 0.5 : 1 }]}
          >
            {content}
          </Pressable>
        ) : (
          <View key={code} style={style}>
            {content}
          </View>
        );
      })}
    </View>
  );
}
