import { AppHeading, AppText, Screen } from "@/components/atoms";
import { atomSpacing } from "@/components/atoms/theme";
import { View } from "react-native";
export function NavigationPlaceholder({
  title,
  description
}: {
  title: string;
  description: string;
}) {
  return (
    <Screen>
      <View style={{ gap: atomSpacing[3] }}>
        <AppHeading>{title}</AppHeading>
        <AppText tone="muted">{description}</AppText>
      </View>
    </Screen>
  );
}
