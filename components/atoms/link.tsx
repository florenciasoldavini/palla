import { atomPalette, atomTypeScale } from "@/components/atoms/theme";
import { getMonoFontStyle } from "@/theme/fonts";
import { Link, type LinkProps } from "expo-router";
import type { ReactNode } from "react";
import { useState } from "react";
import {
  Platform,
  Pressable,
  Text,
  type TextStyle,
  type ViewStyle
} from "react-native";

export function AppLink({
  asChild: _asChild,
  children,
  style,
  ...props
}: LinkProps & {
  children: ReactNode;
  style?: React.ComponentProps<typeof Text>["style"];
}) {
  const linkToken = atomTypeScale.linkMono;
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Link {...props} asChild>
      <Pressable
        onPointerEnter={() => {
          setIsHovered(true);
        }}
        onPointerLeave={() => {
          setIsHovered(false);
        }}
        style={
          Platform.OS === "web"
            ? ({
                cursor: "pointer"
              } as ViewStyle)
            : null
        }
      >
        {({ pressed }) => (
          <Text
            style={[
              {
                color:
                  isHovered || pressed
                    ? atomPalette.accentHover
                    : atomPalette.accent,
                fontSize: linkToken.fontSize,
                lineHeight: linkToken.lineHeight,
                letterSpacing: linkToken.letterSpacing,
                textDecorationLine: isHovered || pressed ? "underline" : "none",
                textTransform: linkToken.textTransform,
                ...getMonoFontStyle(linkToken.fontWeight)
              } as TextStyle,
              style
            ]}
          >
            {children}
          </Text>
        )}
      </Pressable>
    </Link>
  );
}
