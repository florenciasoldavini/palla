import { AuthContext } from "@/features/auth/auth-provider";
import { OnboardingForm } from "@/features/onboarding/components/onboarding-form";
import { completeOnboarding } from "@/features/onboarding/services/onboarding.service";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { getUserHomePath } from "@/features/onboarding/navigation";
import { useContext } from "react";

export default function OnboardingScreen() {
  const router = useRouter();
  const { user, refreshProfile, logOut } = useContext(AuthContext);
  const mutation = useMutation({ mutationFn: completeOnboarding });
  if (!user) return null;
  return (
    <OnboardingForm
      initialValues={{
        firstName: user.first_name,
        lastName: user.last_name ?? "",
        mode: user.preferred_mode,
        categoryStatus: user.category_status,
        playingCategory: user.playing_category
      }}
      onSignOut={logOut}
      onComplete={async (input) => {
        await mutation.mutateAsync(input);
        const nextUser = await refreshProfile();
        if (nextUser) router.replace(getUserHomePath(nextUser));
      }}
    />
  );
}
