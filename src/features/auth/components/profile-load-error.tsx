import {
  AppButton,
  AppHeading,
  AppText,
  FieldMessage,
  Screen
} from "@/components/atoms";
import { atomSpacing } from "@/components/atoms/theme";
import { AuthContext } from "@/features/auth/auth-provider";
import { useContext, useState } from "react";
import { View } from "react-native";

export function ProfileLoadError() {
  const { refreshProfile, logOut } = useContext(AuthContext);
  const [busy, setBusy] = useState<"retry" | "logout" | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function act(action: "retry" | "logout") {
    setBusy(action);
    setError(null);
    try {
      if (action === "retry") await refreshProfile();
      else await logOut();
    } catch {
      setError("We couldn't connect. Check your connection and try again.");
    } finally {
      setBusy(null);
    }
  }
  return (
    <Screen centered>
      <View style={{ alignSelf: "center", maxWidth: 440, gap: atomSpacing[5] }}>
        <AppHeading>Let's try that again</AppHeading>
        <AppText>
          We couldn't load your profile. Check your connection and try again.
        </AppText>
        {error ? <FieldMessage tone="error">{error}</FieldMessage> : null}
        <AppButton
          color="essential"
          loading={busy === "retry"}
          isDisabled={busy !== null}
          onPress={() => void act("retry")}
        >
          Try again
        </AppButton>
        <AppButton
          variant="ghost"
          loading={busy === "logout"}
          isDisabled={busy !== null}
          onPress={() => void act("logout")}
        >
          Sign out
        </AppButton>
      </View>
    </Screen>
  );
}
