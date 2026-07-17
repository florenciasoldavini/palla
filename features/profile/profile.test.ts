import { buildProfileAvatarPath } from "@/features/profile/avatar-storage";
import { describe, expect, it } from "vitest";

describe("profile avatar storage paths", () => {
  it("stores uploaded avatars under the current user folder", () => {
    expect(
      buildProfileAvatarPath({
        asset: { fileName: "headshot.jpeg", mimeType: "image/jpeg" },
        userId: "user-id",
        uuid: "avatar-id"
      })
    ).toBe("users/user-id/avatar/avatar-id.jpg");
  });

  it("falls back to mime type when the asset has no file name", () => {
    expect(
      buildProfileAvatarPath({
        asset: { mimeType: "image/png" },
        userId: "user-id",
        uuid: "avatar-id"
      })
    ).toBe("users/user-id/avatar/avatar-id.png");
  });
});
