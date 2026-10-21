import { FieldMessage } from "@/components/atoms/field-message";
import { FieldLabel } from "@/components/atoms/label";
import { atomSpacing } from "@/components/atoms/theme";
import { useId, type ReactNode } from "react";
import { View } from "react-native";

export function FormField({
  fieldId: providedFieldId,
  accessory,
  children,
  errorText,
  helperText,
  label,
  required = false
}: {
  fieldId?: string;
  accessory?: ReactNode;
  children: ReactNode;
  errorText?: string | null;
  helperText?: string | null;
  label?: ReactNode;
  required?: boolean;
}) {
  const generatedId = useId();
  const fieldId = providedFieldId ?? generatedId;
  return (
    <View
      role="group"
      aria-labelledby={label ? `${fieldId}-label` : undefined}
      aria-describedby={
        errorText || helperText ? `${fieldId}-message` : undefined
      }
      style={{ gap: atomSpacing[2] }}
    >
      {label ? (
        <FieldLabel
          nativeID={fieldId ? `${fieldId}-label` : undefined}
          accessory={accessory}
          required={required}
        >
          {label}
        </FieldLabel>
      ) : null}
      {children}
      {errorText ? (
        <FieldMessage
          nativeID={fieldId ? `${fieldId}-message` : undefined}
          tone="error"
        >
          {errorText}
        </FieldMessage>
      ) : null}
      {!errorText && helperText ? (
        <FieldMessage nativeID={fieldId ? `${fieldId}-message` : undefined}>
          {helperText}
        </FieldMessage>
      ) : null}
    </View>
  );
}
