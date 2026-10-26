import {
  getProfileAvatarPublicUrl,
  uploadProfileAvatarObject,
  type ProfileAvatarAsset
} from "@/features/profile/repositories/profile-avatar.repository";

export async function uploadProfileAvatar({
  asset,
  userId
}: {
  asset: ProfileAvatarAsset;
  userId: string;
}) {
  const avatarPath = await uploadProfileAvatarObject({ asset, userId });
  return getProfileAvatarPublicUrl(avatarPath);
}

export { deleteUnusedProfileAvatar } from "../repositories/profile-avatar.repository";

export { fetchLinkedIdentities as getLinkedIdentities } from "../repositories/profile-identities.repository";
