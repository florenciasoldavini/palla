import { Pressable, View, useWindowDimensions } from "react-native";
import {
  Check,
  CircleAlert,
  Info,
  RotateCcw,
  TriangleAlert,
  X
} from "lucide-react-native";
import { Toast, ToastDescription, ToastTitle } from "@/components/ui/toast";
import { AppButton } from "./button";
import { designTokens } from "@/theme/tokens";
import { getSansFontStyle } from "@/theme/fonts";
import type { AppToastInput } from "./toast-types";

const tokens = designTokens.controls.toasts;
const icons = {
  success: Check,
  error: CircleAlert,
  warning: TriangleAlert,
  info: Info,
  muted: Info
};
export function AppToastCard({
  input,
  busy,
  onAction,
  onDismiss,
  maxWidth
}: {
  input: AppToastInput;
  busy: boolean;
  onAction: () => void;
  onDismiss: () => void;
  maxWidth: number;
}) {
  const { fontScale } = useWindowDimensions();
  const tone = input.tone ?? "info";
  // Supporting detail or an action always needs the standard layout.
  const compact = !input.description?.trim() && !input.action;
  const Icon = icons[tone];
  const iconTone = tokens.tones[tone];
  const compactSuccess = compact && tone === "success";
  return (
    <Toast
      action={tone}
      variant="solid"
      style={{
        backgroundColor: tokens.bg,
        boxShadow: designTokens.shadows.raised,
        borderWidth: 0,
        borderRadius: compact ? 999 : 16,
        padding: compact ? 0 : 16,
        paddingLeft: compact ? 12 : 16,
        paddingRight: compact ? 4 : 16,
        width: compact ? undefined : maxWidth,
        maxWidth,
        flexDirection: "row",
        alignItems: compact ? "center" : "flex-start",
        gap: compact ? 8 : 12
      }}
    >
      <View
        style={{
          width: compact ? 24 : 32,
          height: compact ? 24 : 32,
          borderRadius: compact ? 999 : 10,
          backgroundColor: compactSuccess ? tokens.compactIconBg : iconTone.bg,
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0
        }}
      >
        <Icon
          size={compact ? 16 : 20}
          color={compactSuccess ? tokens.compactIcon : iconTone.icon}
        />
      </View>
      <View
        style={{
          flex: compact ? undefined : 1,
          flexShrink: 1,
          gap: 4,
          paddingVertical: compact ? 8 : 0
        }}
      >
        <ToastTitle
          allowFontScaling={false}
          size="sm"
          style={{
            color: tokens.text,
            fontSize: 14 * fontScale,
            lineHeight: 20 * fontScale,
            ...getSansFontStyle(compact ? "400" : "600")
          }}
        >
          {input.title}
        </ToastTitle>
        {input.description?.trim() ? (
          <ToastDescription
            allowFontScaling={false}
            size="sm"
            style={{
              color: tokens.secondary,
              fontSize: 13 * fontScale,
              lineHeight: 18 * fontScale,
              ...getSansFontStyle("400")
            }}
          >
            {input.description}
          </ToastDescription>
        ) : null}
        {input.action ? (
          <AppButton
            fullWidth={false}
            size="sm"
            icon={input.action.icon ?? RotateCcw}
            iconAfter={false}
            loading={busy}
            isDisabled={busy}
            onPress={onAction}
            style={{
              alignSelf: "flex-start",
              backgroundColor: tokens.actionBg,
              borderWidth: 0,
              marginTop: 4
            }}
          >
            {input.action.label}
          </AppButton>
        ) : null}
      </View>
      <Pressable
        accessibilityLabel="Dismiss notification"
        accessibilityRole="button"
        onPress={onDismiss}
        style={{
          width: 48,
          height: 48,
          alignItems: "center",
          justifyContent: "center",
          marginTop: compact ? 0 : -12,
          marginRight: compact ? 0 : -12
        }}
      >
        <X size={18} color={tokens.dismiss} />
      </Pressable>
    </Toast>
  );
}
