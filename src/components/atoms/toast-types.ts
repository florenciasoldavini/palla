import type { LucideIcon } from "lucide-react-native";
export type AppToastTone = "error" | "info" | "muted" | "success" | "warning";
export type AppToastInput = {
  title: string;
  description?: string;
  tone?: AppToastTone;
  /** null keeps the toast visible until an action or dismissal. */
  duration?: number | null;
  action?: {
    label: string;
    onPress: () => void | Promise<void>;
    /** Retry is the default icon; provide another icon for other actions. */
    icon?: LucideIcon;
  };
};
