import { describe, expect, it, vi } from "vitest";
import {
  cancelRegistration,
  cancelRegistrationError
} from "./cancel-registration.service";
import { cancelRegistrationRecord } from "../repositories/cancel-registration.repository";
import { canCancelRegistration } from "@/features/sessions/public/domain";
import { publicSessionPreview } from "@/features/sessions/public/preview-fixture";
vi.mock("../repositories/cancel-registration.repository", () => ({
  cancelRegistrationRecord: vi.fn()
}));
const registered = {
  ...publicSessionPreview,
  viewer_registration: "confirmed" as const
};
const now = Date.parse("2026-10-21T12:00:00Z");
describe("cancelling a registration", () => {
  it("allows a confirmed player to cancel even when the session is full or registration is closed", () => {
    expect(
      canCancelRegistration(
        {
          ...registered,
          confirmed_count: 4,
          registration_closes_at: new Date(now - 1).toISOString()
        },
        now
      )
    ).toBe(true);
  });
  it("blocks cancellation at the exact cutoff, after start, and for a host or non-registered viewer", () => {
    expect(
      canCancelRegistration(
        {
          ...registered,
          cancellation_deadline_at: new Date(now).toISOString()
        },
        now
      )
    ).toBe(false);
    expect(
      canCancelRegistration(
        {
          ...registered,
          starts_at: new Date(now).toISOString(),
          cancellation_deadline_at: null
        },
        now
      )
    ).toBe(false);
    expect(
      canCancelRegistration({ ...registered, viewer_is_host: true }, now)
    ).toBe(false);
    expect(
      canCancelRegistration({ ...registered, viewer_registration: null }, now)
    ).toBe(false);
  });
  it("sends only the session ID and validates cancellation confirmation", async () => {
    vi.mocked(cancelRegistrationRecord).mockResolvedValueOnce({
      status: "cancelled",
      confirmed_count: 3
    });
    expect(await cancelRegistration(registered.id)).toEqual({
      status: "cancelled",
      confirmed_count: 3
    });
    expect(cancelRegistrationRecord).toHaveBeenCalledWith(registered.id);
  });
  it("does not report a malformed response as success", async () => {
    vi.mocked(cancelRegistrationRecord).mockResolvedValueOnce({
      status: "confirmed"
    });
    await expect(cancelRegistration(registered.id)).rejects.toThrow();
    expect(cancelRegistrationError({ message: "CANCEL_DEADLINE" })).toContain(
      "still confirmed"
    );
  });
});
