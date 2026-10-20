import type { CancellationContext } from "./domain";
const id = (n: number) =>
  `ca000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
export function cancellationPreviewContext(): CancellationContext {
  const now = Date.now();
  return {
    session_id: id(1),
    session_title: "Friday Social Padel",
    organizer_id: id(2),
    starts_at: new Date(now + 3 * 86400000).toISOString(),
    ends_at: new Date(now + 3 * 86400000 + 5400000).toISOString(),
    timezone: "America/Argentina/Buenos_Aires",
    venue_name: "Riverside Padel Club",
    host_name: "Alex Rivera",
    host_avatar_url: null,
    updated_at: new Date(now).toISOString(),
    can_cancel: true,
    confirmed_count: 8,
    waitlisted_count: 2,
    recipients: [
      "Marcos Silva",
      "Elena Vega",
      "Diego Klein",
      "Laura Ruiz",
      "Sofia Torres"
    ].map((name, i) => ({ id: id(i + 10), name, image_url: null })),
    cancellation_id: null,
    cancelled_at: null,
    reason_code: null,
    message: null,
    recipient_status: null
  };
}
