import {
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  ShieldCheck,
  Sparkles,
  Star
} from "lucide-react-native";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { useId } from "react";
import { AppButton, AppCard, AppHeading, AppText } from "@/components/atoms";
import { atomPalette as c } from "@/components/atoms/theme";
import { designTokens } from "@/theme/tokens";

export type HostRecognitionMilestone = "verified" | "superhost";
const milestones = {
  verified: {
    title: "Become a Verified Host",
    criteria: "3 confirmed sessions · 5 different players",
    description: "Earn recognition from the players you host.",
    Icon: ShieldCheck,
    rewards: [
      { label: "Profile badge", Icon: BadgeCheck },
      { label: "Session badge", Icon: CalendarCheck }
    ]
  },
  superhost: {
    title: "Become a Superhost",
    criteria: "10 sessions · 4.8+ rating · 10 reviews",
    description: "Keep a reliable record over 6 months.",
    Icon: Star,
    rewards: [
      { label: "Superhost badge", Icon: Star },
      { label: "Featured host eligibility", Icon: Sparkles }
    ]
  }
} as const;

/** Static invitation only. No eligibility, progress, badge awards or backend calls. */
export function HostRecognitionBanner({
  milestone = "verified"
}: {
  milestone?: HostRecognitionMilestone;
}) {
  const content = milestones[milestone];
  const { fontScale } = useWindowDimensions();
  const glowId = useId();
  return (
    <AppCard surface="panel" tone="inverse" style={styles.card}>
      <View
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <Defs>
            <RadialGradient
              id={glowId}
              gradientUnits="userSpaceOnUse"
              cx="100"
              cy="0"
              rx="85"
              ry="90"
            >
              <Stop offset="0" stopColor={c.brand} stopOpacity={0.12} />
              <Stop offset="0.5" stopColor={c.brand} stopOpacity={0.04} />
              <Stop offset="1" stopColor={c.brand} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect width="100" height="100" fill={`url(#${glowId})`} />
        </Svg>
      </View>
      <View style={[styles.layout, fontScale > 1.3 && styles.stacked]}>
        <View
          style={styles.icon}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <content.Icon
            size={24}
            color={
              milestone === "verified"
                ? designTokens.colors.primitive.ink[600]
                : c.brand
            }
            fill={milestone === "verified" ? c.brand : "none"}
            strokeWidth={1.8}
          />
        </View>
        <View
          style={[styles.content, fontScale > 1.3 && styles.stackedContent]}
        >
          <View style={styles.copy}>
            <AppHeading variant="card" tone="inverse">
              {content.title}
            </AppHeading>
            <AppText variant="caption" style={styles.secondary}>
              Coming soon · Proposed milestones
            </AppText>
          </View>
          <View style={styles.copy}>
            <AppText variant="bodySm" style={styles.secondary}>
              {content.criteria}
            </AppText>
            <AppText variant="bodySm" style={styles.secondary}>
              {content.description}
            </AppText>
          </View>
          <View style={styles.rewards}>
            {content.rewards.map(({ label, Icon }) => (
              <View key={label} style={styles.reward}>
                <Icon
                  size={14}
                  color={c.brand}
                  accessibilityElementsHidden
                  importantForAccessibility="no-hide-descendants"
                />
                <AppText
                  variant="caption"
                  tone="inverse"
                  style={styles.rewardText}
                >
                  {label}
                </AppText>
              </View>
            ))}
          </View>
          <AppButton
            color="essential"
            size="sm"
            icon={ArrowRight}
            accessibilityHint="Host recognition is coming soon. Progress is not available yet."
          >
            View progress
          </AppButton>
        </View>
      </View>
    </AppCard>
  );
}
const styles = StyleSheet.create({
  card: {
    backgroundColor: designTokens.colors.primitive.ink[800],
    borderWidth: 0,
    padding: 20
  },
  layout: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  stacked: { flexDirection: "column" },
  content: { flex: 1, minWidth: 0, gap: 12 },
  stackedContent: { flex: 0, width: "100%" },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: designTokens.colors.primitive.ink[600],
    borderWidth: 1,
    borderColor: designTokens.colors.primitive.volt[700],
    alignItems: "center",
    justifyContent: "center"
  },
  copy: { gap: 4 },
  secondary: { color: designTokens.colors.primitive.neutral[300] },
  rewards: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  reward: {
    maxWidth: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: `${designTokens.colors.primitive.neutral[500]}80`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: `${designTokens.colors.primitive.neutral[500]}33`
  },
  rewardText: { flexShrink: 1 }
});
