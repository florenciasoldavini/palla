import { describe, expect, it, vi } from "vitest";
import { joinSession, joinErrorMessage } from "./join.service";
import { joinSessionRecord } from "../repositories/join.repository";
vi.mock("../repositories/join.repository", () => ({
  joinSessionRecord: vi.fn()
}));
const id = "bf310000-0000-4000-8000-000000000001";
describe("joining a session", () => {
  it("sends only the occurrence ID and validates the server confirmation", async () => {
    vi.mocked(joinSessionRecord).mockResolvedValueOnce({
      registration_id: id,
      status: "confirmed",
      confirmed_count: 4
    });
    expect((await joinSession(id)).status).toBe("confirmed");
    expect(joinSessionRecord).toHaveBeenCalledWith(id);
  });
  it("does not report success for an invalid server response", async () => {
    vi.mocked(joinSessionRecord).mockResolvedValueOnce({ status: "confirmed" });
    await expect(joinSession(id)).rejects.toThrow();
  });
  it("explains a capacity race and strict category failure", () => {
    expect(joinErrorMessage({ message: "JOIN_FULL" })).toContain("now full");
    expect(joinErrorMessage({ message: "JOIN_CATEGORY" })).toContain(
      "playing category"
    );
    expect(joinErrorMessage(new Error("network"))).toContain(
      "retrying won’t reserve twice"
    );
  });
});
