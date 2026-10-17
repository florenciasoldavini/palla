import { supabase } from "@/lib/supabase";
import type { OnboardingInput } from "@/features/onboarding/validation";
import { profileSchema } from "@/features/profile/domain";

export async function persistOnboarding(input: OnboardingInput) {
  if (!supabase)
    throw new Error("Account setup is unavailable. Please try again later.");
  const { data, error } = await supabase.rpc("complete_onboarding", {
    p_first_name: input.firstName,
    p_last_name: input.lastName || null,
    p_mode: input.mode,
    p_category_status: input.categoryStatus,
    p_playing_category: input.playingCategory
  });
  if (error) throw error;
  return profileSchema.parse(data);
}
