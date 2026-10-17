import { AppText, AppHeading, TextField } from "@/components/atoms";
import { atomPalette as c } from "@/components/atoms/theme";
import { Check, Minus, Plus, type LucideIcon } from "lucide-react-native";
import {
  Pressable,
  Switch,
  View,
  useWindowDimensions,
  type ViewStyle
} from "react-native";
import type { ReactNode } from "react";

export function WizardCard({
  children,
  style
}: {
  children: ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View
      style={[
        {
          backgroundColor: c.surface,
          borderColor: c.borderSubtle,
          borderWidth: 1,
          borderRadius: 16,
          padding: 20,
          gap: 16
        },
        style
      ]}
    >
      {children}
    </View>
  );
}
export function WizardSection({
  children,
  title,
  icon: Icon
}: {
  children: ReactNode;
  title: string;
  icon?: LucideIcon;
}) {
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {Icon && <Icon size={20} color={c.accent} />}
        <AppHeading variant="card">{title}</AppHeading>
      </View>
      {children}
    </View>
  );
}
export function WizardChoice({
  label,
  description,
  selected,
  onPress,
  disabled = false,
  compact = false,
  icon: Icon
}: {
  label: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  compact?: boolean;
  icon?: LucideIcon;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={{
        flex: compact ? 1 : undefined,
        minHeight: 48,
        padding: compact ? 12 : 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: selected ? c.accent : c.borderSubtle,
        backgroundColor: selected ? `${c.brand}26` : c.surface,
        opacity: disabled ? 0.5 : 1,
        gap: 6
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {Icon ? (
          <Icon size={20} color={c.accent} accessible={false} />
        ) : (
          selected && <Check size={16} color={c.accent} />
        )}
        <AppText variant="label" style={{ flex: 1 }}>
          {label}
        </AppText>
        {Icon && selected && (
          <Check size={16} color={c.accent} accessible={false} />
        )}
      </View>
      {description && (
        <AppText variant="bodySm" tone="subtle">
          {description}
        </AppText>
      )}
    </Pressable>
  );
}
export function WizardToggle({
  label,
  description,
  value,
  onChange,
  disabled = false
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View style={{ flex: 1, gap: 4 }}>
        <AppText variant="label">{label}</AppText>
        {description && (
          <AppText variant="bodySm" tone="subtle">
            {description}
          </AppText>
        )}
      </View>
      <Switch
        accessibilityLabel={label}
        disabled={disabled}
        value={value}
        onValueChange={onChange}
        trackColor={{ false: c.borderSubtle, true: c.brand }}
        thumbColor={c.surface}
      />
    </View>
  );
}
export function WizardStepper({
  label,
  value,
  onChange,
  errorText
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  errorText?: string;
}) {
  const count = Number(value);
  return (
    <View style={{ gap: 8 }}>
      <AppText variant="formLabel">{label}</AppText>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label.toLowerCase()}`}
          accessibilityState={{ disabled: count <= 1 }}
          disabled={count <= 1}
          onPress={() => onChange(String(Math.max(1, count - 1)))}
          style={{
            minWidth: 48,
            minHeight: 48,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 12,
            backgroundColor: c.surfaceLow
          }}
        >
          <Minus size={18} color={c.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <TextField
            accessibilityLabel={label}
            placeholder="e.g. 8"
            appearance="soft"
            size="md"
            value={value}
            onChangeText={onChange}
            keyboardType="number-pad"
            errorText={errorText}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label.toLowerCase()}`}
          accessibilityState={{ disabled: count >= 32767 }}
          disabled={count >= 32767}
          onPress={() =>
            onChange(
              String(Math.min(32767, (Number.isFinite(count) ? count : 0) + 1))
            )
          }
          style={{
            minWidth: 48,
            minHeight: 48,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 12,
            backgroundColor: c.surfaceLow
          }}
        >
          <Plus size={18} color={c.text} />
        </Pressable>
      </View>
    </View>
  );
}
export function WizardOptions({ children }: { children: ReactNode }) {
  const { fontScale } = useWindowDimensions();
  return (
    <View
      style={{ flexDirection: fontScale > 1.25 ? "column" : "row", gap: 8 }}
    >
      {children}
    </View>
  );
}
