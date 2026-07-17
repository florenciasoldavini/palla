import { atomSpacing } from "@/components/atoms/theme";
import { AppText } from "@/components/atoms/text";
import type { ReactNode } from "react";
import { View } from "react-native";

export function FieldLabel({
  accessory,
  children,
  required = false
}: {
  accessory?: ReactNode;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <View
      style={{
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "space-between",
        gap: atomSpacing[3]
      }}
    >
      <View
        style={{
          alignItems: "center",
          flexDirection: "row",
          gap: atomSpacing[1]
        }}
      >
        <AppText tone="subtle" variant="formLabel">
          {children}
        </AppText>
        {!required ? (
          <AppText tone="subtle" variant="formLabel" style={{ opacity: 0.72 }}>
            (optional)
          </AppText>
        ) : null}
      </View>
      {accessory}
    </View>
  );
}
