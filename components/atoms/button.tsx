import {
  atomControlHeights,
  atomControlRadius,
  atomPalette,
  atomRadii,
  atomTypeScale
} from "@/components/atoms/theme";
import { atomMotion } from "@/components/atoms/motion";
import {
  appIconSizes,
  type AppIconComponent,
  type AppIconSize
} from "@/components/icons";
import { Button, ButtonSpinner, ButtonText } from "@/components/ui/button";
import { getSansFontStyle } from "@/theme/fonts";
import { useEffect } from "react";
import type { ReactNode } from "react";
import {
  Image,
  Platform,
  StyleSheet,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from "react-native-reanimated";

type ButtonBaseColor = "accent" | "danger" | "neutral";
export type ButtonColor = ButtonBaseColor | "success" | "warning";
export type ButtonVariant = "solid" | "bordered" | "ghost";
export type ButtonSize = "sm" | "md" | "lg" | "iconLg";
export type ButtonLayout = "default" | "icon";
export type ButtonShape = "default" | "pill";

const sizeMap = {
  sm: {
    button: "md" as const,
    height: atomControlHeights.sm,
    iconSize: "sm" as AppIconSize,
    imageVisualSize: 18,
    radius: atomRadii.md,
    textToken: atomTypeScale.buttonSm
  },
  md: {
    button: "lg" as const,
    height: atomControlHeights.md,
    iconSize: "sm" as AppIconSize,
    imageVisualSize: 18,
    radius: atomRadii.lg,
    textToken: atomTypeScale.buttonMd
  },
  lg: {
    button: "xl" as const,
    height: atomControlHeights.lg,
    iconSize: "md" as AppIconSize,
    imageVisualSize: 20,
    radius: atomControlRadius,
    textToken: atomTypeScale.buttonLg
  },
  iconLg: {
    button: "xl" as const,
    height: atomControlHeights.iconLg,
    iconSize: "lg" as AppIconSize,
    imageVisualSize: 22,
    radius: atomControlRadius,
    textToken: atomTypeScale.buttonLg
  }
};

const colorConfig: Record<
  ButtonColor,
  {
    action: "default" | "negative" | "primary" | "secondary";
    borderedClassName: string;
    borderedIconColor: string;
    borderedTextColor: string;
    ghostClassName: string;
    ghostIconColor: string;
    ghostTextColor: string;
    solidClassName: string;
    solidIconColor: string;
    solidTextColor: string;
  }
> = {
  accent: {
    action: "primary",
    borderedClassName:
      "bg-white border-primary-500 data-[hover=true]:bg-primary-50 data-[hover=true]:border-primary-600 data-[active=true]:bg-primary-100 data-[active=true]:border-primary-700",
    borderedIconColor: atomPalette.accent,
    borderedTextColor: atomPalette.accent,
    ghostClassName:
      "bg-transparent border-transparent data-[hover=true]:bg-primary-50 data-[active=true]:bg-primary-100",
    ghostIconColor: atomPalette.accent,
    ghostTextColor: atomPalette.accent,
    solidClassName:
      "bg-primary-500 border-primary-500 data-[hover=true]:bg-primary-600 data-[hover=true]:border-primary-600 data-[active=true]:bg-primary-700 data-[active=true]:border-primary-700",
    solidIconColor: atomPalette.accentText,
    solidTextColor: atomPalette.accentText
  },
  danger: {
    action: "negative",
    borderedClassName:
      "bg-error-50 border-error-700 data-[hover=true]:bg-error-100 data-[hover=true]:border-error-700 data-[active=true]:bg-error-100 data-[active=true]:border-error-800",
    borderedIconColor: atomPalette.errorText,
    borderedTextColor: atomPalette.errorText,
    ghostClassName:
      "bg-transparent border-transparent data-[hover=true]:bg-error-50 data-[active=true]:bg-error-100",
    ghostIconColor: atomPalette.errorText,
    ghostTextColor: atomPalette.errorText,
    solidClassName:
      "bg-error-600 border-error-600 data-[hover=true]:bg-error-700 data-[hover=true]:border-error-700 data-[active=true]:bg-error-800 data-[active=true]:border-error-800",
    solidIconColor: atomPalette.accentText,
    solidTextColor: atomPalette.accentText
  },
  neutral: {
    action: "secondary",
    borderedClassName:
      "bg-white border-outline-300 data-[hover=true]:bg-background-50 data-[hover=true]:border-outline-400 data-[active=true]:bg-background-100",
    borderedIconColor: atomPalette.text,
    borderedTextColor: atomPalette.text,
    ghostClassName:
      "bg-transparent border-transparent data-[hover=true]:bg-background-50 data-[active=true]:bg-background-100",
    ghostIconColor: atomPalette.text,
    ghostTextColor: atomPalette.text,
    solidClassName:
      "bg-typography-800 border-typography-800 data-[hover=true]:bg-typography-700 data-[hover=true]:border-typography-700 data-[active=true]:bg-typography-900 data-[active=true]:border-typography-900",
    solidIconColor: atomPalette.accentText,
    solidTextColor: atomPalette.accentText
  },
  success: {
    action: "default",
    borderedClassName:
      "bg-white border-success-500 data-[hover=true]:bg-success-50 data-[hover=true]:border-success-600 data-[active=true]:bg-success-100 data-[active=true]:border-success-700",
    borderedIconColor: atomPalette.successText,
    borderedTextColor: atomPalette.successText,
    ghostClassName:
      "bg-transparent border-transparent data-[hover=true]:bg-success-50 data-[active=true]:bg-success-100",
    ghostIconColor: atomPalette.successText,
    ghostTextColor: atomPalette.successText,
    solidClassName:
      "bg-success-700 border-success-700 data-[hover=true]:bg-success-800 data-[hover=true]:border-success-800 data-[active=true]:bg-success-900 data-[active=true]:border-success-900",
    solidIconColor: atomPalette.accentText,
    solidTextColor: atomPalette.accentText
  },
  warning: {
    action: "default",
    borderedClassName:
      "bg-white border-warning-500 data-[hover=true]:bg-warning-50 data-[hover=true]:border-warning-600 data-[active=true]:bg-warning-100 data-[active=true]:border-warning-700",
    borderedIconColor: atomPalette.warningText,
    borderedTextColor: atomPalette.warningText,
    ghostClassName:
      "bg-transparent border-transparent data-[hover=true]:bg-warning-50 data-[active=true]:bg-warning-100",
    ghostIconColor: atomPalette.warningText,
    ghostTextColor: atomPalette.warningText,
    solidClassName:
      "bg-warning-700 border-warning-700 data-[hover=true]:bg-warning-800 data-[hover=true]:border-warning-800 data-[active=true]:bg-warning-900 data-[active=true]:border-warning-900",
    solidIconColor: atomPalette.accentText,
    solidTextColor: atomPalette.accentText
  }
};

const disabledVisualStyle = {
  backgroundColor: atomPalette.surfaceStrong,
  borderColor: atomPalette.borderStrong,
  iconColor: atomPalette.textMuted,
  opacity: 0.72,
  textColor: atomPalette.textMuted
} as const;

const AnimatedButton = Animated.createAnimatedComponent(Button);

export function AppButton({
  children,
  color = "accent",
  fullWidth = true,
  icon,
  iconAfter = true,
  imageSource,
  isDisabled = false,
  layout = "default",
  loading = false,
  onDisabledPress,
  onLongPress,
  onPress,
  onPressIn,
  onPressOut,
  shape = "default",
  size = "lg",
  style,
  variant = "solid",
  ...props
}: Omit<React.ComponentProps<typeof Button>, "action" | "size" | "variant"> & {
  children?: ReactNode;
  color?: ButtonColor;
  fullWidth?: boolean;
  icon?: AppIconComponent;
  iconAfter?: boolean;
  imageSource?: ImageSourcePropType;
  layout?: ButtonLayout;
  loading?: boolean;
  onDisabledPress?: () => void;
  shape?: ButtonShape;
  size?: ButtonSize;
  style?: StyleProp<ViewStyle>;
  variant?: ButtonVariant;
}) {
  const pressScale = useSharedValue(1);
  const sizeConfig = sizeMap[size];
  const config = getButtonVisualConfig(color, variant);
  const isVisuallyDisabled = Boolean(isDisabled || loading);
  const isInteractionDisabled = Boolean(
    loading || (isDisabled && !onDisabledPress)
  );
  const buttonWidth =
    layout === "icon" ? sizeConfig.height : fullWidth ? "100%" : undefined;
  const resolvedTextColor = isVisuallyDisabled
    ? disabledVisualStyle.textColor
    : config.textColor;
  const resolvedIconColor = isVisuallyDisabled
    ? disabledVisualStyle.iconColor
    : config.iconColor;
  const Icon = icon;
  const iconPixelSize = appIconSizes[sizeConfig.iconSize];
  const buttonTextStyle = {
    color: resolvedTextColor,
    fontSize: sizeConfig.textToken.fontSize,
    letterSpacing: sizeConfig.textToken.letterSpacing,
    lineHeight: sizeConfig.textToken.lineHeight,
    textTransform: sizeConfig.textToken.textTransform,
    ...getSansFontStyle(sizeConfig.textToken.fontWeight)
  };
  const webCursorStyle =
    Platform.OS === "web"
      ? ({
          cursor: isVisuallyDisabled ? "not-allowed" : "pointer"
        } as ViewStyle)
      : null;
  const animatedPressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressScale.value }]
  }));

  useEffect(() => {
    if (isInteractionDisabled) {
      pressScale.value = withTiming(1, {
        duration: atomMotion.duration.pressOut,
        easing: atomMotion.easing.measured
      });
    }
  }, [isInteractionDisabled, pressScale]);

  return (
    <AnimatedButton
      action={config.action}
      className={config.className}
      isDisabled={isInteractionDisabled}
      onLongPress={isInteractionDisabled ? undefined : onLongPress}
      onPress={(event) => {
        if (loading) {
          return;
        }

        if (isDisabled) {
          onDisabledPress?.();
          return;
        }

        onPress?.(event);
      }}
      onPressIn={
        isInteractionDisabled
          ? undefined
          : (event) => {
              pressScale.value = withTiming(atomMotion.scale.buttonPressed, {
                duration: atomMotion.duration.pressIn,
                easing: atomMotion.easing.measured
              });
              onPressIn?.(event);
            }
      }
      onPressOut={
        isInteractionDisabled
          ? undefined
          : (event) => {
              pressScale.value = withTiming(1, {
                duration: atomMotion.duration.pressOut,
                easing: atomMotion.easing.measured
              });
              onPressOut?.(event);
            }
      }
      size={sizeConfig.button}
      style={[
        StyleSheet.flatten([
          {
            borderRadius: shape === "pill" ? atomRadii.full : sizeConfig.radius,
            minHeight: sizeConfig.height,
            paddingHorizontal: layout === "icon" ? 0 : undefined,
            width: buttonWidth
          },
          isVisuallyDisabled
            ? {
                backgroundColor: disabledVisualStyle.backgroundColor,
                borderColor: disabledVisualStyle.borderColor,
                opacity: disabledVisualStyle.opacity
              }
            : null,
          webCursorStyle,
          style
        ]),
        animatedPressStyle
      ]}
      variant={config.buttonVariant}
      {...props}
    >
      {imageSource && !loading ? (
        <Image
          source={imageSource}
          style={{
            height: sizeConfig.imageVisualSize,
            resizeMode: "contain",
            width: sizeConfig.imageVisualSize
          }}
        />
      ) : null}
      {Icon && !iconAfter && !imageSource && !loading ? (
        <Icon color={resolvedIconColor} size={iconPixelSize} />
      ) : null}
      {children && layout !== "icon" ? (
        <ButtonText style={buttonTextStyle}>{children}</ButtonText>
      ) : null}
      {loading ? <ButtonSpinner color={resolvedTextColor} /> : null}
      {Icon && iconAfter && !imageSource && !loading ? (
        <Icon color={resolvedIconColor} size={iconPixelSize} />
      ) : null}
    </AnimatedButton>
  );
}

function getButtonVisualConfig(color: ButtonColor, variant: ButtonVariant) {
  const config = colorConfig[color];

  if (variant === "solid") {
    return {
      action: config.action,
      buttonVariant: "solid" as const,
      className: config.solidClassName,
      iconColor: config.solidIconColor,
      textColor: config.solidTextColor
    };
  }

  if (variant === "bordered") {
    return {
      action: config.action,
      buttonVariant: "outline" as const,
      className: config.borderedClassName,
      iconColor: config.borderedIconColor,
      textColor: config.borderedTextColor
    };
  }

  return {
    action: config.action,
    buttonVariant: "outline" as const,
    className: config.ghostClassName,
    iconColor: config.ghostIconColor,
    textColor: config.ghostTextColor
  };
}
