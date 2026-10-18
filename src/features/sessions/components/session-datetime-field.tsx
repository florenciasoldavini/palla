import type { ReactNode } from "react";
import { TextField } from "@/components/atoms";
export function SessionDateTimeField({
  label,
  mode,
  value,
  onChange,
  errorText,
  renderTrigger: _renderTrigger
}: {
  label: string;
  mode: "date" | "time";
  value: string;
  onChange: (value: string) => void;
  errorText?: string;
  renderTrigger?: (onPress: () => void, expanded: boolean) => ReactNode;
}) {
  return (
    <TextField
      label={label}
      value={value}
      onChangeText={onChange}
      errorText={errorText}
      helperText={mode === "date" ? "YYYY-MM-DD" : "HH:mm · Buenos Aires time"}
    />
  );
}
