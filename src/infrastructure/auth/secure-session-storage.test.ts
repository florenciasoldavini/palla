import { describe, expect, it, vi } from "vitest";
import { createSecureSessionStorage } from "./secure-session-storage";
function store() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: vi.fn(async (key: string) => data.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      data.set(key, value);
    }),
    removeItem: vi.fn(async (key: string) => {
      data.delete(key);
    })
  };
}
function setup() {
  const secure = store(),
    legacy = store();
  let id = 0;
  const create = () =>
    createSecureSessionStorage(secure, legacy, () => `id-${++id}`);
  return { secure, legacy, create };
}
describe("native secure auth storage", () => {
  it("round-trips empty strings without treating them as deleted", async () => {
    const { create } = setup();
    const storage = create();
    await storage.setItem("session", "");
    expect(await storage.getItem("session")).toBe("");
  });
  it("migrates legacy tokens and stores large Unicode sessions only in bounded encrypted chunks", async () => {
    const { secure, legacy, create } = setup();
    const value = JSON.stringify({ token: "🔒".repeat(3000) });
    legacy.data.set("session", value);
    expect(await create().getItem("session")).toBe(value);
    expect(legacy.data.has("session")).toBe(false);
    expect(
      [...secure.data.values()].every(
        (v) => Buffer.byteLength(v, "utf8") < 2048
      )
    ).toBe(true);
    expect(await create().getItem("session")).toBe(value);
  });
  it("preserves the previous session when a chunk write fails", async () => {
    const { secure, create } = setup();
    const storage = create();
    await storage.setItem("session", "old");
    secure.setItem.mockRejectedValueOnce(Error("keychain locked"));
    await expect(storage.setItem("session", "new")).rejects.toThrow(
      "keychain locked"
    );
    expect(await storage.getItem("session")).toBe("old");
  });
  it("keeps the original legacy session if migration cannot complete", async () => {
    const { secure, legacy, create } = setup();
    legacy.data.set("session", "legacy");
    secure.setItem.mockRejectedValueOnce(Error("full"));
    await expect(create().getItem("session")).rejects.toThrow("full");
    expect(legacy.data.get("session")).toBe("legacy");
  });
  it("does not resurrect a removed session even if legacy cleanup initially fails", async () => {
    const { legacy, create } = setup();
    const storage = create();
    await storage.setItem("session", "token");
    legacy.data.set("session", "obsolete");
    legacy.removeItem.mockRejectedValueOnce(Error("disk busy"));
    await expect(storage.removeItem("session")).rejects.toThrow("disk busy");
    expect(await storage.getItem("session")).toBeNull();
  });
  it("fails closed for missing chunks rather than reading stale plaintext", async () => {
    const { secure, legacy, create } = setup();
    const storage = create();
    await storage.setItem("session", "token");
    secure.data.delete([...secure.data.keys()].find((k) => k.endsWith(".0"))!);
    legacy.data.set("session", "stale");
    await expect(storage.getItem("session")).rejects.toThrow("incomplete");
  });
  it("does not reuse iOS keychain sessions after the installation marker is removed", async () => {
    const { legacy, create } = setup();
    await create().setItem("session", "token");
    legacy.data.clear();
    expect(await create().getItem("session")).toBeNull();
  });
  it("serializes overlapping operations and removes superseded encrypted chunks", async () => {
    const { secure, create } = setup();
    const storage = create();
    await Promise.all([
      storage.setItem("session", "old"),
      storage.setItem("session", "new")
    ]);
    expect(await storage.getItem("session")).toBe("new");
    expect(secure.data.size).toBe(2);
    await storage.removeItem("session");
    expect(await storage.getItem("session")).toBeNull();
    expect(secure.data.size).toBe(1);
  });
});
