import { beforeEach, describe, expect, it, vi } from "vitest";
import { durableStore } from "@/infrastructure/local-storage/durable-store";
import {
  readLanguagePreference,
  writeLanguagePreference
} from "./language-preference";

vi.mock("@/infrastructure/local-storage/durable-store", () => ({
  durableStore: { get: vi.fn(), set: vi.fn(), remove: vi.fn() }
}));
beforeEach(() => vi.resetAllMocks());
describe("device language preference persistence", () => {
  it.each(["es", "en"])("restores saved %s", async (language) => {
    vi.mocked(durableStore.get).mockResolvedValue(language);
    expect(await readLanguagePreference()).toBe(language);
  });
  it.each([null, "fr", "invalid"])(
    "uses device language for %s",
    async (stored) => {
      vi.mocked(durableStore.get).mockResolvedValue(stored);
      expect(await readLanguagePreference()).toBe("system");
    }
  );
  it("removes the override when following the device", async () => {
    await writeLanguagePreference("system");
    expect(durableStore.remove).toHaveBeenCalledWith("palla.language.v1");
    expect(durableStore.set).not.toHaveBeenCalled();
  });
  it("persists an explicit language", async () => {
    await writeLanguagePreference("es");
    expect(durableStore.set).toHaveBeenCalledWith("palla.language.v1", "es");
  });
  it("surfaces storage failure instead of claiming success", async () => {
    vi.mocked(durableStore.set).mockRejectedValue(
      new Error("storage unavailable")
    );
    await expect(writeLanguagePreference("es")).rejects.toThrow(
      "storage unavailable"
    );
  });
});
