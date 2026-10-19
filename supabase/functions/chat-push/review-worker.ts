type Rpc = (name: string, args?: Record<string, unknown>) => Promise<unknown>;
type Job = {
  id: string;
  attempt: number;
  token: string;
  notification_id: string;
  recipient_id: string;
  mode: "player" | "organizer";
  title: string;
  body: string;
};
type Ticket = {
  status: "ok" | "error";
  id?: string;
  details?: { error?: string };
};
type Dependencies = { rpc: Rpc; fetcher: typeof fetch; accessToken?: string };
const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
const encoder = new TextEncoder();
function notificationText(
  value: string | null | undefined,
  limit: number,
  byteLimit: number,
  fallback: string
) {
  const text = value
    ?.replace(/\p{Cc}/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
  if (!text) return fallback;
  let result = "",
    count = 0;
  for (const { segment } of segmenter.segment(text)) {
    if (
      count >= limit ||
      encoder.encode(result + segment).length > byteLimit - 3
    ) {
      return result ? `${result}…` : fallback;
    }
    result += segment;
    count += 1;
  }
  return result;
}
export async function runReviewPushWorker({
  rpc,
  fetcher,
  accessToken
}: Dependencies) {
  const post = async (path: string, body: unknown) => {
    const response = await fetcher(`https://exp.host/--/api/v2/push/${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`ExpoHTTP${response.status}`);
    return await response.json();
  };
  const jobs = (await rpc("claim_review_notification_push_jobs")) as Job[];
  if (jobs.length) {
    let tickets: Ticket[] | undefined;
    try {
      const result = await post(
        "send",
        jobs.map((j) => ({
          to: j.token,
          title: notificationText(j.title, 60, 256, "Session review"),
          body: notificationText(
            j.body,
            180,
            768,
            "Open Palla to view your session review."
          ),
          sound: "default",
          channelId: "reviews",
          priority: "high",
          ttl: 3600,
          data: {
            type: "review_notification",
            notification_id: j.notification_id,
            mode: j.mode,
            recipient_id: j.recipient_id
          }
        }))
      );
      if (Array.isArray(result.data) && result.data.length === jobs.length)
        tickets = result.data;
    } catch {
      /* Bounded retry after transport/provider errors; no private payload logging. */
    }
    for (let i = 0; i < jobs.length; i++) {
      const ticket = tickets?.[i];
      const id =
        ticket?.status === "ok" && typeof ticket.id === "string"
          ? ticket.id
          : null;
      const error =
        ticket?.details?.error ?? (id ? null : "ProviderUnavailable");
      await rpc("finish_review_notification_push_job", {
        p_id: jobs[i].id,
        p_attempt: jobs[i].attempt,
        p_ticket: id,
        p_error: error,
        p_retry:
          !id &&
          (error === "ProviderUnavailable" || error === "MessageRateExceeded")
      });
    }
  }
  const receipts = (await rpc("claim_review_notification_push_receipts")) as {
    id: string;
    ticket_id: string;
  }[];
  if (receipts.length) {
    try {
      const result = await post("getReceipts", {
        ids: receipts.map((r) => r.ticket_id)
      });
      for (const receipt of receipts) {
        const value = result.data?.[receipt.ticket_id] as Ticket | undefined;
        if (value?.status === "ok" || value?.status === "error")
          await rpc("finish_review_notification_push_receipt", {
            p_id: receipt.id,
            p_error:
              value.status === "ok"
                ? null
                : (value.details?.error ?? "ReceiptError")
          });
      }
    } catch {
      /* Next scheduled pass retries receipts. */
    }
  }
  return { attempted: jobs.length, checked: receipts.length };
}
