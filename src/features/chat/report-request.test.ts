import { describe, expect, it, vi } from "vitest";
import { createReportHandler } from "../../../supabase/functions/chat-report/request";
const body = {
  id: "99100000-0000-4000-8002-000000000001",
  conversation_id: "99100000-0000-4000-8000-000000000003",
  reason: "spam",
  details: "Details",
  block: false
};
function setup() {
  const authenticate = vi.fn().mockResolvedValue("trusted-user"),
    submit = vi.fn().mockResolvedValue({
      data: { id: body.id, blocked: false },
      error: null
    });
  return {
    authenticate,
    submit,
    run: createReportHandler({ available: true, authenticate, submit })
  };
}
const request = (value: unknown = body, authorization = "Bearer token") =>
  new Request("https://example.test/report", {
    method: "POST",
    headers: { Authorization: authorization },
    body: JSON.stringify(value)
  });
describe("report submission boundary", () => {
  it("uses the verified identity and never a client-supplied reporter/evidence", async () => {
    const { run, submit } = setup();
    expect((await run(request())).status).toBe(200);
    expect(submit).toHaveBeenCalledWith(body, "trusted-user");
    for (const extra of [
      { reporter_id: "someone" },
      { messages: [{ body: "fabricated" }] }
    ])
      expect((await run(request({ ...body, ...extra }))).status).toBe(400);
    expect(submit).toHaveBeenCalledTimes(1);
  });
  it("rejects missing/invalid authentication without submitting", async () => {
    const { run, submit, authenticate } = setup();
    expect((await run(request(body, ""))).status).toBe(401);
    authenticate.mockResolvedValue(null);
    expect((await run(request())).status).toBe(401);
    expect(submit).not.toHaveBeenCalled();
  });
  it("bounds payloads and rejects unsupported reasons or malformed input", async () => {
    const { run, submit } = setup();
    for (const value of [
      { ...body, reason: "unknown" },
      { ...body, block: "true" },
      { ...body, details: "x".repeat(2001) },
      { ...body, id: "invalid" },
      null
    ])
      expect((await run(request(value))).status).toBe(400);
    expect(
      (await run(request({ ...body, details: "x".repeat(17000) }))).status
    ).toBe(400);
    expect(submit).not.toHaveBeenCalled();
  });
  it("returns actionable rate limits and conceals database diagnostics", async () => {
    const { run, submit } = setup();
    submit.mockResolvedValue({
      data: null,
      error: { code: "P0001", message: "Report limit reached" }
    });
    expect((await run(request())).status).toBe(429);
    submit.mockResolvedValue({
      data: null,
      error: { code: "XX000", message: "secret SQL detail" }
    });
    const result = await run(request());
    expect(result.status).toBe(503);
    expect(await result.json()).toEqual({ error: "unavailable" });
  });
  it("does not submit on preflight or wrong method", async () => {
    const { run, submit } = setup();
    expect(
      (await run(new Request("https://example.test", { method: "OPTIONS" })))
        .status
    ).toBe(200);
    expect((await run(new Request("https://example.test"))).status).toBe(405);
    expect(submit).not.toHaveBeenCalled();
  });
});
