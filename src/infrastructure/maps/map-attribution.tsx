import { Link } from "expo-router";
import { View } from "react-native";
import { atomPalette as c } from "@/components/atoms/theme";

export function MapAttribution() {
  return (
    <View
      style={{
        position: "absolute",
        bottom: 4,
        right: 5,
        left: 5,
        flexDirection: "row",
        justifyContent: "flex-end",
        flexWrap: "wrap",
        gap: 5
      }}
    >
      {[
        ["OpenFreeMap", "https://openfreemap.org/"],
        ["© OpenMapTiles", "https://openmaptiles.org/"],
        ["© OpenStreetMap", "https://www.openstreetmap.org/copyright"]
      ].map(([label, href]) => (
        <Link
          key={label}
          href={href as `https://${string}`}
          accessibilityLabel={`Map attribution: ${label}`}
          allowFontScaling={false}
          style={{
            color: c.textMuted,
            fontSize: 11,
            lineHeight: 16,
            backgroundColor: `${c.surface}E8`,
            paddingHorizontal: 2
          }}
        >
          {label}
        </Link>
      ))}
    </View>
  );
}
