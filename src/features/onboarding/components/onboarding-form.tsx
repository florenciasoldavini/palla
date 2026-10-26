import { CategoryChoice } from "./category-choice";
import {
  AppButton,
  AppHeading,
  AppText,
  FieldMessage,
  Screen,
  TextField
} from "@/components/atoms";
import { PallaWordmark } from "@/components/brand/palla-wordmark";
import { atomPalette, atomSpacing } from "@/components/atoms/theme";
import { designTokens } from "@/theme/tokens";
import { ModeChoice } from "@/features/onboarding/components/mode-choice";
import {
  onboardingSchema,
  type OnboardingInput
} from "@/features/onboarding/validation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  BackHandler,
  Platform,
  Pressable,
  useWindowDimensions,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function OnboardingForm({
  initialValues,
  onComplete,
  onSignOut,
  preview = false,
  previewStep = 0
}: {
  initialValues: OnboardingInput;
  onComplete: (input: OnboardingInput) => Promise<void>;
  onSignOut: () => Promise<void>;
  preview?: boolean;
  previewStep?: number;
}) {
  const [step, setStep] = useState(preview ? previewStep : 0);
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const {
    control,
    handleSubmit,
    watch,
    formState: { isSubmitting, errors },
    trigger,
    setValue
  } = useForm<OnboardingInput>({
    defaultValues: initialValues,
    resolver: zodResolver(onboardingSchema),
    mode: "onBlur"
  });
  const mode = watch("mode");
  const totalSteps = mode === "organizer" ? 2 : 3;
  const finalStep = step === totalSteps - 1;
  const formCategoryError = errors.playingCategory?.message;
  const busy = isSubmitting || signingOut;
  useEffect(() => {
    if (Platform.OS === "web" || step === 0) return;
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (!busy) {
          setError(null);
          setStep(step - 1);
        }
        return true;
      }
    );
    return () => subscription.remove();
  }, [step, busy]);
  const submit = handleSubmit(async (input) => {
    setError(null);
    try {
      await onComplete(input);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "We couldn't save your profile. Try again."
      );
    }
  });
  const continueFromName = async () => {
    if (busy || !(await trigger(["firstName", "lastName"]))) return;
    if (mode === "organizer") {
      // Skipping this question does not mean the organizer does not play.
      // Null tells the RPC to preserve existing category data, if any.
      setValue("categoryStatus", null);
      setValue("playingCategory", null);
      await submit();
    } else setStep(2);
  };
  const signOut = async () => {
    setSigningOut(true);
    setError(null);
    try {
      await onSignOut();
    } catch {
      setError("We couldn't sign you out. Try again.");
    } finally {
      setSigningOut(false);
    }
  };
  return (
    <Screen
      keyboardSafe
      contentStyle={{ paddingHorizontal: atomSpacing[6] }}
      contentContainerStyle={{ paddingBottom: atomSpacing[8] }}
    >
      <View
        style={{
          alignSelf: "center",
          width: "100%",
          maxWidth: 440,
          minHeight: Math.max(
            640,
            height -
              insets.top -
              insets.bottom -
              atomSpacing[12] -
              atomSpacing[8]
          )
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: step === 2 ? atomSpacing[6] : atomSpacing[12]
          }}
        >
          {step > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                step === 1 ? "Back to mode selection" : "Back to your name"
              }
              disabled={busy}
              onPress={() => {
                setError(null);
                setStep(step - 1);
              }}
              style={{
                minWidth: 48,
                minHeight: 48,
                alignItems: "flex-start",
                justifyContent: "center"
              }}
            >
              <ArrowLeft size={24} color={atomPalette.text} />
            </Pressable>
          ) : (
            <View style={{ width: 48 }} />
          )}
          <PallaWordmark compact />
          <AppText
            variant="meta"
            accessibilityLabel={`Step ${step + 1} of ${totalSteps}`}
          >
            {step + 1} of {totalSteps}
          </AppText>
        </View>
        {preview ? (
          <AppText
            tone="accent"
            variant="meta"
            style={{ marginBottom: atomSpacing[4] }}
          >
            Preview only · no account changes
          </AppText>
        ) : null}
        <View
          style={{
            gap: atomSpacing[3],
            marginBottom: step === 2 ? atomSpacing[5] : atomSpacing[8]
          }}
        >
          <AppHeading
            variant="title"
            style={{
              fontSize: designTokens.typeScale.onboardingTitle.fontSize,
              lineHeight: designTokens.typeScale.onboardingTitle.lineHeight,
              letterSpacing:
                designTokens.typeScale.onboardingTitle.letterSpacing
            }}
          >
            {step === 0
              ? "How will you use Palla?"
              : step === 1
                ? "What should we call you?"
                : "What’s your category?"}
          </AppHeading>
          <AppText tone="muted">
            {step === 0
              ? "Choose how you’d like to get started."
              : step === 1
                ? mode === "organizer"
                  ? "Your name helps players recognize their organizer."
                  : "Your name helps players recognize you on court."
                : "You don’t need a tournament ranking to join."}
          </AppText>
        </View>
        {step === 0 ? (
          <Controller
            control={control}
            name="mode"
            render={({ field }) => (
              <ModeChoice value={field.value} onChange={field.onChange} />
            )}
          />
        ) : step === 1 ? (
          <View style={{ gap: atomSpacing[5] }}>
            <Controller
              control={control}
              name="firstName"
              render={({ field, fieldState }) => (
                <TextField
                  label="First name"
                  required
                  autoComplete="given-name"
                  autoCapitalize="words"
                  editable={!busy}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  errorText={fieldState.error?.message}
                  placeholder="Your first name"
                  returnKeyType="next"
                />
              )}
            />
            <Controller
              control={control}
              name="lastName"
              render={({ field, fieldState }) => (
                <TextField
                  label="Last name"
                  autoComplete="family-name"
                  autoCapitalize="words"
                  editable={!busy}
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  errorText={fieldState.error?.message}
                  placeholder="Your last name"
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    void continueFromName();
                  }}
                />
              )}
            />
            <View
              style={{
                paddingVertical: atomSpacing[4],
                borderTopWidth: 1,
                borderTopColor: atomPalette.border
              }}
            >
              <AppText variant="label">
                Starting as {mode === "player" ? "a player" : "an organizer"}
              </AppText>
              <AppText
                tone="muted"
                variant="bodySm"
                style={{ marginTop: atomSpacing[2] }}
              >
                {mode === "player"
                  ? "Discover sessions and find your next game."
                  : "Your organizer access will be ready when you finish."}
              </AppText>
            </View>
          </View>
        ) : (
          <Controller
            control={control}
            name="categoryStatus"
            render={({ field, fieldState }) => (
              <View style={{ gap: atomSpacing[3] }}>
                <CategoryChoice
                  status={field.value}
                  category={watch("playingCategory")}
                  disabled={busy}
                  onChange={(status, category) => {
                    field.onChange(status);
                    setValue("playingCategory", category, {
                      shouldValidate: true
                    });
                  }}
                />
                {fieldState.error ? (
                  <FieldMessage tone="error">
                    {fieldState.error.message}
                  </FieldMessage>
                ) : null}
                {formCategoryError ? (
                  <FieldMessage tone="error">{formCategoryError}</FieldMessage>
                ) : null}
              </View>
            )}
          />
        )}
        <View
          style={{
            flex: 1,
            minHeight: step === 2 ? atomSpacing[5] : atomSpacing[12]
          }}
        />
        <View style={{ gap: atomSpacing[5] }}>
          {step === 0 ? (
            <AppText
              tone="subtle"
              variant="bodySm"
              style={{
                textAlign: "center",
                paddingTop: atomSpacing[5],
                borderTopWidth: 1,
                borderTopColor: atomPalette.border
              }}
            >
              You can change your starting mode later.
            </AppText>
          ) : (
            <AppText tone="subtle" variant="bodySm">
              You can update this from your profile.
            </AppText>
          )}
          {error ? <FieldMessage tone="error">{error}</FieldMessage> : null}
          <AppButton
            color="essential"
            size="lg"
            loading={isSubmitting}
            isDisabled={busy}
            onPress={() => {
              if (step === 0) {
                setError(null);
                setStep(1);
              } else if (step === 1) {
                void continueFromName();
              } else void submit();
            }}
          >
            {!finalStep
              ? "Continue"
              : mode === "organizer"
                ? "Start organizing"
                : "Start playing"}
          </AppButton>
          <AppButton
            color="accent"
            variant="ghost"
            isDisabled={busy}
            loading={signingOut}
            onPress={() => void signOut()}
          >
            Sign out
          </AppButton>
        </View>
      </View>
    </Screen>
  );
}
