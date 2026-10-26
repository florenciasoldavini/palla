import {
  deleteUnusedProfileAvatar,
  uploadProfileAvatarObject
} from "./repositories/profile-avatar.repository";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getOwnedAvatarPath } from "./avatar-storage";
const state = vi.hoisted(() => ({
  current: null as string | null,
  readError: null as Error | null,
  deleteError: null as Error | null,
  remove: vi.fn(),
  upload: vi.fn(),
  bytes: new ArrayBuffer(16)
}));
vi.mock("expo-file-system", () => ({
  File: class {
    arrayBuffer() {
      return Promise.resolve(state.bytes);
    }
  }
}));
vi.mock("@/infrastructure/supabase/repository-helpers", () => ({
  toRepositoryError: (e: unknown) => e,
  requireSupabase: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: { avatar_url: state.current },
            error: state.readError
          })
        })
      })
    }),
    storage: {
      from: () => ({
        getPublicUrl: () => ({
          data: {
            publicUrl:
              "https://palla.test/storage/v1/object/public/user-avatars/"
          }
        }),
        remove: state.remove,
        upload: state.upload
      })
    }
  })
}));

const base = "https://palla.test/storage/v1/object/public/user-avatars/";
const url = `${base}users/player/avatar/old.jpg`;
beforeEach(() => {
  vi.clearAllMocks();
  state.current = null;
  state.readError = null;
  state.deleteError = null;
  state.bytes = new ArrayBuffer(16);
  state.remove.mockImplementation(async () => ({ error: state.deleteError }));
  state.upload.mockResolvedValue({ error: null });
});
describe("avatar cleanup", () => {
  it("only accepts this project's bucket and the current user's avatar folder", () => {
    expect(getOwnedAvatarPath(url, base, "player")).toBe(
      "users/player/avatar/old.jpg"
    );
    for (const unsafe of [
      "https://google.test/avatar.jpg",
      url.replace("palla.test", "other.test"),
      url.replace("/player/", "/someone/"),
      `${base}users/player/avatar/nested/x.jpg`,
      `${base}users/player/avatar/%2e%2e%2Fx.jpg`
    ])
      expect(getOwnedAvatarPath(unsafe, base, "player")).toBeNull();
  });
  it("retains a photo still used by the saved profile", async () => {
    state.current = url;
    await deleteUnusedProfileAvatar(url, "player");
    expect(state.remove).not.toHaveBeenCalled();
  });
  it("deletes the previous photo after replacement or removal", async () => {
    state.current = `${base}users/player/avatar/new.jpg`;
    await deleteUnusedProfileAvatar(url, "player");
    expect(state.remove).toHaveBeenCalledWith(["users/player/avatar/old.jpg"]);
    state.current = null;
    await deleteUnusedProfileAvatar(url, "player");
    expect(state.remove).toHaveBeenCalledTimes(2);
  });
  it("never deletes external photos, and fails safely when the profile cannot be checked", async () => {
    await deleteUnusedProfileAvatar("https://google.test/avatar.jpg", "player");
    state.readError = new Error("Offline");
    await expect(deleteUnusedProfileAvatar(url, "player")).rejects.toThrow(
      "Offline"
    );
    expect(state.remove).not.toHaveBeenCalled();
  });
  it("exposes cleanup failures for retry", async () => {
    state.deleteError = new Error("Offline");
    await expect(deleteUnusedProfileAvatar(url, "player")).rejects.toThrow(
      "Offline"
    );
  });
  it("uploads native bytes to a unique path without overwriting existing objects", async () => {
    const path = await uploadProfileAvatarObject({
      asset: { uri: "file:///photo.jpg", mimeType: "image/jpeg" },
      userId: "player"
    });
    expect(path).toMatch(/^users\/player\/avatar\/.+\.jpg$/);
    expect(state.upload).toHaveBeenCalledWith(
      path,
      state.bytes,
      expect.objectContaining({ upsert: false })
    );
    state.bytes = new ArrayBuffer(5 * 1024 * 1024 + 1);
    await expect(
      uploadProfileAvatarObject({
        asset: { uri: "file:///large.jpg" },
        userId: "player"
      })
    ).rejects.toThrow("5 MB");
    expect(state.upload).toHaveBeenCalledTimes(1);
  });
});
