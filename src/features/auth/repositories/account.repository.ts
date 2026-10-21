import { supabase } from "@/lib/supabase";
import { getAuthRedirectUrl } from "@/features/auth/auth";

export async function createEmailAccount(email: string, password: string) {
  if (!supabase)
    throw new Error("Account creation is unavailable. Please try again later.");
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: getAuthRedirectUrl("callback") }
  });
  if (error) throw error;
  return data;
}
export async function signInToEmailAccount(email: string, password: string) {
  if (!supabase)
    throw new Error("Sign in is unavailable. Please try again later.");
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  if (error) throw error;
  return data;
}
