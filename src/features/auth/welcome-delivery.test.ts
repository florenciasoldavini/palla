import { describe, expect, it, vi } from "vitest";
import {
  deliverWelcomeEmail,
  parseWelcomeName
} from "../../../supabase/functions/welcome-to-palla/delivery";
const setup = () => ({
  claim: vi.fn(async () => ({
    state: "claimed" as const,
    token: "lease",
    name: "Alex"
  })),
  send: vi.fn(async () => ({ id: "email" })),
  finish: vi.fn(async () => "sent-at"),
  release: vi.fn(async () => {})
});
describe("recoverable welcome delivery", () => {
  it("rejects malformed input before reserving delivery", () => {
    for (const value of [null, [], { name: 123 }, { name: "a".repeat(81) }])
      expect(() => parseWelcomeName(value)).toThrow();
    expect(parseWelcomeName({ name: " Alex " })).toBe("Alex");
  });
  it("records sent only after the provider accepts the email", async () => {
    const deps = setup();
    const result = await deliverWelcomeEmail(deps);
    expect(deps.send).toHaveBeenCalledBefore(deps.finish);
    expect(result.welcome_email_sent_at).toBe("sent-at");
  });
  it("releases a reservation on network or rendering failure and permits retry", async () => {
    const deps = setup();
    deps.send.mockRejectedValueOnce(Error("offline"));
    await expect(deliverWelcomeEmail(deps)).rejects.toThrow("offline");
    expect(deps.finish).not.toHaveBeenCalled();
    expect(deps.release).toHaveBeenCalledWith("lease");
    await expect(deliverWelcomeEmail(deps)).resolves.toMatchObject({
      ok: true
    });
  });
  it("releases the reservation if the database completion fails after provider acceptance", async () => {
    const deps = setup();
    deps.finish.mockRejectedValueOnce(Error("database"));
    await expect(deliverWelcomeEmail(deps)).rejects.toThrow("database");
    expect(deps.release).toHaveBeenCalledWith("lease");
  });
  it("never sends a second email for an already completed delivery or active lease", async () => {
    const deps = setup();
    await expect(
      deliverWelcomeEmail({
        ...deps,
        claim: async () => ({ state: "sent", sent_at: "yesterday" })
      })
    ).resolves.toMatchObject({ skipped: true });
    await expect(
      deliverWelcomeEmail({ ...deps, claim: async () => ({ state: "busy" }) })
    ).rejects.toThrow("already sending");
    expect(deps.send).not.toHaveBeenCalled();
  });
});
