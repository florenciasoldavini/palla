import { CloudOff, RotateCw } from "lucide-react-native";
import { ContentState, type ContentStateProps } from "./content-state";

export function ErrorState({
  icon = CloudOff,
  description = "Check your connection and try again.",
  onRetry,
  retryLabel = "Try again",
  retrying = false,
  retryDisabled = false,
  action,
  ...props
}: Omit<ContentStateProps, "description"> & {
  description?: ContentStateProps["description"];
  onRetry?: () => void;
  retryLabel?: string;
  retrying?: boolean;
  retryDisabled?: boolean;
}) {
  return (
    <ContentState
      {...props}
      icon={icon}
      description={description}
      announce
      action={
        action ??
        (onRetry
          ? {
              label: retryLabel,
              icon: RotateCw,
              onPress: onRetry,
              loading: retrying,
              disabled: retryDisabled
            }
          : undefined)
      }
    />
  );
}
