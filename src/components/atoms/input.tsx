import {
  atomControlHeights,
  atomControlRadius,
  atomPalette,
  atomSpacing,
  atomTypeScale
} from "@/components/atoms/theme";
import { atomMotion } from "@/components/atoms/motion";
import { FormField } from "@/components/molecules";
import {
  ClosedEyeIcon,
  OpenEyeIcon,
  appIconSizes,
  type AppIconComponent,
  type AppIconSize
} from "@/components/icons";
import {
  Input,
  InputSlot,
  InputField as UIInputField
} from "@/components/ui/input";
import { getSansFontStyle } from "@/theme/fonts";
import {
  createElement,
  type ChangeEvent,
  type ClipboardEvent,
  type ComponentRef,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode
} from "react";
import { useEffect, useId, useRef, useState } from "react";
import {
  Platform,
  StyleSheet,
  Pressable,
  Text,
  View,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type TextInputFocusEventData,
  type TextStyle,
  type StyleProp,
  type ViewStyle
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from "react-native-reanimated";

type FieldSize = "sm" | "md" | "lg";
type TextFieldProps = Omit<
  React.ComponentProps<typeof UIInputField>,
  "size"
> & {
  inputStyle?: StyleProp<TextStyle>;
  appearance?: "default" | "soft";
  accessory?: ReactNode;
  errorText?: string | null;
  helperText?: string | null;
  label?: ReactNode;
  leftIcon?: AppIconComponent;
  required?: boolean;
  rightSlot?: ReactNode;
  size?: FieldSize;
  truncate?: boolean;
};

type FocusableInputRef = ComponentRef<typeof UIInputField> & {
  focus?: () => void;
};

const sizeMap = {
  sm: {
    iconSize: "sm" as AppIconSize,
    input: "lg" as const,
    minHeight: atomControlHeights.sm,
    radius: atomControlRadius
  },
  md: {
    iconSize: "md" as AppIconSize,
    input: "xl" as const,
    minHeight: atomControlHeights.md,
    radius: atomControlRadius
  },
  lg: {
    iconSize: "md" as AppIconSize,
    input: "xl" as const,
    minHeight: atomControlHeights.lg,
    radius: atomControlRadius
  }
};

export function TextField({
  appearance = "default",
  accessory,
  editable = true,
  errorText,
  helperText,
  inputStyle,
  label,
  leftIcon,
  multiline,
  numberOfLines,
  onBlur,
  onFocus,
  onPressIn,
  required = false,
  rightSlot,
  size = "lg",
  truncate = false,
  ...props
}: TextFieldProps) {
  const { fontScale } = useWindowDimensions();
  const isMultiline = Boolean(multiline) && !truncate;
  const fieldId = useId();
  const config = sizeMap[size];
  const iconPixelSize = appIconSizes[config.iconSize];
  const inputRef = useRef<FocusableInputRef>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isEditingTruncated, setIsEditingTruncated] = useState(false);
  const focusGlow = useSharedValue(0);
  const isDisabled = editable === false;
  const borderColor = getFieldBorderColor({
    errorText,
    isDisabled,
    isFocused,
    isHovered
  });
  const iconColor = getFieldIconColor({
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
  const truncateStyle = truncate
    ? ({
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap"
      } as unknown as TextStyle)
    : null;
  const inputPaddingHorizontal =
    leftIcon || rightSlot ? atomSpacing[3] : atomSpacing[4];
  const inputTextStyle = {
    color: atomPalette.text,
    fontSize: Math.max(16, atomTypeScale.bodyMd.fontSize),
    letterSpacing: 0,
    ...(Platform.OS === "web"
      ? { lineHeight: atomTypeScale.bodyMd.lineHeight }
      : null),
    ...getSansFontStyle(atomTypeScale.bodyMd.fontWeight)
  } satisfies TextStyle;
  const displayValue =
    typeof props.value === "string"
      ? props.value
      : typeof props.defaultValue === "string"
        ? props.defaultValue
        : "";
  const shouldRenderTruncatedText =
    truncate && !isFocused && !isEditingTruncated && displayValue.length > 0;
  const focusGlowStyle = useAnimatedStyle(() => ({
    opacity: focusGlow.value,
    transform: [{ scale: 1 + focusGlow.value * atomMotion.scale.focusGlow }]
  }));

  useEffect(() => {
    if (!isEditingTruncated || isDisabled) {
      return;
    }

    inputRef.current?.focus?.();
  }, [isDisabled, isEditingTruncated]);

  useEffect(() => {
    focusGlow.value = withTiming(isFocused && !isDisabled ? 1 : 0, {
      duration: atomMotion.duration.focus,
      easing: atomMotion.easing.measured
    });
  }, [focusGlow, isDisabled, isFocused]);

  return (
    <FormField
      fieldId={fieldId}
      accessory={accessory}
      errorText={errorText}
      helperText={helperText}
      label={label}
      required={required}
    >
      <View style={{ position: "relative" }}>
        <Animated.View
          pointerEvents="none"
          style={[
            {
              backgroundColor: `${atomPalette.focus}08`,
              borderColor: `${atomPalette.focus}55`,
              borderRadius: config.radius + 2,
              borderWidth: 1,
              bottom: -2,
              left: -2,
              position: "absolute",
              right: -2,
              top: -2
            },
            focusGlowStyle
          ]}
        />
        <Input
          isInvalid={Boolean(errorText)}
          onPointerEnter={() => {
            setIsHovered(true);
          }}
          onPointerLeave={() => {
            setIsHovered(false);
          }}
          size={config.input}
          style={{
            alignItems: "center",
            backgroundColor: isDisabled
              ? atomPalette.surfaceLow
              : appearance === "soft"
                ? atomPalette.background
                : atomPalette.surface,
            borderColor,
            borderRadius: appearance === "soft" ? 12 : config.radius,
            borderWidth: 1,
            flexDirection: "row",

            minHeight: Math.max(
              config.minHeight,
              24 * fontScale + atomSpacing[6]
            ),
            overflow: "hidden",
            ...webRootCursorStyle
          }}
        >
          {leftIcon ? (
            <InputSlot
              style={{
                alignItems: "center",

                justifyContent: "center",
                minWidth: atomSpacing[10],
                paddingLeft: atomSpacing[4]
              }}
            >
              {(() => {
                const Icon = leftIcon;

                return <Icon color={iconColor} size={iconPixelSize} />;
              })()}
            </InputSlot>
          ) : null}
          {shouldRenderTruncatedText ? (
            <Pressable
              disabled={!editable}
              onPressIn={(event) => {
                setIsEditingTruncated(true);
                onPressIn?.(event);
              }}
              style={{
                flex: 1,

                justifyContent: "center",
                paddingHorizontal: inputPaddingHorizontal,
                ...webRootCursorStyle
              }}
            >
              <Text
                ellipsizeMode="tail"
                numberOfLines={1}
                style={{
                  ...inputTextStyle,
                  color: displayValue
                    ? atomPalette.text
                    : atomPalette.textPlaceholder
                }}
              >
                {displayValue || props.placeholder}
              </Text>
            </Pressable>
          ) : (
            <UIInputField
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
              ref={inputRef}
              className="placeholder:text-typography-400"
              editable={editable}
              multiline={truncate ? false : multiline}
              numberOfLines={truncate ? 1 : numberOfLines}
              onBlur={(
                event: NativeSyntheticEvent<TextInputFocusEventData>
              ) => {
                setIsFocused(false);
                setIsEditingTruncated(false);
                onBlur?.(event);
              }}
              onFocus={(
                event: NativeSyntheticEvent<TextInputFocusEventData>
              ) => {
                setIsFocused(true);
                onFocus?.(event);
              }}
              placeholderTextColor={atomPalette.textPlaceholder}
              style={{
                ...inputTextStyle,
                flex: 1,
                paddingHorizontal: inputPaddingHorizontal,
                paddingVertical: isMultiline ? atomSpacing[3] : 0,
                ...(isMultiline
                  ? { textAlignVertical: "top" as const }
                  : Platform.OS === "android"
                    ? { textAlignVertical: "center" as const }
                    : null),
                ...truncateStyle,
                ...webInputCursorStyle,
                ...StyleSheet.flatten(inputStyle)
              }}
              {...props}
              onPressIn={onPressIn}
            />
          )}
          {rightSlot ? (
            <InputSlot
              style={{
                alignItems: "center",

                justifyContent: "center",
                paddingRight: atomSpacing[3]
              }}
            >
              {rightSlot}
            </InputSlot>
          ) : null}
        </Input>
      </View>
    </FormField>
  );
}

export function NumericField({
  accessory,
  editable = true,
  errorText,
  helperText,
  label,
  leftIcon,
  max,
  min,
  onChangeNumber,
  placeholder,
  required = false,
  rightSlot,
  size = "lg",
  value,
  ...props
}: Omit<
  TextFieldProps,
  "defaultValue" | "inputMode" | "keyboardType" | "onChangeText" | "value"
> & {
  max?: number;
  min?: number;
  onChangeNumber: (value: number) => void;
  value: number;
}) {
  if (Platform.OS === "web") {
    return (
      <WebNumericField
        accessory={accessory}
        editable={editable}
        errorText={errorText}
        helperText={helperText}
        label={label}
        leftIcon={leftIcon}
        max={max}
        min={min}
        onChangeNumber={onChangeNumber}
        placeholder={placeholder}
        required={required}
        rightSlot={rightSlot}
        size={size}
        value={value}
      />
    );
  }

  return (
    <TextField
      {...props}
      inputMode="numeric"
      keyboardType="numeric"
      placeholder={placeholder}
      onChangeText={(text) => {
        if (text === "") {
          onChangeNumber(getNumericFallback(min));
          return;
        }

        if (!/^\d+$/.test(text)) {
          return;
        }

        const numericValue = Number(text);

        if (
          (typeof min === "number" && numericValue < min) ||
          (typeof max === "number" && numericValue > max)
        ) {
          return;
        }

        onChangeNumber(numericValue);
      }}
      accessory={accessory}
      editable={editable}
      errorText={errorText}
      helperText={helperText}
      label={label}
      leftIcon={leftIcon}
      required={required}
      rightSlot={rightSlot}
      size={size}
      value={String(value)}
    />
  );
}

function WebNumericField({
  accessory,
  editable,
  errorText,
  helperText,
  label,
  leftIcon,
  max,
  min,
  onChangeNumber,
  placeholder,
  required,
  rightSlot,
  size,
  value
}: Pick<
  TextFieldProps,
  | "accessory"
  | "editable"
  | "errorText"
  | "helperText"
  | "label"
  | "leftIcon"
  | "placeholder"
  | "required"
  | "rightSlot"
  | "size"
> & {
  max?: number;
  min?: number;
  onChangeNumber: (value: number) => void;
  value: number;
}) {
  const { fontScale } = useWindowDimensions();
  const fieldId = useId();
  const config = sizeMap[size ?? "lg"];
  const iconPixelSize = appIconSizes[config.iconSize];
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const isDisabled = editable === false;
  const borderColor = getFieldBorderColor({
    errorText,
    isDisabled,
    isFocused,
    isHovered
  });
  const iconColor = getFieldIconColor({
    errorText,
    isDisabled,
    isFocused,
    isHovered
  });
  const inputPaddingHorizontal =
    leftIcon || rightSlot ? atomSpacing[3] : atomSpacing[4];
  const webFontStyle = getSansFontStyle(
    atomTypeScale.bodyMd.fontWeight
  ) as CSSProperties;
  const inputStyle: CSSProperties = {
    appearance: "textfield",
    backgroundColor: "transparent",
    border: 0,
    color: String(atomPalette.text),
    cursor: isDisabled ? "not-allowed" : "text",
    flex: 1,
    fontSize: Math.max(16, atomTypeScale.bodyMd.fontSize),
    minHeight: Number(config.minHeight),
    letterSpacing: 0,
    lineHeight: `${atomTypeScale.bodyMd.lineHeight}px`,
    minWidth: 0,
    outline: "none",
    padding: `0 ${Number(inputPaddingHorizontal)}px`,
    width: "100%",
    ...webFontStyle
  };

  return (
    <FormField
      fieldId={fieldId}
      accessory={accessory}
      errorText={errorText}
      helperText={helperText}
      label={label}
      required={required}
    >
      <Input
        isInvalid={Boolean(errorText)}
        onPointerEnter={() => {
          setIsHovered(true);
        }}
        onPointerLeave={() => {
          setIsHovered(false);
        }}
        size={config.input}
        style={
          {
            backgroundColor: isDisabled
              ? atomPalette.surfaceLow
              : atomPalette.surface,
            borderColor,
            borderRadius: config.radius,
            cursor: isDisabled ? "not-allowed" : "text",

            minHeight: Math.max(
              config.minHeight,
              24 * fontScale + atomSpacing[6]
            )
          } as unknown as ViewStyle
        }
      >
        {leftIcon ? (
          <InputSlot
            style={{
              minWidth: atomSpacing[10],
              paddingLeft: atomSpacing[4]
            }}
          >
            {(() => {
              const Icon = leftIcon;

              return <Icon color={iconColor} size={iconPixelSize} />;
            })()}
          </InputSlot>
        ) : null}
        {createElement("input", {
          id: fieldId,
          "aria-labelledby": label ? `${fieldId}-label` : undefined,
          "aria-describedby":
            errorText || helperText ? `${fieldId}-message` : undefined,
          "aria-invalid": Boolean(errorText),
          required,
          disabled: isDisabled,
          inputMode: "numeric",
          max,
          min,
          onBlur: () => {
            setIsFocused(false);
          },
          onChange: (event: ChangeEvent<HTMLInputElement>) => {
            const nextValue = event.currentTarget.value;

            if (nextValue === "") {
              onChangeNumber(getNumericFallback(min));
              return;
            }

            if (!/^\d+$/.test(nextValue)) {
              return;
            }

            const numericValue = Number(nextValue);

            if (
              (typeof min === "number" && numericValue < min) ||
              (typeof max === "number" && numericValue > max)
            ) {
              return;
            }

            onChangeNumber(numericValue);
          },
          onFocus: () => {
            setIsFocused(true);
          },
          onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => {
            if (event.metaKey || event.ctrlKey || event.altKey) {
              return;
            }

            const allowedKeys = new Set([
              "ArrowDown",
              "ArrowLeft",
              "ArrowRight",
              "ArrowUp",
              "Backspace",
              "Delete",
              "End",
              "Enter",
              "Home",
              "Tab"
            ]);

            if (!allowedKeys.has(event.key) && !/^\d$/.test(event.key)) {
              event.preventDefault();
            }
          },
          onPaste: (event: ClipboardEvent<HTMLInputElement>) => {
            const pastedText = event.clipboardData.getData("text");

            if (!/^\d*$/.test(pastedText)) {
              event.preventDefault();
            }
          },
          placeholder,
          style: inputStyle,
          type: "number",
          value: String(value)
        })}
        {rightSlot ? (
          <InputSlot style={{ paddingRight: atomSpacing[4] }}>
            {rightSlot}
          </InputSlot>
        ) : null}
      </Input>
    </FormField>
  );
}

function getNumericFallback(min?: number) {
  return typeof min === "number" && min > 0 ? min : 0;
}

export function PasswordVisibilityToggle({
  onPress,
  visible
}: {
  onPress: () => void;
  visible: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={visible ? "Hide password" : "Show password"}
      accessibilityRole="button"
      onPress={onPress}
      style={
        Platform.OS === "web"
          ? ({
              cursor: "pointer",
              minWidth: 48,
              minHeight: 48,
              alignItems: "center",
              justifyContent: "center"
            } as ViewStyle)
          : {
              minWidth: 48,
              minHeight: 48,
              alignItems: "center",
              justifyContent: "center"
            }
      }
    >
      {visible ? (
        <ClosedEyeIcon color={atomPalette.accent} size="sm" />
      ) : (
        <OpenEyeIcon color={atomPalette.accent} size="sm" />
      )}
    </Pressable>
  );
}

function getFieldBorderColor({
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

function getFieldIconColor({
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
    return atomPalette.textSubtle;
  }

  if (errorText) {
    return atomPalette.error;
  }

  if (isFocused) {
    return atomPalette.focus;
  }

  if (isHovered) {
    return atomPalette.textMuted;
  }

  return atomPalette.textSubtle;
}
