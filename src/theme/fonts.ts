import { designTokens } from "@/theme/tokens";
import { Platform, type TextStyle } from "react-native";

export const fontFamilies = {
  sans:
    Platform.select({
      web: designTokens.fonts.web.sans,
      default: designTokens.fonts.native.sans
    }) ?? designTokens.fonts.native.sans,
  secondary:
    Platform.select({
      web: designTokens.fonts.web.secondary,
      default: designTokens.fonts.native.secondary
    }) ?? designTokens.fonts.native.secondary
} as const;

const nativeSansFamilies = {
  "400": "HankenGrotesk-Regular",
  "500": "HankenGrotesk-Medium",
  "600": "HankenGrotesk-SemiBold",
  "700": "HankenGrotesk-Bold",
  "800": "HankenGrotesk-Bold",
  "900": "HankenGrotesk-Bold"
} as const;

const nativeSecondaryFamilies = {
  "400": "Geist-Regular",
  "500": "Geist-Medium",
  "600": "Geist-SemiBold",
  "700": "Geist-Bold",
  "800": "Geist-Bold",
  "900": "Geist-Bold"
} as const;

type SansWeight = keyof typeof nativeSansFamilies;
type SecondaryWeight = keyof typeof nativeSecondaryFamilies;

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

export function getSecondaryFontStyle(
  weight: SecondaryWeight = "500"
): TextStyle {
  if (Platform.OS === "web") {
    return {
      fontFamily: designTokens.fonts.web.secondary,
      fontWeight: weight
    };
  }

  return {
    fontFamily: nativeSecondaryFamilies[weight]
  };
}
