import { useState } from "react";
import { View } from "react-native";
import { Ban } from "lucide-react-native";
import { AppButton, AppText } from "@/components/atoms";
import { atomPalette as c, atomSpacing as sp } from "@/components/atoms/theme";
export function ChatBlockNotice({
  own,
  name,
  onUnblock
}: {
  own: boolean;
  name: string;
  onUnblock?: () => Promise<unknown>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <View style={{ gap: sp[4] }}>
      <View style={{ flexDirection: "row", gap: sp[3], alignItems: "center" }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: c.surfaceRaised,
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <Ban size={22} color={own ? c.error : c.textSubtle} />
        </View>
        <View style={{ flex: 1, gap: sp[1] }}>
          <AppText variant="label">
            {own ? `You blocked ${name}` : "Messaging unavailable"}
          </AppText>
          <AppText variant="caption" tone="subtle">
            {own
              ? "Unblock to message each other again."
              : "You can’t send messages in this conversation."}
          </AppText>
        </View>
      </View>
      {error && (
        <AppText
          variant="caption"
          tone="danger"
          accessibilityLiveRegion="polite"
        >
          {error}
        </AppText>
      )}
      {own && onUnblock && (
        <AppButton
          variant="solid"
          size="md"
          color="neutral"
          loading={busy}
          onPress={async () => {
            if (busy) return;
            setBusy(true);
            setError(null);
            try {
              await onUnblock();
            } catch {
              setError(
                "Couldn’t unblock this person. Check your connection and try again."
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          Unblock
        </AppButton>
      )}
    </View>
  );
}
