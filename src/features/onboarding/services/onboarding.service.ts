import { persistOnboarding } from "@/features/onboarding/repositories/onboarding.repository";
import {
  onboardingSchema,
  type OnboardingInput
} from "@/features/onboarding/validation";

export function completeOnboarding(input: OnboardingInput) {
  return persistOnboarding(onboardingSchema.parse(input));
}
