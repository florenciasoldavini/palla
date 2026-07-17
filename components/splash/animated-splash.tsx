import {
  canFinishSplash,
  getSplashFadeDuration
} from "@/components/splash/splash-state";
import { PallaWordmark } from "@/components/brand/palla-wordmark";
import { atomPalette } from "@/components/atoms/theme";
import * as SplashScreen from "expo-splash-screen";
import { useCallback, useEffect, useRef, useState } from "react";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming
} from "react-native-reanimated";

type AnimatedSplashProps = {
  appReady: boolean;
  onFinish: () => void;
};

export function AnimatedSplash({ appReady, onFinish }: AnimatedSplashProps) {
  const reducedMotion = useReducedMotion();
  const nativeSplashHiddenRef = useRef(false);
  const [sequenceComplete, setSequenceComplete] = useState(false);
  const opacity = useSharedValue(1);
  const contentOpacity = useSharedValue(reducedMotion ? 1 : 0);
  const contentScale = useSharedValue(reducedMotion ? 1 : 0.96);

  const handleLayout = useCallback(() => {
    if (nativeSplashHiddenRef.current || process.env.EXPO_OS === "web") {
      return;
    }

    nativeSplashHiddenRef.current = true;
    void SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    contentOpacity.value = withTiming(1, { duration: reducedMotion ? 0 : 280 });
    contentScale.value = withTiming(1, { duration: reducedMotion ? 0 : 360 });

    const timer = setTimeout(
      () => setSequenceComplete(true),
      reducedMotion ? 0 : 520
    );
    return () => clearTimeout(timer);
  }, [contentOpacity, contentScale, reducedMotion]);

  useEffect(() => {
    if (!canFinishSplash({ appReady, sequenceComplete })) {
      return;
    }

    opacity.value = withTiming(
      0,
      { duration: getSplashFadeDuration(reducedMotion) },
      (finished) => {
        if (finished) {
          runOnJS(onFinish)();
        }
      }
    );
  }, [appReady, onFinish, opacity, reducedMotion, sequenceComplete]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ scale: contentScale.value }]
  }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={handleLayout}
      pointerEvents="none"
      style={[
        {
          alignItems: "center",
          backgroundColor: atomPalette.background,
          bottom: 0,
          justifyContent: "center",
          left: 0,
          position: "absolute",
          right: 0,
          top: 0,
          zIndex: 1000
        },
        overlayStyle
      ]}
    >
      <Animated.View style={contentStyle}>
        <PallaWordmark />
      </Animated.View>
    </Animated.View>
  );
}
