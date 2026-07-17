import {
  canFinishSplash,
  getSplashFadeDuration,
  SPLASH_SEQUENCE_DURATION_MS
} from "@/components/splash/splash-state";
import {
  PallaSplashLockup,
  pallaSplashColors
} from "@/components/splash/palla-splash-lockup";
import * as SplashScreen from "expo-splash-screen";
import { useCallback, useEffect, useRef, useState } from "react";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  Easing,
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
  const progress = useSharedValue(reducedMotion ? 1 : 0);

  const handleLayout = useCallback(() => {
    if (nativeSplashHiddenRef.current || process.env.EXPO_OS === "web") {
      return;
    }

    nativeSplashHiddenRef.current = true;
    void SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    progress.value = withTiming(1, {
      duration: reducedMotion ? 0 : SPLASH_SEQUENCE_DURATION_MS,
      easing: Easing.linear
    });

    const timer = setTimeout(
      () => setSequenceComplete(true),
      reducedMotion ? 0 : SPLASH_SEQUENCE_DURATION_MS
    );
    return () => clearTimeout(timer);
  }, [progress, reducedMotion]);

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
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={handleLayout}
      pointerEvents="none"
      style={[
        {
          alignItems: "center",
          backgroundColor: pallaSplashColors.court,
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
      <PallaSplashLockup progress={progress} />
    </Animated.View>
  );
}
