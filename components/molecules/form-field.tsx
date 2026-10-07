import { FieldMessage } from "@/components/atoms/field-message";
import { FieldLabel } from "@/components/atoms/label";
import { atomSpacing } from "@/components/atoms/theme";
import type { ReactNode } from "react";
import { View } from "react-native";

export function FormField({
  accessory,
  children,
  errorText,
  helperText,
  label,
  required = false
}: {
  accessory?: ReactNode;
  children: ReactNode;
  errorText?: string | null;
  helperText?: string | null;
  label?: ReactNode;
  required?: boolean;
}) {
  return (
    <View style={{ gap: atomSpacing[2] }}>
      {label ? (
        <FieldLabel accessory={accessory} required={required}>
          {label}
        </FieldLabel>
      ) : null}
      {children}
      {errorText ? <FieldMessage tone="error">{errorText}</FieldMessage> : null}
      {!errorText && helperText ? (
        <FieldMessage>{helperText}</FieldMessage>
      ) : null}
    </View>
  );
}
