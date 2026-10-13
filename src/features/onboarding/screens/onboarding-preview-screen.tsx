import { AppButton, AppHeading, AppText, Screen } from "@/components/atoms";
import { atomSpacing } from "@/components/atoms/theme";
import { OnboardingForm } from "@/features/onboarding/components/onboarding-form";
import type { OnboardingInput } from "@/features/onboarding/validation";
import { Redirect, useRouter, useLocalSearchParams } from "expo-router";
import { requireOptionalNativeModule } from "expo-modules-core";
import { categoryLabels } from "@/features/profile/playing-category";
import { useEffect, useState } from "react";
import { View } from "react-native";

export default function OnboardingPreviewScreen() {
  const router = useRouter();
  const { step, nativeQa } = useLocalSearchParams<{
    step?: string;
    nativeQa?: string;
  }>();
  const [result, setResult] = useState<OnboardingInput | null>(null);
  useEffect(() => {
    if (!__DEV__ || nativeQa !== "1") return;
    // Expo Go scopes preferences per experience. Configure through its runtime
    // API instead of editing the host app's unrelated preference domain.
    const prepare = async () => {
      const internal = requireOptionalNativeModule<{
        setOnboardingFinished: (finished: boolean) => Promise<void>;
        closeMenu: () => Promise<void>;
      }>("ExpoDevMenuInternal");
      const preferences = requireOptionalNativeModule<{
        setPreferencesAsync: (
          settings: Record<string, boolean>
        ) => Promise<void>;
      }>("DevMenuPreferences");
      await internal?.setOnboardingFinished(true);
      await preferences?.setPreferencesAsync({
        showsAtLaunch: false,
        keyCommandsEnabled: false
      });
      await internal?.closeMenu();
    };
    void prepare().catch(() =>
      console.warn("Native QA could not close the Expo developer menu.")
    );
  }, [nativeQa]);
  if (!__DEV__) return <Redirect href="/sign-in" />;
  if (result)
    return (
      <Screen centered>
        <View
          style={{ alignSelf: "center", maxWidth: 440, gap: atomSpacing[5] }}
        >
          <AppHeading>You're ready, {result.firstName}.</AppHeading>
          <AppText>
            This preview would open the{" "}
            {result.mode === "player" ? "player home" : "organizer dashboard"}.
            No account or profile was changed.
          </AppText>
          <AppText>
            Category:{" "}
            {result.playingCategory
              ? categoryLabels[result.playingCategory]
              : result.categoryStatus}
          </AppText>
          <AppButton color="essential" onPress={() => setResult(null)}>
            Review again
          </AppButton>
        </View>
      </Screen>
    );
  return (
    <OnboardingForm
      preview
      previewStep={step === "category" ? 2 : 0}
      initialValues={{
        firstName: step === "category" ? "Preview player" : "",
        lastName: "",
        mode: "player",
        categoryStatus: step === "category" ? "known" : null,
        playingCategory: step === "category" ? 6 : null
      }}
      onComplete={async (input) => setResult(input)}
      onSignOut={async () => router.replace("/sign-in")}
    />
  );
}
