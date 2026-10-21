import {
  AppButton,
  AppHeading,
  AppText,
  EmptyState,
  ErrorState,
  Screen,
  type StateVariant
} from "@/components/atoms";
import { atomSpacing as sp } from "@/components/atoms/theme";
import { CalendarDays, Plus, Users } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";

const variants: StateVariant[] = ["panel", "inline", "fullScreen"];
export default function StatesPreview() {
  const router = useRouter();
  const [kind, setKind] = useState<"empty" | "error">("empty");
  const [variant, setVariant] = useState<StateVariant>("panel");
  const [busy, setBusy] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [message, setMessage] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );
  const fullScreen = variant === "fullScreen";
  const retry = () => {
    setBusy(true);
    setMessage("");
    timer.current = setTimeout(() => {
      setBusy(false);
      setMessage("Preview retry completed. No server request was made.");
    }, 1500);
  };
  return (
    <Screen>
      <View style={{ gap: sp[5] }}>
        <AppButton
          variant="ghost"
          fullWidth={false}
          onPress={() =>
            router.canGoBack()
              ? router.back()
              : router.replace("/sessions-preview/occurrence")
          }
        >
          Back to session
        </AppButton>
        <AppHeading variant="title">UI states preview</AppHeading>
        <AppText variant="caption" tone="subtle">
          Development fixture · No account changes
        </AppText>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: sp[2] }}>
          {(["empty", "error"] as const).flatMap((type) =>
            variants.map((layout) => (
              <AppButton
                key={`${type}-${layout}`}
                size="sm"
                variant="ghost"
                fullWidth={false}
                accessibilityLabel={`Show ${type} ${layout}`}
                accessibilityState={{
                  selected: kind === type && variant === layout
                }}
                isDisabled={busy}
                onPress={() => {
                  setKind(type);
                  setVariant(layout);
                  setMessage("");
                }}
              >
                {type} · {layout}
              </AppButton>
            ))
          )}
          <AppButton
            size="sm"
            variant="ghost"
            fullWidth={false}
            onPress={() => setDisabled(!disabled)}
          >
            {disabled ? "Enable actions" : "Disable actions"}
          </AppButton>
        </View>
        {!fullScreen && (
          <AppHeading variant="section">Active roster</AppHeading>
        )}
        {kind === "empty" ? (
          <EmptyState
            variant={variant}
            icon={fullScreen ? CalendarDays : Users}
            title={
              fullScreen ? "Your first session starts here" : "No players yet"
            }
            description={
              fullScreen
                ? "Create a session and give your players a place to meet."
                : "Confirmed players will appear here when they join this session."
            }
            action={
              fullScreen
                ? {
                    label: "Create session",
                    icon: Plus,
                    disabled,
                    onPress: () =>
                      setMessage(
                        "Preview action selected. No session was created."
                      )
                  }
                : undefined
            }
          />
        ) : (
          <ErrorState
            variant={variant}
            title={
              fullScreen ? "Sessions couldn’t load" : "Couldn’t load attendees"
            }
            onRetry={retry}
            retrying={busy}
            retryDisabled={disabled}
          />
        )}
        <AppText
          accessibilityLiveRegion="polite"
          variant="caption"
          tone="subtle"
        >
          {message}
        </AppText>
      </View>
    </Screen>
  );
}
