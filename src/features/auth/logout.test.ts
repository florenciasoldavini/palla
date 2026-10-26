import { describe, expect, it, vi } from "vitest";
import { endAccountSession } from "./services/logout.service";

describe("local logout", () => {
  it("signs out when push revocation fails", async () => {
    const auth = {
      signOut: vi.fn().mockResolvedValue({ error: null }),
      getSession: vi.fn()
    };
    await endAccountSession(auth, vi.fn().mockRejectedValue(Error("offline")));
    expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });
  it("accepts failed remote revocation only after local credentials are gone", async () => {
    const error = Error("offline");
    const auth = {
      signOut: vi.fn().mockResolvedValue({ error }),
      getSession: vi
        .fn()
        .mockResolvedValue({ data: { session: null }, error: null })
    };
    await expect(
      endAccountSession(auth, async () => {})
    ).resolves.toBeUndefined();
    auth.getSession.mockResolvedValue({
      data: { session: { user: "still signed in" } },
      error: null
    });
    await expect(endAccountSession(auth, async () => {})).rejects.toBe(error);
  });
});

it("clears persisted credentials with the installed SDK when its logout endpoint is offline", async () => {
  const { AuthClient } = await import("@supabase/auth-js");
  const key = "logout-regression";
  const stored = new Map([
    [
      key,
      JSON.stringify({
        access_token: "test-token",
        refresh_token: "test-refresh",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: "bearer",
        user: { id: "97600000-0000-4000-8000-000000000001" }
      })
    ]
  ]);
  const auth = new AuthClient({
    url: "https://palla.test/auth/v1",
    storageKey: key,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storage: {
      getItem: (k) => stored.get(k) ?? null,
      setItem: (k, v) => {
        stored.set(k, v);
      },
      removeItem: (k) => {
        stored.delete(k);
      }
    },
    fetch: async () => Response.json({ message: "offline" }, { status: 503 })
  });
  await endAccountSession(auth, async () => {
    throw Error("offline");
  });
  expect(stored.has(key)).toBe(false);
  expect((await auth.getSession()).data.session).toBeNull();
});
