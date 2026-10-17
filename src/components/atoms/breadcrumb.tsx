import { AppText } from "@/components/atoms/text";
import { atomSpacing } from "@/components/atoms/theme";
import type { ReactNode } from "react";
import { useState } from "react";
import {
  Platform,
  Pressable,
  View,
  type StyleProp,
  type ViewStyle
} from "react-native";

export interface BreadcrumbItem {
  accessibilityLabel?: string;
  label: ReactNode;
  onPress?: () => void;
}

export function Breadcrumb({
  items,
  showTrailingSeparator = false,
  style
}: {
  items: BreadcrumbItem[];
  showTrailingSeparator?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      accessibilityRole="text"
      style={[
        {
          alignItems: "center",
          flexDirection: "row",
          flexWrap: "wrap",
          gap: atomSpacing[2]
        },
        style
      ]}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <View
            key={`${index}-${String(item.label)}`}
            style={{
              alignItems: "center",
              flexDirection: "row",
              gap: atomSpacing[2]
            }}
          >
            {item.onPress ? (
              <BreadcrumbLink item={item} />
            ) : (
              <AppText tone={isLast ? "accent" : "subtle"} variant="eyebrow">
                {item.label}
              </AppText>
            )}
            {!isLast || showTrailingSeparator ? (
              <AppText tone={isLast ? "accent" : "subtle"} variant="eyebrow">
                /
              </AppText>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function BreadcrumbLink({ item }: { item: BreadcrumbItem }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Pressable
      accessibilityLabel={item.accessibilityLabel}
      accessibilityRole="link"
      hitSlop={8}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      onPress={item.onPress}
      style={Platform.OS === "web" ? { cursor: "pointer" } : null}
    >
      {({ pressed }) => (
        <AppText
          tone={isHovered ? "muted" : "subtle"}
          variant="eyebrow"
          style={{ opacity: pressed ? 0.72 : 1 }}
        >
          {item.label}
        </AppText>
      )}
    </Pressable>
  );
}
