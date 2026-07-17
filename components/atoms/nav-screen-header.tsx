import { Breadcrumb } from "@/components/atoms/breadcrumb";
import { AppHeading } from "@/components/atoms/heading";
import { AppText } from "@/components/atoms/text";
import { atomSpacing } from "@/components/atoms/theme";
import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";

export function NavScreenHeader({
  breadcrumbLabel,
  description,
  style,
  title
}: {
  breadcrumbLabel?: ReactNode;
  description?: ReactNode;
  style?: StyleProp<ViewStyle>;
  title: ReactNode;
}) {
  return (
    <View style={[{ gap: atomSpacing[3] }, style]}>
      <Breadcrumb
        items={[{ label: breadcrumbLabel ?? title }]}
        showTrailingSeparator
      />
      <AppHeading variant="hero">{title}</AppHeading>
      {typeof description === "string" ? (
        <AppText tone="muted">{description}</AppText>
      ) : (
        description
      )}
    </View>
  );
}
