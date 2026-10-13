import { AppButton } from "@/components/atoms/button";
import { AppCard } from "@/components/atoms/card";
import { AppHeading } from "@/components/atoms/heading";
import { AppText } from "@/components/atoms/text";
import { atomSpacing } from "@/components/atoms/theme";
import type { LucideIcon } from "lucide-react-native";
import type { ReactNode } from "react";
import { View } from "react-native";

export function EmptyState({
  action,
  description,
  icon,
  title
}: {
  action?: {
    icon?: LucideIcon;
    label: string;
    onPress: () => void;
  };
  description: ReactNode;
  icon?: LucideIcon;
  title: ReactNode;
}) {
  const Icon = icon;

  return (
    <AppCard padding="lg" tone="muted">
      <View style={{ alignItems: "center", gap: atomSpacing[4] }}>
        {Icon ? <Icon size={24} strokeWidth={1.8} /> : null}
        <View style={{ alignItems: "center", gap: atomSpacing[2] }}>
          <AppHeading style={{ textAlign: "center" }} variant="card">
            {title}
          </AppHeading>
          <AppText style={{ textAlign: "center" }} tone="muted">
            {description}
          </AppText>
        </View>
        {action ? (
          <AppButton
            fullWidth={false}
            icon={action.icon}
            onPress={action.onPress}
            size="sm"
          >
            {action.label}
          </AppButton>
        ) : null}
      </View>
    </AppCard>
  );
}
