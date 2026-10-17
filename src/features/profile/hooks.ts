import { uploadProfileAvatar } from "@/features/profile/services/profile.service";
import type { ProfileAvatarAsset } from "@/features/profile/repositories/profile-avatar.repository";
import { useMutation } from "@tanstack/react-query";

export function useUploadProfileAvatar() {
  return useMutation({
    mutationFn: ({
      asset,
      userId
    }: {
      asset: ProfileAvatarAsset;
      userId: string;
    }) => uploadProfileAvatar({ asset, userId })
  });
}
