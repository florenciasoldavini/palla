import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn() }));
vi.mock("./repositories/preferences.repository", () => ({
  getChatNotificationPreference: mock.get,
  setChatNotificationPreference: mock.set
}));
import {
  loadChatNotificationPreference,
  saveChatNotificationPreference
} from "./services/preferences.service";
beforeEach(() => vi.resetAllMocks());
describe("chat notification preference", () => {
  it("preserves an explicit opt out", async () => {
    mock.get.mockResolvedValue(false);
    expect(await loadChatNotificationPreference()).toBe(false);
  });
  it("rejects an invalid response instead of enabling notifications", async () => {
    mock.get.mockResolvedValue(null);
    await expect(loadChatNotificationPreference()).rejects.toThrow();
  });
  it("returns the confirmed server value", async () => {
    mock.set.mockResolvedValue(false);
    expect(await saveChatNotificationPreference(false)).toBe(false);
    expect(mock.set).toHaveBeenCalledWith(false);
  });
  it("propagates save failure so the existing preference is retained", async () => {
    mock.set.mockRejectedValue(new Error("Offline"));
    await expect(saveChatNotificationPreference(false)).rejects.toThrow(
      "Offline"
    );
  });
});
