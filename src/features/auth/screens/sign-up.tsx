import {
  AuthDivider,
  AuthFooterLink,
  AuthShell,
  AuthStatusMessage,
  authFieldSize,
  authFormStackGap,
  authSocialButtonSize
} from "@/features/auth/components/auth-shell";
import {
  AppButton,
  FieldMessage,
  PasswordVisibilityToggle,
  TextField
} from "@/components/atoms";
import { atomSpacing } from "@/components/atoms/theme";
import { AuthContext } from "@/features/auth/auth-provider";
import { startOAuthSignIn } from "@/features/auth/auth";
import {
  getSupabaseErrorMessage,
  isSupabaseEmailCooldownError
} from "@/lib/supabase";
import {
  emailSignupSchema,
  type EmailSignupInput
} from "@/features/auth/validation";
import { AtSignIcon, LockIcon } from "@/components/icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useContext, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { View } from "react-native";

import { signUpWithEmail as createAccount } from "@/features/auth/services/account.service";

const googleLogo = require("@assets/images/auth/google-logo.png");

export default function SignUpScreen() {
  const router = useRouter();
  const { authError } = useContext(AuthContext);
  const [formError, setFormError] = useState<string | null>(null);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loadingAction, setLoadingAction] = useState<"email" | "google" | null>(
    null
  );
  const form = useForm<EmailSignupInput>({
    defaultValues: {
      email: "",
      password: ""
    },
    mode: "onChange",
    resolver: zodResolver(emailSignupSchema)
  });
  const {
    control,
    formState: { isValid },
    handleSubmit,
    trigger
  } = form;
  const isBusy = loadingAction !== null;

  const revealEmailSignUpValidation = () => {
    void trigger();
  };

  const signUpWithEmail = handleSubmit(async ({ email, password }) => {
    const signUpEmail = email.trim().toLowerCase();

    setLoadingAction("email");
    setFormError(null);

    try {
      const { session } = await createAccount({ email: signUpEmail, password });
      if (!session)
        router.replace(
          `/verify-email?email=${encodeURIComponent(signUpEmail)}&notice=sent`
        );
    } catch (error) {
      if (isSupabaseEmailCooldownError(error))
        router.replace(
          `/verify-email?email=${encodeURIComponent(signUpEmail)}&notice=rate-limited`
        );
      else setFormError(getSupabaseErrorMessage(error));
    } finally {
      setLoadingAction(null);
    }
  });

  async function signUpWithGoogle() {
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
      description="Find your next game. Meet your next doubles partner."
      panelTag="Join the community"
      title="Create your account"
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
              onPress={() => void signUpWithGoogle()}
              size={authSocialButtonSize}
              color="neutral"
              variant="bordered"
            >
              Continue with Google
            </AppButton>
          </View>

          <AuthDivider label="or create with email" />

          <Controller
            control={control}
            name="email"
            render={({ field, fieldState }) => (
              <TextField
                autoCapitalize="none"
                autoComplete="email"
                errorText={fieldState.error?.message}
                keyboardType="email-address"
                label="Email"
                leftIcon={AtSignIcon}
                onBlur={field.onBlur}
                onChangeText={(value) => {
                  field.onChange(value);
                  setFormError(null);
                }}
                placeholder="you@example.com"
                required
                size={authFieldSize}
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
                autoCapitalize="none"
                autoComplete="new-password"
                errorText={fieldState.error?.message}
                helperText={
                  !fieldState.error
                    ? "Use at least 8 characters, an uppercase letter, a number, and a symbol."
                    : null
                }
                label="Password"
                leftIcon={LockIcon}
                onBlur={field.onBlur}
                onChangeText={(value) => {
                  field.onChange(value);
                  setFormError(null);
                }}
                placeholder="Create a password"
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
                type={passwordVisible ? "text" : "password"}
                value={field.value}
              />
            )}
          />

          <AppButton
            isDisabled={!isValid || isBusy}
            loading={loadingAction === "email"}
            onDisabledPress={
              !isValid && !isBusy ? revealEmailSignUpValidation : undefined
            }
            onPress={() => {
              void signUpWithEmail();
            }}
            size={authFieldSize}
          >
            Create account
          </AppButton>
          {formError ? (
            <FieldMessage tone="error">{formError}</FieldMessage>
          ) : null}
        </View>

        <AuthFooterLink
          actionLabel="Sign in"
          href="/sign-in"
          prompt="Already have an account?"
        />
      </View>
    </AuthShell>
  );
}
