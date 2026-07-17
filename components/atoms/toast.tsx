import {
  Toast,
  ToastDescription,
  ToastTitle,
  useToast
} from "@/components/ui/toast";
import { designTokens } from "@/theme/tokens";
import { useWindowDimensions, View } from "react-native";

export type AppToastTone = "error" | "info" | "muted" | "success" | "warning";

export type AppToastInput = {
  description?: string;
  duration?: number;
  title: string;
  tone?: AppToastTone;
};

const toastToneStyles: Record<
  AppToastTone,
  { backgroundColor: string; borderColor: string; textColor: string }
> = {
  error: {
    backgroundColor: designTokens.colors.semantic.status.error.bg,
    borderColor: designTokens.colors.semantic.status.error.accent,
    textColor: designTokens.colors.semantic.status.error.text
  },
  info: {
    backgroundColor: designTokens.colors.semantic.status.info.bg,
    borderColor: designTokens.colors.semantic.status.info.accent,
    textColor: designTokens.colors.semantic.status.info.text
  },
  muted: {
    backgroundColor: designTokens.colors.semantic.bg.muted,
    borderColor: designTokens.colors.semantic.border.default,
    textColor: designTokens.colors.semantic.text.secondary
  },
  success: {
    backgroundColor: designTokens.colors.semantic.status.success.bg,
    borderColor: designTokens.colors.semantic.status.success.accent,
    textColor: designTokens.colors.semantic.status.success.text
  },
  warning: {
    backgroundColor: designTokens.colors.semantic.status.warning.bg,
    borderColor: designTokens.colors.semantic.status.warning.accent,
    textColor: designTokens.colors.semantic.status.warning.text
  }
};

export function useAppToast() {
  const toast = useToast();
  const { width: viewportWidth } = useWindowDimensions();

  const show = ({
    description,
    duration = 6000,
    title,
    tone = "info"
  }: AppToastInput) => {
    toast.show({
      duration,
      placement: "top",
      render: ({ id }) => (
        <View
          pointerEvents="box-none"
          style={{ alignItems: "center", width: viewportWidth }}
        >
          <Toast
            action={tone}
            nativeID={id}
            style={{
              backgroundColor: toastToneStyles[tone].backgroundColor,
              borderColor: toastToneStyles[tone].borderColor,
              borderWidth: 1,
              width: Math.min(Math.max(viewportWidth - 32, 0), 420)
            }}
            variant="outline"
          >
            <ToastTitle
              size="sm"
              style={{ color: toastToneStyles[tone].textColor }}
            >
              {title}
            </ToastTitle>
            {description ? (
              <ToastDescription
                size="sm"
                style={{ color: toastToneStyles[tone].textColor }}
              >
                {description}
              </ToastDescription>
            ) : null}
          </Toast>
        </View>
      )
    });
  };

  return { show };
}
