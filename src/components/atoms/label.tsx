import { atomSpacing } from "@/components/atoms/theme";
import { AppText } from "@/components/atoms/text";
import type { ReactNode } from "react";
import { View } from "react-native";

export function FieldLabel({
  nativeID,
  accessory,
  children,
  required = false
}: {
  nativeID?: string;
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
      <AppText
        style={{ flexShrink: 1 }}
        nativeID={nativeID}
        tone="default"
        variant="formLabel"
      >
        {children}
        {!required ? (
          <AppText tone="subtle" variant="formLabel">
            {" "}
            (optional)
          </AppText>
        ) : null}
      </AppText>
      {accessory}
    </View>
  );
}
