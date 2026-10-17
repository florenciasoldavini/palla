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
  resolveAuthCallbackUrl,
  getAuthParamsFromUrl,
  getPostAuthRedirectPath,
  type AuthRedirectResult
} from "@/features/auth/auth";
import { AuthContext } from "@/features/auth/auth-provider";
import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useContext, useEffect, useRef, useState } from "react";
import { View } from "react-native";

export default function AuthCallbackScreen() {
  const router = useRouter();
  const linkingUrl = Linking.useLinkingURL();
  const routeParams = useLocalSearchParams();
  const { session, isLoading } = useContext(AuthContext);
  const activeUrl = resolveAuthCallbackUrl(linkingUrl, routeParams);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completed, setCompleted] = useState<{
    url: string;
    actor: string;
    target: Href;
  } | null>(null);
  const redirected = useRef(false);
  const attempt = useRef<{
    url: string;
    promise: Promise<AuthRedirectResult>;
  } | null>(null);

  useEffect(() => {
    if (!activeUrl) {
      if (session) return;
      // A native redirect can reach the route before Linking finishes its handoff.
      const timeout = setTimeout(
        () =>
          setErrorMessage(
            "We couldn’t finish signing you in. Please return to sign in and try again."
          ),
        8000
      );
      return () => clearTimeout(timeout);
    }
    setErrorMessage(null);

    let isMounted = true;

    const finishAuth = async () => {
      try {
        const params = getAuthParamsFromUrl(activeUrl);
        if (attempt.current?.url !== activeUrl) {
          attempt.current = {
            url: activeUrl,
            promise: completeAuthSessionFromUrl(activeUrl)
          };
        }
        const { type, session: result } = await attempt.current.promise;
        if (!result) throw new Error("Incomplete sign-in");

        if (!isMounted) {
          return;
        }

        setCompleted({
          url: activeUrl,
          actor: result.user.id,
          target: getPostAuthRedirectPath(type, params.get("next")) as Href
        });
      } catch {
        if (!isMounted) {
          return;
        }

        setErrorMessage(
          "We couldn’t complete sign-in. Check your connection, then return to sign in and try again."
        );
      }
    };

    void finishAuth();

    return () => {
      isMounted = false;
    };
  }, [activeUrl, session]);

  useEffect(() => {
    if (redirected.current || isLoading || !session) return;
    if (
      activeUrl &&
      (completed?.url !== activeUrl || completed.actor !== session.user.id)
    )
      return;
    // Wait for AuthProvider's profile load and dispatch at most once, even if
    // the browser result, Linking and auth events all finish in the same frame.
    redirected.current = true;
    clearWebAuthUrlArtifacts();
    router.replace(activeUrl && completed ? completed.target : "/");
  }, [activeUrl, completed, isLoading, router, session]);

  return (
    <AuthShell
      description={
        errorMessage
          ? "Please try signing in again."
          : "We’re securely connecting your account."
      }
      panelTag="Auth / Callback"
      title="Welcome to Palla"
    >
      <View style={{ gap: atomSpacing[6] }}>
        <View style={{ gap: atomSpacing[2] }}>
          <AppHeading variant="title">
            {errorMessage ? "Sign-in couldn’t finish" : "Signing you in"}
          </AppHeading>
          {!errorMessage && <AppText tone="muted">Finishing sign in…</AppText>}
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
