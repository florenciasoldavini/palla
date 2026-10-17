import { AppCard } from "@/components/atoms/card";
import { AppHeading } from "@/components/atoms/heading";
import { AppText } from "@/components/atoms/text";
import { atomPalette, atomSpacing } from "@/components/atoms/theme";
import type { ReactNode } from "react";
import { View } from "react-native";

export function Section({
  action,
  children,
  description,
  eyebrow,
  title,
  tone = "default"
}: {
  action?: ReactNode;
  children: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  title: ReactNode;
  tone?: "default" | "muted" | "raised";
}) {
  return (
    <AppCard padding="lg" tone={tone}>
      <View style={{ gap: atomSpacing[5] }}>
        <View
          style={{
            alignItems: "flex-start",
            flexDirection: "row",
            gap: atomSpacing[4],
            justifyContent: "space-between"
          }}
        >
          <View style={{ flex: 1, gap: atomSpacing[2] }}>
            {eyebrow ? <AppText variant="eyebrow">{eyebrow}</AppText> : null}
            <AppHeading variant="section">{title}</AppHeading>
            {description ? (
              <AppText tone="muted" variant="body">
                {description}
              </AppText>
            ) : null}
          </View>
          {action ? <View>{action}</View> : null}
        </View>
        <View
          style={{
            backgroundColor: atomPalette.borderSubtle,
            height: 1,
            width: "100%"
          }}
        />
        {children}
      </View>
    </AppCard>
  );
}
