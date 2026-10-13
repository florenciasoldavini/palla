import {
  atomControlHeights,
  atomControlRadius,
  atomPalette,
  atomRadii,
  atomSpacing,
  atomTypeScale
} from "@/components/atoms/theme";
import { atomMotion } from "@/components/atoms/motion";
import {
  appIconSizes,
  type AppIconComponent,
  type AppIconSize
} from "@/components/icons";
import { Button, ButtonSpinner, ButtonText } from "@/components/ui/button";
import { designTokens } from "@/theme/tokens";
import { getSansFontStyle } from "@/theme/fonts";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  Image,
  Platform,
  StyleSheet,
  useWindowDimensions,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from "react-native-reanimated";

type ButtonBaseColor = "accent" | "danger" | "essential" | "neutral";
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
  color = "neutral",
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
  const { fontScale } = useWindowDimensions();
  const pressScale = useSharedValue(1);
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const sizeConfig = sizeMap[size];
  const config = getButtonVisualConfig(color, variant);
  const surfaceStyle = getButtonSurfaceStyle(
    color,
    variant,
    pressed ? "pressed" : hovered ? "hover" : "default"
  );
  const isVisuallyDisabled = Boolean(isDisabled || loading);
  const isInteractionDisabled = Boolean(
    loading || (isDisabled && !onDisabledPress)
  );
  const buttonWidth =
    layout === "icon"
      ? Math.max(
          sizeConfig.height,
          sizeConfig.textToken.lineHeight * fontScale + atomSpacing[6]
        )
      : fullWidth
        ? "100%"
        : undefined;
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
      className=""
      accessibilityState={{ disabled: isVisuallyDisabled, busy: loading }}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
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
              setPressed(true);
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
              setPressed(false);
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
            alignItems: "center",
            backgroundColor: surfaceStyle.backgroundColor,
            borderColor: surfaceStyle.borderColor,
            borderRadius: shape === "pill" ? atomRadii.full : sizeConfig.radius,
            borderWidth: surfaceStyle.borderWidth,
            flexDirection: "row",
            gap: atomSpacing[2],
            justifyContent: "center",
            minHeight: Math.max(
              sizeConfig.height,
              sizeConfig.textToken.lineHeight * fontScale + atomSpacing[6]
            ),
            paddingHorizontal: layout === "icon" ? 0 : atomSpacing[4],
            paddingVertical: atomSpacing[3],
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

const buttonColors = designTokens.controls.buttons;
function getButtonSurfaceStyle(
  color: ButtonColor,
  variant: ButtonVariant,
  state: "default" | "hover" | "pressed"
) {
  const token = buttonColors[color];
  const backgroundColor =
    variant === "solid"
      ? state === "hover"
        ? token.hover
        : state === "pressed"
          ? token.pressed
          : token.bg
      : state === "pressed"
        ? atomPalette.surfaceStrong
        : state === "hover"
          ? atomPalette.surfaceLow
          : variant === "ghost"
            ? "transparent"
            : atomPalette.surface;
  return {
    backgroundColor,
    borderColor:
      variant === "solid"
        ? backgroundColor
        : variant === "ghost"
          ? "transparent"
          : color === "neutral"
            ? atomPalette.borderStrong
            : token.bg,
    borderWidth: variant === "ghost" ? 0 : 1
  };
}
function getButtonVisualConfig(color: ButtonColor, variant: ButtonVariant) {
  const textColor =
    variant === "solid"
      ? buttonColors[color].text
      : color === "neutral"
        ? atomPalette.text
        : color === "essential"
          ? atomPalette.accent
          : buttonColors[color].bg;
  return {
    action: "default" as const,
    buttonVariant:
      variant === "solid" ? ("solid" as const) : ("outline" as const),
    textColor,
    iconColor: textColor
  };
}
