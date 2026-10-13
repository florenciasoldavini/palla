import { getSupabaseErrorMessage, supabase } from "@/lib/supabase";

type SendWelcomeToPallaEmailInput = {
  name?: string;
};

type WelcomeToPallaResponse = {
  id?: string;
  ok: boolean;
  skipped?: boolean;
  welcome_email_sent_at?: string;
};

export async function invokeWelcomeToPallaEmail(
  input: SendWelcomeToPallaEmailInput = {}
) {
  if (!supabase) {
    throw new Error(getSupabaseErrorMessage("Supabase is not configured."));
  }

  const { data, error } =
    await supabase.functions.invoke<WelcomeToPallaResponse>(
      "welcome-to-palla",
      {
        body: input
      }
    );

  if (error) {
    throw error;
  }

  return data;
}
