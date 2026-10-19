import { describe, expect, it, vi } from "vitest";
import { runReviewPushWorker } from "../../../supabase/functions/chat-push/review-worker";
const job = {
  id: "job",
  attempt: 2,
  token: "ExpoPushToken[fake]",
  notification_id: "notification",
  recipient_id: "recipient",
  mode: "player",
  title: "How was your session?",
  body: "Share your experience at Saturday social padel."
};
const setup = (receipts: { id: string; ticket_id: string }[] = []) =>
  vi.fn(async (name: string) =>
    name === "claim_review_notification_push_jobs"
      ? [job]
      : name === "claim_review_notification_push_receipts"
        ? receipts
        : null
  );
describe("review push transport", () => {
  it("uses server-owned targets, the reviews channel, and records the attempt ticket", async () => {
    const rpc = setup(),
      fetcher = vi.fn(
        async (_url: string | URL | Request, _options?: RequestInit) =>
          Response.json({ data: [{ status: "ok", id: "ticket" }] })
      );
    await runReviewPushWorker({ rpc, fetcher: fetcher as typeof fetch });
    const payload = JSON.parse(fetcher.mock.calls[0][1]!.body as string)[0];
    expect(payload).toMatchObject({
      title: job.title,
      body: job.body,
      channelId: "reviews",
      data: {
        type: "review_notification",
        notification_id: "notification",
        recipient_id: "recipient",
        mode: "player"
      }
    });
    expect(rpc).toHaveBeenCalledWith("finish_review_notification_push_job", {
      p_id: "job",
      p_attempt: 2,
      p_ticket: "ticket",
      p_error: null,
      p_retry: false
    });
  });
  it("retries transport failures but not invalid device tokens", async () => {
    const rpc = setup();
    await runReviewPushWorker({
      rpc,
      fetcher: vi.fn(async () => {
        throw Error("offline");
      }) as typeof fetch
    });
    expect(rpc).toHaveBeenCalledWith(
      "finish_review_notification_push_job",
      expect.objectContaining({ p_retry: true, p_error: "ProviderUnavailable" })
    );
    rpc.mockClear();
    await runReviewPushWorker({
      rpc,
      fetcher: vi.fn(async () =>
        Response.json({
          data: [{ status: "error", details: { error: "DeviceNotRegistered" } }]
        })
      ) as typeof fetch
    });
    expect(rpc).toHaveBeenCalledWith(
      "finish_review_notification_push_job",
      expect.objectContaining({
        p_retry: false,
        p_error: "DeviceNotRegistered"
      })
    );
  });
  it("resolves receipts without logging private notification content", async () => {
    const rpc = setup([{ id: "receipt-job", ticket_id: "t" }]);
    const fetcher = vi.fn(async (url: string | URL | Request) =>
      Response.json({
        data: String(url).endsWith("getReceipts")
          ? { t: { status: "ok" } }
          : [{ status: "ok", id: "ticket" }]
      })
    );
    await runReviewPushWorker({ rpc, fetcher: fetcher as typeof fetch });
    expect(rpc).toHaveBeenCalledWith(
      "finish_review_notification_push_receipt",
      { p_id: "receipt-job", p_error: null }
    );
  });
});

it("sends announcements through their own Android channel and typed target", async () => {
  const rpc = vi.fn(async (name: string) =>
    name === "claim_review_notification_push_jobs"
      ? [
          {
            ...job,
            kind: "session_announcements",
            title: "Announcement from Alex",
            body: "Court 3 today"
          }
        ]
      : []
  );
  const fetcher = vi.fn(
    async (_url: string | URL | Request, _options?: RequestInit) =>
      Response.json({ data: [{ status: "ok", id: "ticket" }] })
  );
  await runReviewPushWorker({ rpc, fetcher: fetcher as typeof fetch });
  const payload = JSON.parse(fetcher.mock.calls[0][1]!.body as string)[0];
  expect(payload).toMatchObject({
    channelId: "announcements",
    title: "Announcement from Alex",
    body: "Court 3 today",
    data: {
      type: "announcement_notification",
      notification_id: job.notification_id,
      recipient_id: job.recipient_id
    }
  });
});
