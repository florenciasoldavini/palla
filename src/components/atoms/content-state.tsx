import { AppButton } from "./button";
import { AppCard } from "./card";
import { AppHeading } from "./heading";
import { AppText } from "./text";
import { atomPalette as c, atomSpacing as sp } from "./theme";
import type { LucideIcon } from "lucide-react-native";
import type { ReactNode } from "react";
import {
  StyleSheet,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle
} from "react-native";

export type StateVariant = "panel" | "inline" | "fullScreen" | "compact";
export type StateAction = {
  label: string;
  onPress: () => void;
  icon?: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
};
export type ContentStateProps = {
  title: ReactNode;
  description: ReactNode;
  icon?: LucideIcon;
  variant?: StateVariant;
  /** Use inside an existing card to avoid a second enclosing card. */
  contained?: boolean;
  action?: StateAction;
  style?: StyleProp<ViewStyle>;
};

/** Shared presentation; empty and error semantics live in their wrappers. */
export function ContentState({
  title,
  description,
  icon: Icon,
  variant = "panel",
  contained = false,
  action,
  style,
  announce = false
}: ContentStateProps & { announce?: boolean }) {
  const { fontScale, width, height } = useWindowDimensions();
  const inline = variant === "inline" && fontScale <= 1.2 && width >= 360;
  const fullScreen = variant === "fullScreen";
  const compact = variant === "compact";
  const iconSize =
    (compact ? 20 : fullScreen ? 36 : inline ? 24 : 28) *
    Math.min(fontScale, 1.5);
  const content = (
    <View
      style={[
        styles.content,
        compact && styles.compactContent,
        inline && styles.inline,
        fullScreen && { minHeight: Math.min(height * 0.55, 480) }
      ]}
    >
      {Icon && (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[
            styles.icon,
            {
              width: iconSize + (compact ? 16 : 36),
              height: iconSize + (compact ? 16 : 36)
            }
          ]}
        >
          <Icon size={iconSize} color={c.text} strokeWidth={1.8} />
        </View>
      )}
      <View
        style={[
          styles.details,
          compact && styles.compactDetails,
          inline && styles.inlineDetails
        ]}
      >
        <View style={styles.copy}>
          {compact ? (
            <AppText variant="label" style={styles.centerText}>
              {title}
            </AppText>
          ) : (
            <AppHeading
              variant={fullScreen ? "section" : "card"}
              style={!inline && styles.centerText}
            >
              {title}
            </AppHeading>
          )}
          {!!description && (
            <AppText
              variant="bodySm"
              tone="subtle"
              accessibilityLiveRegion={announce ? "polite" : "none"}
              style={!inline && styles.centerText}
            >
              {description}
            </AppText>
          )}
        </View>
        {action && (
          <AppButton
            icon={action.icon}
            iconAfter={false}
            color={inline || compact ? "neutral" : "essential"}
            variant={inline || compact ? "ghost" : "solid"}
            fullWidth={!inline && !compact}
            size="sm"
            loading={action.loading}
            isDisabled={action.disabled}
            accessibilityLabel={action.accessibilityLabel ?? action.label}
            onPress={action.onPress}
            style={[
              inline && styles.inlineAction,
              compact && styles.compactAction
            ]}
          >
            {action.label}
          </AppButton>
        )}
      </View>
    </View>
  );
  return fullScreen || contained ? (
    <View
      style={[
        styles.bare,
        compact && styles.compactBare,
        fullScreen && styles.fullScreen,
        style
      ]}
    >
      {content}
    </View>
  ) : (
    <AppCard surface={inline ? "row" : "panel"} style={style}>
      {content}
    </AppCard>
  );
}
const styles = StyleSheet.create({
  content: { alignItems: "center", justifyContent: "center", gap: sp[5] },
  compactContent: { gap: sp[1] },
  compactDetails: { gap: 0 },
  compactAction: { alignSelf: "center" },
  compactBare: { paddingVertical: 0 },
  inline: { flexDirection: "row", alignItems: "flex-start", gap: sp[3] },
  icon: {
    borderRadius: 999,
    backgroundColor: c.surfaceLow,
    alignItems: "center",
    justifyContent: "center"
  },
  details: { width: "100%", gap: sp[5] },
  inlineDetails: { flex: 1, width: undefined, gap: sp[1] },
  copy: { gap: sp[2] },
  centerText: { textAlign: "center" },
  inlineAction: { alignSelf: "flex-start", paddingHorizontal: 0 },
  bare: { width: "100%", paddingVertical: sp[4] },
  fullScreen: {
    flexGrow: 1,
    maxWidth: 480,
    alignSelf: "center",
    paddingVertical: sp[6]
  }
});
