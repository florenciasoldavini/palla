import type { Profile } from "@/features/profile/domain";

type Metadata = Record<string, unknown>;
type AuthNameSource = {
  user_metadata: Metadata;
  identities?: { provider: string; identity_data?: Metadata }[];
};

function cleanName(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 80) || null : null;
}

export function getAuthProfileNames(user: AuthNameSource) {
  const sources = [
    user.user_metadata,
    ...(user.identities ?? [])
      .filter((identity) => identity.provider === "google")
      .map((identity) => identity.identity_data ?? {})
  ];
  const find = (keys: string[]) => {
    for (const source of sources) {
      for (const key of keys) {
        const value = cleanName(source[key]);
        if (value) return value;
      }
    }
    return null;
  };
  const fullName = find(["full_name", "name"]);
  const parts = fullName?.split(/\s+/) ?? [];
  return {
    first_name: find(["first_name", "given_name"]) ?? cleanName(parts[0]),
    last_name:
      find(["last_name", "family_name"]) ?? cleanName(parts.slice(1).join(" "))
  };
}

export function getMissingAuthProfileNames(
  profile: Pick<
    Profile,
    "first_name" | "last_name" | "onboarding_completed_at"
  >,
  user: AuthNameSource
) {
  const patch: Partial<Pick<Profile, "first_name" | "last_name">> = {};
  if (profile.onboarding_completed_at) return patch;
  const names = getAuthProfileNames(user);
  if (!profile.first_name && names.first_name)
    patch.first_name = names.first_name;
  if (!profile.last_name && names.last_name) patch.last_name = names.last_name;
  return patch;
}
