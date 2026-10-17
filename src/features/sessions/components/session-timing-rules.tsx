import { AppText, TextField, SelectMenu } from "@/components/atoms";
import { View } from "react-native";
import { useState } from "react";
import { WizardCard, WizardToggle } from "./session-wizard-controls";
import type { SessionCreationSettings } from "../validation/session-settings";
export type TimingKey =
  | "registration_opens_minutes_before"
  | "registration_closes_minutes_before"
  | "cancellation_notice_minutes";
function TimingRule({
  label,
  offText,
  value,
  onChange,
  defaultValue
}: {
  label: string;
  offText: string;
  value: number | null;
  onChange: (v: number | null) => void;
  defaultValue: number;
}) {
  const initialUnit =
    value !== null && value % 1440 === 0
      ? 1440
      : value !== null && value % 60 === 0
        ? 60
        : 1;
  const [unit, setUnit] = useState(initialUnit);
  const [text, setText] = useState(
    value === null ? String(defaultValue / 60) : String(value / initialUnit)
  );
  const units = [
    { value: "1", label: "Minutes before" },
    { value: "60", label: "Hours before" },
    { value: "1440", label: "Days before" }
  ];
  return (
    <View style={{ gap: 12 }}>
      <WizardToggle
        label={label}
        value={value !== null}
        description={value === null ? offText : undefined}
        onChange={(enabled) => {
          if (enabled) {
            const nextUnit = defaultValue % 1440 === 0 ? 1440 : 60;
            setUnit(nextUnit);
            setText(String(defaultValue / nextUnit));
            onChange(defaultValue);
          } else onChange(null);
        }}
      />
      {value !== null && (
        <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
          <View style={{ flex: 1 }}>
            <TextField
              accessibilityLabel={`${label} amount`}
              placeholder="e.g. 2"
              keyboardType="number-pad"
              value={text}
              onChangeText={(v) => {
                setText(v);
                onChange(/^\d+$/.test(v) ? Number(v) * unit : NaN);
              }}
            />
          </View>
          <View style={{ flex: 1.6 }}>
            <SelectMenu
              accessibilityLabel={`${label} unit`}
              value={String(unit)}
              options={units}
              onChange={(v) => {
                setUnit(Number(v));
                onChange(/^\d+$/.test(text) ? Number(text) * Number(v) : NaN);
              }}
            />
          </View>
        </View>
      )}
    </View>
  );
}
export function SessionTimingRules({
  settings,
  onChange
}: {
  settings: SessionCreationSettings;
  onChange: (key: TimingKey, v: number | null) => void;
}) {
  return (
    <WizardCard>
      <TimingRule
        label="Schedule registration opening"
        value={settings.registration_opens_minutes_before}
        defaultValue={10080}
        offText="Opens when published."
        onChange={(v) => onChange("registration_opens_minutes_before", v)}
      />
      <TimingRule
        label="Registration deadline"
        value={settings.registration_closes_minutes_before}
        defaultValue={120}
        offText="Closes at session start."
        onChange={(v) => onChange("registration_closes_minutes_before", v)}
      />
      <TimingRule
        label="Player cancellation deadline"
        value={settings.cancellation_notice_minutes}
        defaultValue={360}
        offText="No advance cutoff. Players may cancel before the session starts."
        onChange={(v) => onChange("cancellation_notice_minutes", v)}
      />
      <AppText variant="bodySm" tone="subtle">
        Registration must open before it closes. Rules apply before each date.
      </AppText>
    </WizardCard>
  );
}
