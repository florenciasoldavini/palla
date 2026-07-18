import {
  AuthDivider,
  AuthFooterLink,
  AuthShell,
  AuthStatusMessage,
  authFieldSize,
  authFormStackGap,
  authSocialButtonSize
} from "@/components/auth/AuthShell";
import {
  AppButton,
  FieldMessage,
  PasswordVisibilityToggle,
  TextField
} from "@/components/atoms";
import { atomSpacing } from "@/components/atoms/theme";
import { AuthContext } from "@/contexts/auth";
import { getAuthRedirectUrl, startOAuthSignIn } from "@/lib/auth";
import {
  getSupabaseErrorMessage,
  isSupabaseEmailCooldownError,
  supabase
} from "@/lib/supabase";
import { emailSignupSchema, type EmailSignupInput } from "@/schemas/auth";
import { AtSignIcon, LockIcon } from "@/components/icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import { useContext, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { View } from "react-native";

const googleLogo = require("@/assets/images/auth/google-logo.png");

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
    if (!supabase) {
      setFormError(getSupabaseErrorMessage("Supabase is not configured."));
      return;
    }

    const signUpEmail = email.trim().toLowerCase();

    setLoadingAction("email");
    setFormError(null);

    try {
      const {
        data: { session },
        error
      } = await supabase.auth.signUp({
        email: signUpEmail,
        password,
        options: {
          emailRedirectTo: getAuthRedirectUrl("callback")
        }
      });

      if (error) {
        if (isSupabaseEmailCooldownError(error)) {
          router.replace(
            `/verify-email?email=${encodeURIComponent(signUpEmail)}&notice=rate-limited`
          );
        } else {
          const message = getSupabaseErrorMessage(error);
          setFormError(message);
        }
      } else if (!session) {
        router.replace(
          `/verify-email?email=${encodeURIComponent(signUpEmail)}&notice=sent`
        );
      }
    } catch (error) {
      const message = getSupabaseErrorMessage(error);
      setFormError(message);
    } finally {
      setLoadingAction(null);
    }
  });

  async function signUpWithGoogle() {
    try {
      setLoadingAction("google");
      setFormError(null);
      await startOAuthSignIn("google");
    } catch (error) {
      const message = getSupabaseErrorMessage(error);
      setFormError(message);
    } finally {
      setLoadingAction(null);
    }
  }

  return (
    <AuthShell
      description="Create your Palla account."
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
                placeholder="player@example.com"
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
                    ? "Use 8+ chars with uppercase, number, and symbol."
                    : null
                }
                label="Password"
                leftIcon={LockIcon}
                onBlur={field.onBlur}
                onChangeText={(value) => {
                  field.onChange(value);
                  setFormError(null);
                }}
                placeholder="min 8 characters"
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
            Create Account
          </AppButton>
          {formError ? (
            <FieldMessage tone="error">{formError}</FieldMessage>
          ) : null}
        </View>

        <AuthFooterLink
          actionLabel="Sign In"
          href="/sign-in"
          prompt="Already have an account?"
        />
      </View>
    </AuthShell>
  );
}
