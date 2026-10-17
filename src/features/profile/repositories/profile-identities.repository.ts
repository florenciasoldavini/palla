import { requireSupabase } from "@/infrastructure/supabase/repository-helpers";

export async function fetchLinkedIdentities() {
  const { data, error } = await requireSupabase().auth.getUserIdentities();
  if (error) throw error;
  return data.identities;
}
