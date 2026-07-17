import { designTokens } from "@/theme/tokens";
import { Platform, type TextStyle } from "react-native";

export const fontFamilies = {
  sans:
    Platform.select({
      web: designTokens.fonts.web.sans,
      default: designTokens.fonts.native.sans
    }) ?? designTokens.fonts.native.sans,
  mono:
    Platform.select({
      web: designTokens.fonts.web.mono,
      default: designTokens.fonts.native.mono
    }) ?? designTokens.fonts.native.mono
} as const;

const nativeSansFamilies = {
  "400": "Geist-Regular",
  "500": "Geist-Medium",
  "600": "Geist-SemiBold",
  "800": "Geist-Bold",
  "900": "Geist-Black"
} as const;

const nativeMonoFamilies = {
  "400": "JetBrainsMono-Regular",
  "500": "JetBrainsMono-Medium",
  "600": "JetBrainsMono-SemiBold",
  "800": "JetBrainsMono-Bold",
  "900": "JetBrainsMono-Bold"
} as const;

type SansWeight = keyof typeof nativeSansFamilies;
type MonoWeight = keyof typeof nativeMonoFamilies;

export function getSansFontStyle(weight: SansWeight = "400"): TextStyle {
  if (Platform.OS === "web") {
    return {
      fontFamily: designTokens.fonts.web.sans,
      fontWeight: weight
    };
  }

  return {
    fontFamily: nativeSansFamilies[weight]
  };
}

export function getMonoFontStyle(weight: MonoWeight = "500"): TextStyle {
  if (Platform.OS === "web") {
    return {
      fontFamily: designTokens.fonts.web.mono,
      fontWeight: weight
    };
  }

  return {
    fontFamily: nativeMonoFamilies[weight]
  };
}
