import { cancelOccurrenceRecord } from "./repositories/cancellations.repository";
import { describe, expect, it, vi } from "vitest";
import {
  cancellationInputSchema,
  cancellationReasons,
  cancellationReasonCodes
} from "./domain";
const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ supabase: { rpc } }));
describe("cancellation input", () => {
  it("requires a known structured reason and keeps the message optional", () => {
    expect(cancellationInputSchema.safeParse({ message: "" }).success).toBe(
      false
    );
    expect(
      cancellationInputSchema.safeParse({
        reason_code: "rain-waiver",
        message: ""
      }).success
    ).toBe(false);
    expect(
      cancellationInputSchema.parse({ reason_code: "weather", message: "  " })
    ).toEqual({ reason_code: "weather", message: "" });
    expect(
      cancellationReasonCodes.every((code) => cancellationReasons[code])
    ).toBe(true);
  });
  it("bounds messages without assigning any reliability exemption", () => {
    expect(
      cancellationInputSchema.safeParse({
        reason_code: "other",
        message: "a".repeat(1001)
      }).success
    ).toBe(false);
    expect(
      cancellationInputSchema.parse({
        reason_code: "weather",
        message: " Outdoor courts closed "
      })
    ).toEqual({ reason_code: "weather", message: "Outdoor courts closed" });
  });
  it("always sends only the selected occurrence, even with an unexpected scope property", async () => {
    rpc.mockResolvedValue({ data: {}, error: null });
    const request = {
      session_id: "11111111-1111-4111-8111-111111111111",
      reason_code: "weather" as const,
      message: "Rain",
      expected_version: new Date().toISOString(),
      request_id: "11111111-1111-4111-8111-111111111112",
      expected_count: 10,
      scope: "future"
    };
    await cancelOccurrenceRecord(request);
    expect(rpc).toHaveBeenCalledWith(
      "cancel_session_occurrences",
      expect.objectContaining({
        p_scope: "one",
        p_session: request.session_id,
        p_expected_count: 10
      })
    );
  });
});
