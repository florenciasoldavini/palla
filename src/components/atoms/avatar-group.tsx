import { useState } from "react";
import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";
import { AppText } from "./text";
import { SkeletonBlock } from "./skeleton-block";
import { atomPalette } from "./theme";
import { designTokens } from "@/theme/tokens";

export type AvatarItem = {
  id: string;
  name: string;
  imageUrl?: string | null;
  tone?: "neutral" | "info";
};
function AvatarPhoto({ uri }: { uri: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? null : (
    <Image
      source={{ uri }}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      accessible={false}
      onError={() => setFailed(true)}
    />
  );
}
export function AppAvatar({
  name,
  imageUrl,
  tone = "neutral",
  size = 36,
  decorative = false
}: Omit<AvatarItem, "id"> & { size?: number; decorative?: boolean }) {
  const colors = designTokens.colors.semantic.avatar[tone];
  const initials =
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => Array.from(part)[0])
      .join("")
      .toLocaleUpperCase() || "?";
  return (
    <View
      accessible={!decorative}
      accessibilityLabel={decorative ? undefined : name || "Profile photo"}
      accessibilityElementsHidden={decorative}
      importantForAccessibility={decorative ? "no-hide-descendants" : "auto"}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.bg,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      <AppText
        variant="label"
        maxFontSizeMultiplier={1.2}
        style={{
          fontSize: size * 0.34,
          lineHeight: size * 0.44,
          color: colors.text
        }}
      >
        {initials}
      </AppText>
      {imageUrl && <AvatarPhoto key={imageUrl} uri={imageUrl} />}
    </View>
  );
}

/** A passive people summary. maxVisible includes the overflow circle. */
export function AvatarGroup({
  items,
  totalCount = items.length,
  maxVisible = 5,
  size = 36,
  loading = false,
  accessibilityLabel,
  borderColor = atomPalette.surface
}: {
  items: AvatarItem[];
  totalCount?: number;
  maxVisible?: number;
  size?: number;
  loading?: boolean;
  accessibilityLabel?: string;
  borderColor?: string;
}) {
  const total = Math.max(0, totalCount),
    limit = Math.max(1, Math.floor(maxVisible));
  if (!total) return null;
  const slots = Math.min(total, limit);
  const shown = items.slice(
    0,
    Math.min(total, total > limit ? limit - 1 : limit)
  );
  const remaining = Math.max(0, total - shown.length);
  const frame = (index: number) => ({
    marginLeft: index ? -size * 0.28 : 0,
    zIndex: index,
    borderWidth: 2,
    borderColor,
    borderRadius: size / 2 + 2,
    padding: 0
  });
  return (
    <View
      accessible
      accessibilityLabel={
        accessibilityLabel ??
        (loading
          ? "Loading people"
          : `${total} ${total === 1 ? "person" : "people"}`)
      }
      accessibilityState={{ busy: loading }}
      style={{ flexDirection: "row", alignItems: "center", flexShrink: 0 }}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ flexDirection: "row", alignItems: "center" }}
      >
        {loading ? (
          Array.from({ length: slots }, (_, index) => (
            <View key={index} style={frame(index)}>
              <SkeletonBlock width={size} height={size} radius={size / 2} />
            </View>
          ))
        ) : (
          <>
            {shown.map((item, index) => (
              <View key={item.id} style={frame(index)}>
                <AppAvatar {...item} size={size} decorative />
              </View>
            ))}
            {remaining > 0 && (
              <View style={frame(shown.length)}>
                <View
                  style={{
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: atomPalette.surfaceStrong
                  }}
                >
                  <AppText
                    variant="label"
                    maxFontSizeMultiplier={1.2}
                    style={{ fontSize: size * 0.32, lineHeight: size * 0.44 }}
                  >
                    {remaining > 99 ? "99+" : `+${remaining}`}
                  </AppText>
                </View>
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
}
