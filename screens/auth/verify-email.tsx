import {
  AppButton,
  AppCard,
  AppLink,
  AppText,
  FieldMessage
} from "@/components/atoms";
import { atomPalette, atomRadii, atomSpacing } from "@/components/atoms/theme";
import { AuthShell, authFormControlSize } from "@/components/auth/AuthShell";
import { resendSignUpConfirmationEmail } from "@/lib/auth";
import {
  getSupabaseErrorMessage,
  isSupabaseEmailCooldownError
} from "@/lib/supabase";
import { emailSchema } from "@/schemas/fields";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";

const resendCooldownSeconds = 60;

function getEmailParam(email: string | string[] | undefined) {
  if (Array.isArray(email)) {
    return email[0] ?? "";
  }

  return email ?? "";
}

export default function VerifyEmailScreen() {
  const { email: emailParam, notice: noticeParam } = useLocalSearchParams<{
    email?: string | string[];
    notice?: string | string[];
  }>();
  const email = getEmailParam(emailParam).trim().toLowerCase();
  const notice = getEmailParam(noticeParam);
  const isRateLimited = notice === "rate-limited";
  const isInitialEmailSent = notice === "sent";
  const [cooldownSeconds, setCooldownSeconds] = useState(
    isRateLimited || isInitialEmailSent ? resendCooldownSeconds : 0
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(
    isInitialEmailSent
      ? "Verification link sent. Check your inbox and spam folder."
      : null
  );
  const [isResending, setIsResending] = useState(false);
  const emailResult = emailSchema.safeParse(email);
  const canResend = emailResult.success && cooldownSeconds === 0;

  useEffect(() => {
    if (cooldownSeconds <= 0) {
      return;
    }

    const timeout = setTimeout(() => {
      setCooldownSeconds((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => {
      clearTimeout(timeout);
    };
  }, [cooldownSeconds]);

  async function resendEmail() {
    if (!emailResult.success) {
      setErrorMessage("Go back to sign up and enter a valid email address.");
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsResending(true);

    try {
      await resendSignUpConfirmationEmail(email);
      setSuccessMessage(
        "Verification link sent. Check your inbox and spam folder."
      );
      setCooldownSeconds(resendCooldownSeconds);
    } catch (error) {
      if (isSupabaseEmailCooldownError(error)) {
        setSuccessMessage(null);
        setCooldownSeconds(resendCooldownSeconds);
      } else {
        setErrorMessage(getSupabaseErrorMessage(error));
      }
    } finally {
      setIsResending(false);
    }
  }

  const resendLabel =
    cooldownSeconds > 0
      ? `Resend in ${cooldownSeconds}s`
      : "Resend verification link";

  return (
    <AuthShell
      description="Confirm your email address before entering Palla."
      panelTag="One last step"
      title="Check your email"
    >
      <View style={{ gap: atomSpacing[6] }}>
        <View style={{ gap: atomSpacing[3] }}>
          <AppText tone="subtle" variant="label">
            Email address
          </AppText>
          <AppCard
            padding="sm"
            tone="muted"
            style={{
              borderColor: atomPalette.border,
              borderRadius: atomRadii.md
            }}
          >
            <AppText>
              {emailResult.success ? email : "No email address was provided."}
            </AppText>
          </AppCard>
        </View>

        <View style={{ gap: atomSpacing[3] }}>
          <AppButton
            isDisabled={!canResend}
            loading={isResending}
            onPress={() => {
              void resendEmail();
            }}
            size={authFormControlSize}
          >
            {resendLabel}
          </AppButton>

          {successMessage ? (
            <FieldMessage tone="success">{successMessage}</FieldMessage>
          ) : null}
          {errorMessage ? (
            <FieldMessage tone="error">{errorMessage}</FieldMessage>
          ) : null}
        </View>

        <View
          style={{
            alignItems: "center",
            borderTopColor: atomPalette.border,
            borderTopWidth: 1,
            flexDirection: "row",
            flexWrap: "wrap",
            gap: atomSpacing[2],
            justifyContent: "center",
            paddingTop: atomSpacing[5]
          }}
        >
          <AppText style={{ textAlign: "center" }} tone="muted">
            Already verified it?
          </AppText>
          <AppLink href="/sign-in">Sign in</AppLink>
        </View>
      </View>
    </AuthShell>
  );
}
