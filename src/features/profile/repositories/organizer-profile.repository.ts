import { requireSupabase } from "@/infrastructure/supabase/repository-helpers";
import {
  organizerSchema,
  type OrganizerDetailsInput
} from "@/features/organizer/domain";

export async function fetchOrganizerProfile(profileId: string) {
  const { data, error } = await requireSupabase()
    .from("organizers")
    .select("*")
    .eq("profile_id", profileId)
    .maybeSingle();
  if (error) throw error;
  return data ? organizerSchema.parse(data) : null;
}
export async function persistOrganizerDetails(
  profileId: string,
  input: OrganizerDetailsInput
) {
  const { data, error } = await requireSupabase()
    .from("organizers")
    .update(input)
    .eq("profile_id", profileId)
    .select("*")
    .single();
  if (error) throw error;
  return organizerSchema.parse(data);
}
export async function fetchLinkedIdentities() {
  const { data, error } = await requireSupabase().auth.getUserIdentities();
  if (error) throw error;
  return data.identities;
}
