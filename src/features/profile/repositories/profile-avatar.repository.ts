import { File } from "expo-file-system";
import { USER_AVATAR_BUCKET } from "@/features/profile/constants";
import {
  buildProfileAvatarPath,
  getOwnedAvatarPath,
  getMimeTypeFromExtension
} from "@/features/profile/avatar-storage";
import {
  requireSupabase,
  toRepositoryError
} from "@/infrastructure/supabase/repository-helpers";

export type ProfileAvatarAsset = {
  fileName?: string | null;
  mimeType?: string | null;
  uri: string;
};

export async function uploadProfileAvatarObject({
  asset,
  userId
}: {
  asset: ProfileAvatarAsset;
  userId: string;
}) {
  const client = requireSupabase();
  const path = buildProfileAvatarPath({ asset, userId });
  const extension = path.split(".").pop() ?? "jpg";
  const bytes = await new File(asset.uri).arrayBuffer();
  if (bytes.byteLength > 5 * 1024 * 1024)
    throw new Error("Choose a photo smaller than 5 MB.");
  const { error } = await client.storage
    .from(USER_AVATAR_BUCKET)
    .upload(path, bytes, {
      cacheControl: "3600",
      contentType: asset.mimeType ?? getMimeTypeFromExtension(extension),
      upsert: false
    });

  if (error) {
    throw toRepositoryError(error);
  }

  return path;
}

export function getProfileAvatarPublicUrl(path: string) {
  const client = requireSupabase();
  return client.storage.from(USER_AVATAR_BUCKET).getPublicUrl(path).data
    .publicUrl;
}

export async function deleteUnusedProfileAvatar(url: string, userId: string) {
  const client = requireSupabase();
  const bucketUrl = client.storage.from(USER_AVATAR_BUCKET).getPublicUrl("")
    .data.publicUrl;
  const path = getOwnedAvatarPath(url, bucketUrl, userId);
  if (!path) return;
  // Never delete a photo still referenced by the saved profile, including a save
  // whose response was lost. External provider photos are never eligible.
  const { data, error: profileError } = await client
    .from("profiles")
    .select("avatar_url")
    .eq("id", userId)
    .single();
  if (profileError) throw toRepositoryError(profileError);
  if (
    data.avatar_url &&
    getOwnedAvatarPath(data.avatar_url, bucketUrl, userId) === path
  )
    return;
  const { error } = await client.storage
    .from(USER_AVATAR_BUCKET)
    .remove([path]);
  if (error) throw toRepositoryError(error);
}
