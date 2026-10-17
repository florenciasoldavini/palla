import { describe, expect, it, vi } from "vitest";
import { runPushWorker } from "../../../supabase/functions/chat-push/worker";
const job = {
  id: "job",
  attempt: 1,
  token: "ExpoPushToken[fake]",
  conversation_id: "conversation",
  message_id: "message",
  recipient_id: "recipient",
  sender_name: "Carlos M.",
  message_preview: "Perfect, see you at the club! 🎾"
};
function setup(
  jobs = [job],
  receipts: { id: string; ticket_id: string }[] = []
) {
  const rpc = vi.fn(async (name: string) =>
    name === "claim_chat_push_jobs"
      ? jobs
      : name === "claim_chat_push_receipts"
        ? receipts
        : null
  );
  return rpc;
}
describe("push delivery worker", () => {
  it("sends only committed job destinations and records provider tickets", async () => {
    const rpc = setup();
    const fetcher = vi.fn(
      async (_url: string | URL | Request, _options?: RequestInit) =>
        Response.json({ data: [{ status: "ok", id: "ticket" }] })
    );
    await runPushWorker({ rpc, fetcher: fetcher as typeof fetch });
    const payload = JSON.parse(fetcher.mock.calls[0][1]!.body as string);
    expect(payload[0].data).toEqual({
      type: "chat_message",
      conversation_id: "conversation",
      message_id: "message",
      recipient_id: "recipient"
    });
    expect(payload[0].title).toBe("Carlos M.");
    expect(payload[0].body).toBe("Perfect, see you at the club! 🎾");
    expect(rpc).toHaveBeenCalledWith("finish_chat_push_job", {
      p_id: "job",
      p_attempt: 1,
      p_ticket: "ticket",
      p_error: null,
      p_retry: false
    });
  });
  it("normalizes multiline previews and uses safe fallbacks for missing content", async () => {
    const rpc = setup([
      {
        ...job,
        sender_name: "  Carlos\n M.  ",
        message_preview: "  Court 2\nstarts\tat 19:30! 🎾  "
      },
      { ...job, id: "legacy-job", sender_name: " ", message_preview: " " }
    ]);
    const fetcher = vi.fn(
      async (_url: string | URL | Request, _options?: RequestInit) =>
        Response.json({
          data: [
            { status: "ok", id: "t1" },
            { status: "ok", id: "t2" }
          ]
        })
    );
    await runPushWorker({ rpc, fetcher });
    const payload = JSON.parse(fetcher.mock.calls[0][1]!.body as string);
    expect(payload[0]).toMatchObject({
      title: "Carlos M.",
      body: "Court 2 starts at 19:30! 🎾"
    });
    expect(payload[1]).toMatchObject({
      title: "New message",
      body: "Sent you a message."
    });
  });
  it("bounds long Unicode payloads without breaking emoji clusters", async () => {
    const emoji = "👩🏽‍🤝‍👩🏻";
    const rpc = setup([
      {
        ...job,
        sender_name: "C".repeat(4000),
        message_preview: emoji.repeat(4000)
      }
    ]);
    const fetcher = vi.fn(
      async (_url: string | URL | Request, _options?: RequestInit) =>
        Response.json({ data: [{ status: "ok", id: "t" }] })
    );
    await runPushWorker({ rpc, fetcher });
    const raw = fetcher.mock.calls[0][1]!.body as string;
    const [payload] = JSON.parse(raw);
    expect(payload.title).toBe("C".repeat(60) + "…");
    expect(payload.body.endsWith("…")).toBe(true);
    expect(payload.body.slice(0, -1).split(emoji).join("")).toBe("");
    expect(new TextEncoder().encode(raw).length).toBeLessThan(4096);
    expect(JSON.stringify(payload.data)).not.toContain("Carlos");
  });
  it("retries transport errors without recording successful delivery", async () => {
    const rpc = setup();
    await runPushWorker({
      rpc,
      fetcher: vi.fn(async () => {
        throw new Error("offline");
      })
    });
    expect(rpc).toHaveBeenCalledWith("finish_chat_push_job", {
      p_id: "job",
      p_attempt: 1,
      p_ticket: null,
      p_error: "ProviderUnavailable",
      p_retry: true
    });
  });
  it("disables unregistered tokens through ticket and receipt results", async () => {
    const rpc = setup([job], [{ id: "old-job", ticket_id: "old-ticket" }]);
    const fetcher = vi
      .fn(async () =>
        Response.json({
          data: [{ status: "error", details: { error: "DeviceNotRegistered" } }]
        })
      )
      .mockResolvedValueOnce(
        Response.json({
          data: [{ status: "error", details: { error: "DeviceNotRegistered" } }]
        })
      )
      .mockResolvedValueOnce(
        Response.json({
          data: {
            "old-ticket": {
              status: "error",
              details: { error: "DeviceNotRegistered" }
            }
          }
        })
      );
    await runPushWorker({ rpc, fetcher });
    expect(rpc).toHaveBeenCalledWith("finish_chat_push_job", {
      p_id: "job",
      p_attempt: 1,
      p_ticket: null,
      p_error: "DeviceNotRegistered",
      p_retry: false
    });
    expect(rpc).toHaveBeenCalledWith("finish_chat_push_receipt", {
      p_id: "old-job",
      p_error: "DeviceNotRegistered"
    });
  });
  it("waits for receipts not yet available and sends nothing for an empty queue", async () => {
    const rpc = setup([], [{ id: "j", ticket_id: "t" }]);
    const fetcher = vi.fn(async () => Response.json({ data: {} }));
    await runPushWorker({ rpc, fetcher });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(rpc).not.toHaveBeenCalledWith(
      "finish_chat_push_receipt",
      expect.anything()
    );
  });
});
