import { atomMotion } from "@/components/atoms/motion";
import { atomPalette, atomRadii } from "@/components/atoms/theme";
import { useEffect } from "react";
import { useWindowDimensions, type ViewStyle } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming
} from "react-native-reanimated";

export function SkeletonBlock({
  height,
  radius = atomRadii.md,
  style,
  width = "100%"
}: {
  height: number;
  radius?: number;
  style?: ViewStyle;
  width?: ViewStyle["width"];
}) {
  const pulse = useSharedValue(0);
  const shimmer = useSharedValue(0);
  const { width: viewportWidth } = useWindowDimensions();
  const numericWidth = typeof width === "number" ? width : viewportWidth;
  const shimmerTravel = Math.max(numericWidth, viewportWidth) + 180;
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.86 + pulse.value * 0.06
  }));
  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: 0.08 + pulse.value * 0.04,
    transform: [{ translateX: -120 + shimmer.value * shimmerTravel }]
  }));

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, {
        duration: atomMotion.duration.scan,
        easing: atomMotion.easing.status
      }),
      -1,
      true
    );
    shimmer.value = withRepeat(
      withTiming(1, {
        duration: atomMotion.duration.scan,
        easing: atomMotion.easing.scan
      }),
      -1,
      false
    );

    return () => {
      cancelAnimation(pulse);
      cancelAnimation(shimmer);
    };
  }, [pulse, shimmer]);

  return (
    <Animated.View
      accessibilityLabel="Loading"
      style={[
        {
          backgroundColor: atomPalette.surfaceStrong,
          borderRadius: radius,
          height,
          overflow: "hidden",
          width
        },
        style,
        animatedStyle
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          {
            backgroundColor: atomPalette.surface,
            borderRadius: radius,
            height: height * 1.5,
            left: 0,
            position: "absolute",
            top: -height * 0.25,
            width: Math.min(120, Math.max(56, numericWidth * 0.28))
          },
          shimmerStyle
        ]}
      />
    </Animated.View>
  );
}
