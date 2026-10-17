import { describe, it, expect, vi } from "vitest";
import { chatMessageSchema } from "./domain";
import { createChatLocalRepository } from "./repositories/chat-local.repository";
import {
  jpegDimensions,
  MAX_PHOTO_BYTES
} from "../../../supabase/functions/chat-photo/image";
vi.mock("@/infrastructure/local-storage/durable-store", () => ({
  durableStore: {}
}));
const id = "95000000-0000-4000-8000-000000000001",
  actor = "95000000-0000-4000-8000-000000000002",
  conversation = "95000000-0000-4000-8000-000000000003";
const photo = {
  id,
  uri: `file:///photos/${id}.jpg`,
  width: 1200,
  height: 900,
  size: 100
};
const message = {
  id,
  conversation_id: conversation,
  sender_id: actor,
  sequence: "1",
  body: "",
  kind: "attachment",
  created_at: "2026-10-16T12:00:00Z",
  attachments: [
    {
      id,
      message_id: id,
      type: "image",
      storage_path: "private/photo.jpg",
      mime_type: "image/jpeg",
      size_bytes: 100,
      file_name: "Photo.jpg",
      width: 1200,
      height: 900,
      duration_ms: null,
      created_at: "2026-10-16T12:00:00Z"
    }
  ]
};
describe("photo message foundation", () => {
  it("allows photo-only messages but rejects empty text and deleted attachment leakage", () => {
    expect(chatMessageSchema.safeParse(message).success).toBe(true);
    expect(
      chatMessageSchema.safeParse({ ...message, kind: "text", attachments: [] })
        .success
    ).toBe(false);
    expect(
      chatMessageSchema.safeParse({
        ...message,
        body: null,
        deleted_at: message.created_at
      }).success
    ).toBe(false);
  });
  it("persists the same photo file and message identity across restart and rejects changed media retries", async () => {
    const disk = new Map<string, string>();
    const storage = {
      get: async (k: string) => disk.get(k) ?? null,
      set: async (k: string, v: string) => {
        disk.set(k, v);
      },
      remove: async (k: string) => {
        disk.delete(k);
      }
    };
    const first = createChatLocalRepository(storage);
    await first.enqueue(actor, {
      id,
      conversation_id: conversation,
      body: "",
      photo
    });
    const restarted = createChatLocalRepository(storage);
    expect((await restarted.load(actor)).outbox[0].photo).toEqual(photo);
    expect(
      (await restarted.load("95000000-0000-4000-8000-000000000004")).outbox
    ).toHaveLength(0);
    await expect(
      restarted.enqueue(actor, {
        id,
        conversation_id: conversation,
        body: "",
        photo: { ...photo, uri: "file:///changed.jpg" }
      })
    ).rejects.toThrow("identity conflict");
  });
  it("rejects oversized, truncated, non-JPEG or dimension-bomb files before upload", () => {
    expect(() => jpegDimensions(new Uint8Array(MAX_PHOTO_BYTES + 1))).toThrow();
    expect(() => jpegDimensions(new Uint8Array([137, 80, 78, 71]))).toThrow();
    const jpeg = new Uint8Array([
      255, 216, 255, 192, 0, 11, 8, 3, 132, 4, 176, 1, 1, 0, 0, 255, 217
    ]);
    expect(jpegDimensions(jpeg)).toEqual({ width: 1200, height: 900 });
    expect(() => jpegDimensions(jpeg.slice(0, -2))).toThrow();
    jpeg[9] = 127;
    expect(() => jpegDimensions(jpeg)).toThrow();
  });
});
