import { Easing } from "react-native-reanimated";

export const atomMotion = {
  duration: {
    enter: 160,
    exit: 100,
    focus: 120,
    layout: 160,
    pressIn: 60,
    pressOut: 80,
    progress: 650,
    scan: 1800,
    thumb: 160
  },
  easing: {
    measured: Easing.bezier(0.2, 0, 0, 1),
    scan: Easing.linear,
    status: Easing.inOut(Easing.quad)
  },
  scale: {
    buttonPressed: 0.992,
    cardPressed: 0.996,
    focusGlow: 0.0015
  }
} as const;
