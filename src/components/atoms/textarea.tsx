import {
  atomControlHeights,
  atomControlRadius,
  atomPalette,
  atomSpacing,
  atomTypeScale
} from "@/components/atoms/theme";
import { FormField } from "@/components/molecules";
import {
  Textarea,
  TextareaInput as UITextareaInput
} from "@/components/ui/textarea";
import { getSansFontStyle } from "@/theme/fonts";
import type { ReactNode } from "react";
import { useId, useState } from "react";
import { Platform, type TextStyle, type ViewStyle } from "react-native";

const textAreaHeight = atomControlHeights.lg * 2 + atomSpacing[6];

export function TextAreaField({
  appearance = "default",
  accessory,
  editable = true,
  errorText,
  helperText,
  label,
  onBlur,
  onFocus,
  required = false,
  ...props
}: React.ComponentProps<typeof UITextareaInput> & {
  appearance?: "default" | "soft";
  accessory?: ReactNode;
  errorText?: string | null;
  helperText?: string | null;
  label?: ReactNode;
  required?: boolean;
}) {
  const fieldId = useId();
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const isDisabled = editable === false;
  const borderColor = getTextAreaBorderColor({
    errorText,
    isDisabled,
    isFocused,
    isHovered
  });
  const webRootCursorStyle =
    Platform.OS === "web"
      ? ({
          cursor: isDisabled ? "not-allowed" : "text"
        } as unknown as ViewStyle)
      : null;
  const webInputCursorStyle =
    Platform.OS === "web"
      ? ({
          cursor: isDisabled ? "not-allowed" : "text"
        } as unknown as TextStyle)
      : null;

  return (
    <FormField
      fieldId={fieldId}
      accessory={accessory}
      errorText={errorText}
      helperText={helperText}
      label={label}
      required={required}
    >
      <Textarea
        isInvalid={Boolean(errorText)}
        onPointerEnter={() => {
          setIsHovered(true);
        }}
        onPointerLeave={() => {
          setIsHovered(false);
        }}
        size="md"
        style={{
          backgroundColor: isDisabled
            ? atomPalette.surfaceLow
            : appearance === "soft"
              ? atomPalette.background
              : atomPalette.surface,
          borderColor,
          borderWidth: 1,
          borderRadius: atomControlRadius,

          minHeight: textAreaHeight,
          ...webRootCursorStyle
        }}
      >
        <UITextareaInput
          nativeID={fieldId}
          accessibilityHint={errorText || helperText || undefined}
          accessibilityLabel={
            typeof label === "string" ? label : props.accessibilityLabel
          }
          aria-label={
            typeof label === "string" ? label : props.accessibilityLabel
          }
          aria-labelledby={label ? `${fieldId}-label` : undefined}
          aria-describedby={
            errorText || helperText ? `${fieldId}-message` : undefined
          }
          aria-invalid={Boolean(errorText)}
          aria-required={required}
          editable={editable}
          onBlur={(event) => {
            setIsFocused(false);
            onBlur?.(event);
          }}
          onFocus={(event) => {
            setIsFocused(true);
            onFocus?.(event);
          }}
          placeholderTextColor={atomPalette.textPlaceholder}
          style={{
            color: atomPalette.text,
            fontSize: Math.max(16, atomTypeScale.bodyMd.fontSize),

            lineHeight: atomTypeScale.bodyMd.lineHeight,
            minHeight: textAreaHeight,
            paddingHorizontal: atomSpacing[4],
            paddingVertical: atomSpacing[3],
            textAlignVertical: "top",
            ...webInputCursorStyle,
            ...getSansFontStyle(atomTypeScale.bodyMd.fontWeight)
          }}
          {...props}
        />
      </Textarea>
    </FormField>
  );
}

function getTextAreaBorderColor({
  errorText,
  isDisabled,
  isFocused,
  isHovered
}: {
  errorText?: string | null;
  isDisabled: boolean;
  isFocused: boolean;
  isHovered: boolean;
}) {
  if (isDisabled) {
    return atomPalette.borderSubtle;
  }

  if (errorText) {
    return isHovered ? atomPalette.errorText : atomPalette.error;
  }

  if (isFocused) {
    return atomPalette.focus;
  }

  if (isHovered) {
    return atomPalette.border;
  }

  return atomPalette.borderSubtle;
}
