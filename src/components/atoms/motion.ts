import { Easing } from "react-native-reanimated";
import { designTokens } from "@/theme/tokens";
export const atomMotion = {
  duration: designTokens.motion.duration,
  scale: designTokens.motion.scale,
  easing: {
    measured: Easing.bezier(...designTokens.motion.curves.measured),
    scan: Easing.linear,
    status: Easing.inOut(Easing.quad)
  }
} as const;
