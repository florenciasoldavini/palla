import {
  getAuthProfileNames,
  getMissingAuthProfileNames
} from "@/features/auth/profile-names";
import { supabase } from "@/lib/supabase";
import { profileSchema, type Profile } from "@/features/profile/domain";
import { organizerSchema } from "@/features/organizer/domain";
import type { Session } from "@supabase/supabase-js";
import type { User } from "@/types/models/user";

export type EditableUserProfile = Pick<
  User,
  | "dominant_hand"
  | "preferred_court_side"
  | "bio"
  | "avatar"
  | "first_name"
  | "last_name"
  | "phone_number"
  | "playing_category"
  | "category_status"
>;

function client() {
  if (!supabase)
    throw new Error("Account setup is unavailable. Please try again later.");
  return supabase;
}
export function toUser(
  profile: Profile,
  session: Session,
  organizerStatus: User["organizer_status"]
): User {
  return {
    id: profile.id,
    email: session.user.email ?? "",
    first_name: profile.first_name ?? "",
    last_name: profile.last_name,
    avatar: profile.avatar_url,
    bio: profile.bio,
    dominant_hand: profile.dominant_hand,
    preferred_court_side: profile.preferred_court_side,
    phone_number: profile.phone_number,
    role: "user",
    preferred_mode: profile.preferred_mode,
    playing_category: profile.playing_category,
    category_status: profile.category_status,
    organizer_status: organizerStatus,
    onboarding_completed_at: profile.onboarding_completed_at
      ? new Date(profile.onboarding_completed_at)
      : null,
    welcome_email_sent_at: profile.welcome_email_sent_at
      ? new Date(profile.welcome_email_sent_at)
      : null,
    created_at: new Date(profile.created_at),
    updated_at: new Date(profile.updated_at),
    deleted_at: null
  };
}
export async function fetchAuthProfile(session: Session): Promise<User> {
  const db = client();
  const { data, error } = await db
    .from("profiles")
    .select("*")
    .eq("id", session.user.id)
    .maybeSingle();
  if (error) throw error;
  let profileData = data;
  if (!profileData) {
    const metadata = session.user.user_metadata;
    const { data: created, error: insertError } = await db
      .from("profiles")
      .insert({
        id: session.user.id,
        ...getAuthProfileNames(session.user),
        avatar_url:
          typeof metadata.avatar_url === "string" &&
          /^https?:\/\//.test(metadata.avatar_url)
            ? metadata.avatar_url
            : null
      })
      .select("*")
      .single();
    if (insertError && insertError.code !== "23505") throw insertError;
    if (insertError) {
      const existing = await db
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
      if (existing.error) throw existing.error;
      profileData = existing.data;
    } else profileData = created;
  }
  const namePatch = getMissingAuthProfileNames(
    profileSchema.parse(profileData),
    session.user
  );
  if (Object.keys(namePatch).length > 0) {
    const { data: updated, error: updateError } = await db
      .from("profiles")
      .update(namePatch)
      .eq("id", session.user.id)
      .is("onboarding_completed_at", null)
      .select("*")
      .maybeSingle();
    if (updateError) throw updateError;
    if (updated) profileData = updated;
    else {
      const latest = await db
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
      if (latest.error) throw latest.error;
      profileData = latest.data;
    }
  }
  const { data: organizer, error: organizerError } = await db
    .from("organizers")
    .select("*")
    .eq("profile_id", session.user.id)
    .maybeSingle();
  if (organizerError) throw organizerError;
  return toUser(
    profileSchema.parse(profileData),
    session,
    organizer ? organizerSchema.parse(organizer).status : null
  );
}
export async function persistUserProfile(
  userId: string,
  input: Partial<EditableUserProfile>
) {
  const patch: Record<string, string | number | null> = {};
  if (input.dominant_hand !== undefined)
    patch.dominant_hand = input.dominant_hand;
  if (input.preferred_court_side !== undefined)
    patch.preferred_court_side = input.preferred_court_side;
  if (input.bio !== undefined) patch.bio = input.bio?.trim() || null;
  if (input.first_name !== undefined)
    patch.first_name = input.first_name.trim();
  if (input.last_name !== undefined)
    patch.last_name = input.last_name?.trim() || null;
  if (input.avatar !== undefined)
    patch.avatar_url = input.avatar?.trim() || null;
  if (input.phone_number !== undefined)
    patch.phone_number = input.phone_number?.trim() || null;
  if (input.playing_category !== undefined)
    patch.playing_category = input.playing_category;
  if (input.category_status !== undefined)
    patch.category_status = input.category_status;
  const { error } = await client()
    .from("profiles")
    .update(patch)
    .eq("id", userId)
    .select("id")
    .single();
  if (error) throw error;
}
