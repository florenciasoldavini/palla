import { describe, expect, it, vi } from "vitest";
import type { Session } from "@supabase/supabase-js";
import { profileDetailsSchema, profileSchema } from "./domain";
import { profileInfoSchema } from "./validation";
const captured = vi.hoisted(() => ({ patch: {} as Record<string, unknown> }));
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: () => ({
      update: (patch: Record<string, unknown>) => {
        captured.patch = patch;
        return {
          eq: () => ({
            select: () => ({ single: async () => ({ error: null }) })
          })
        };
      }
    })
  }
}));
import {
  persistUserProfile,
  toUser
} from "@/features/auth/repositories/profile.repository";
const input = {
  firstName: "Elena",
  lastName: "García",
  phoneNumber: "",
  avatar: "",
  categoryStatus: "known",
  playingCategory: 7,
  bio: ""
};
describe("optional player bio", () => {
  it("accepts empty bios and trims text within the 500-character limit", () => {
    expect(profileInfoSchema.parse(input).bio).toBe("");
    expect(
      profileInfoSchema.parse({ ...input, bio: "  Social padel  " }).bio
    ).toBe("Social padel");
    expect(
      profileInfoSchema.safeParse({ ...input, bio: "a".repeat(500) }).success
    ).toBe(true);
    expect(
      profileInfoSchema.safeParse({ ...input, bio: "a".repeat(501) }).success
    ).toBe(false);
  });
  it("keeps cached older profiles compatible and exposes the saved bio in the account model", () => {
    const details = {
      first_name: "Elena",
      last_name: null,
      avatar_url: null,
      playing_level: null
    };
    expect(profileDetailsSchema.parse(details).bio).toBeNull();
    const profile = profileSchema.parse({
      ...details,
      bio: "Good rallies and social games.",
      id: "95500000-0000-4000-8000-000000000001",
      phone_number: null,
      preferred_mode: "player",
      onboarding_completed_at: null,
      welcome_email_sent_at: null,
      created_at: "2026-10-16T12:00:00Z",
      updated_at: "2026-10-16T12:00:00Z"
    });
    expect(
      toUser(profile, { user: { email: "qa@example.com" } } as Session, null)
        .bio
    ).toBe(profile.bio);
  });
  it("clears whitespace-only bios while preserving them when an unrelated field is edited", async () => {
    await persistUserProfile("95500000-0000-4000-8000-000000000001", {
      bio: "  Social games  "
    });
    expect(captured.patch).toEqual({ bio: "Social games" });
    await persistUserProfile("95500000-0000-4000-8000-000000000001", {
      bio: "   "
    });
    expect(captured.patch).toEqual({ bio: null });
    await persistUserProfile("95500000-0000-4000-8000-000000000001", {
      first_name: "Elena"
    });
    expect(captured.patch).not.toHaveProperty("bio");
  });
});
