import {
  AuthDivider,
  AuthFooterLink,
  AuthStatusMessage,
  AuthShell,
  authFieldSize,
  authFormStackGap,
  authSocialButtonSize
} from "@/features/auth/components/auth-shell";
import {
  AppButton,
  AppLink,
  FieldMessage,
  PasswordVisibilityToggle,
  TextField
} from "@/components/atoms";
import { atomSpacing } from "@/components/atoms/theme";
import { AuthContext } from "@/features/auth/auth-provider";
import { startOAuthSignIn } from "@/features/auth/auth";
import {
  getSupabaseErrorMessage,
  isSupabaseEmailNotConfirmedError
} from "@/lib/supabase";
import { loginSchema, type LoginInput } from "@/features/auth/validation";
import { AtSignIcon, LockIcon } from "@/components/icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useContext, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { View } from "react-native";

import { signInWithEmail as accessAccount } from "@/features/auth/services/account.service";

const googleLogo = require("@assets/images/auth/google-logo.png");

export default function SignInScreen() {
  const router = useRouter();
  const { authError } = useContext(AuthContext);
  const [formError, setFormError] = useState<string | null>(null);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loadingAction, setLoadingAction] = useState<"email" | "google" | null>(
    null
  );
  const form = useForm<LoginInput>({
    defaultValues: {
      email: "",
      password: ""
    },
    mode: "onChange",
    resolver: zodResolver(loginSchema)
  });
  const {
    control,
    formState: { isValid },
    handleSubmit,
    trigger
  } = form;
  const isBusy = loadingAction !== null;

  const revealEmailSignInValidation = () => {
    void trigger();
  };

  const signInWithEmail = handleSubmit(async ({ email, password }) => {
    const signInEmail = email.trim().toLowerCase();

    setLoadingAction("email");
    setFormError(null);

    try {
      await accessAccount({ email: signInEmail, password });
    } catch (error) {
      if (isSupabaseEmailNotConfirmedError(error)) {
        router.replace(
          `/verify-email?email=${encodeURIComponent(signInEmail)}`
        );
      } else setFormError(getSupabaseErrorMessage(error));
    } finally {
      setLoadingAction(null);
    }
  });

  async function signInWithGoogle() {
    try {
      setLoadingAction("google");
      setFormError(null);
      await startOAuthSignIn("google");
    } catch {
      setFormError(
        "We couldn't sign you in with Google. Try again or continue with email."
      );
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <AuthShell
      description="Access your Palla account."
      panelTag="Player access"
      title="Welcome back"
    >
      <View style={{ gap: atomSpacing[6] }}>
        {authError ? (
          <AuthStatusMessage tone="danger">{authError}</AuthStatusMessage>
        ) : null}

        <View style={{ gap: authFormStackGap }}>
          <View style={{ gap: atomSpacing[3] }}>
            <AppButton
              accessibilityLabel="Continue with Google"
              imageSource={googleLogo}
              isDisabled={isBusy}
              loading={loadingAction === "google"}
              onPress={() => void signInWithGoogle()}
              size={authSocialButtonSize}
              color="neutral"
              variant="bordered"
            >
              Continue with Google
            </AppButton>
          </View>

          <AuthDivider label="or continue with email" />

          <Controller
            control={control}
            name="email"
            render={({ field, fieldState }) => (
              <TextField
                autoCapitalize="none"
                autoComplete="email"
                errorText={fieldState.error?.message}
                keyboardType="email-address"
                label="Email address"
                leftIcon={AtSignIcon}
                onBlur={field.onBlur}
                onChangeText={(value) => {
                  field.onChange(value);
                  setFormError(null);
                }}
                placeholder="player@example.com"
                required
                size={authFieldSize}
                textContentType="emailAddress"
                type="text"
                value={field.value}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field, fieldState }) => (
              <TextField
                accessory={<AppLink href="/reset-password">Forgot?</AppLink>}
                autoCapitalize="none"
                autoComplete="password"
                errorText={fieldState.error?.message}
                label="Password"
                leftIcon={LockIcon}
                onBlur={field.onBlur}
                onChangeText={(value) => {
                  field.onChange(value);
                  setFormError(null);
                }}
                placeholder="••••••••••••"
                required
                rightSlot={
                  <PasswordVisibilityToggle
                    onPress={() => {
                      setPasswordVisible((current) => !current);
                    }}
                    visible={passwordVisible}
                  />
                }
                size={authFieldSize}
                textContentType="password"
                type={passwordVisible ? "text" : "password"}
                value={field.value}
              />
            )}
          />

          <AppButton
            isDisabled={!isValid || isBusy}
            loading={loadingAction === "email"}
            onDisabledPress={
              !isValid && !isBusy ? revealEmailSignInValidation : undefined
            }
            onPress={() => {
              void signInWithEmail();
            }}
            size={authFieldSize}
          >
            Sign in
          </AppButton>
          {formError ? (
            <FieldMessage tone="error">{formError}</FieldMessage>
          ) : null}
        </View>

        <AuthFooterLink
          actionLabel="Create an account"
          href="/sign-up"
          prompt="New to Palla?"
        />
      </View>
    </AuthShell>
  );
}
