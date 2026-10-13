import { AppButton, AppHeading, AppText } from "@/components/atoms";
import { atomSpacing } from "@/components/atoms/theme";
import {
  AuthShell,
  AuthStatusMessage,
  authFormControlSize
} from "@/features/auth/components/auth-shell";
import {
  clearWebAuthUrlArtifacts,
  completeAuthSessionFromUrl,
  getActiveAuthUrl,
  getAuthParamsFromUrl,
  getPostAuthRedirectPath,
  urlHasAuthPayload
} from "@/features/auth/auth";
import { getSupabaseErrorMessage } from "@/lib/supabase";
import * as Linking from "expo-linking";
import { useRouter, type Href } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";

export default function AuthCallbackScreen() {
  const router = useRouter();
  const linkingUrl = Linking.useURL();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("Finishing sign in...");

  useEffect(() => {
    const activeUrl = getActiveAuthUrl(linkingUrl);

    if (!activeUrl || !urlHasAuthPayload(activeUrl)) {
      setErrorMessage(
        "This auth link is missing the session payload. Try signing in again."
      );
      return;
    }

    let isMounted = true;

    const finishAuth = async () => {
      try {
        const params = getAuthParamsFromUrl(activeUrl);
        const { type } = await completeAuthSessionFromUrl(activeUrl);

        if (!isMounted) {
          return;
        }

        clearWebAuthUrlArtifacts();
        router.replace(
          getPostAuthRedirectPath(type, params.get("next")) as Href
        );
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setStatusMessage("We couldn't finish the sign-in redirect.");
        setErrorMessage(getSupabaseErrorMessage(error));
      }
    };

    void finishAuth();

    return () => {
      isMounted = false;
    };
  }, [linkingUrl, router]);

  return (
    <AuthShell
      description="We’re securely connecting your account."
      panelTag="Auth / Callback"
      title="Welcome to Palla"
    >
      <View style={{ gap: atomSpacing[6] }}>
        <View style={{ gap: atomSpacing[2] }}>
          <AppHeading variant="title">Signing you in</AppHeading>
          <AppText tone="muted">{statusMessage}</AppText>
        </View>

        {errorMessage ? (
          <AuthStatusMessage tone="danger">{errorMessage}</AuthStatusMessage>
        ) : (
          <AuthStatusMessage>
            <AppText variant="meta">
              Your account will open in a moment.
            </AppText>
          </AuthStatusMessage>
        )}

        {errorMessage ? (
          <AppButton
            onPress={() => {
              router.replace("/sign-in");
            }}
            size={authFormControlSize}
          >
            Back to sign in
          </AppButton>
        ) : null}
      </View>
    </AuthShell>
  );
}
