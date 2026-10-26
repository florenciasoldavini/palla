export function parseWelcomeName(body: unknown): string | undefined {
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw Error("Invalid welcome request");
  const name = (body as Record<string, unknown>).name;
  if (name === undefined) return undefined;
  if (typeof name !== "string" || name.trim().length > 80)
    throw Error("Invalid welcome name");
  return name.trim() || undefined;
}

type Claim =
  | { state: "sent"; sent_at: string }
  | { state: "busy" }
  | { state: "claimed"; token: string; name: string };
export async function deliverWelcomeEmail(deps: {
  claim: () => Promise<Claim>;
  send: (name: string) => Promise<{ id?: string }>;
  finish: (token: string) => Promise<string>;
  release: (token: string) => Promise<void>;
}) {
  const claim = await deps.claim();
  if (claim.state === "sent")
    return { ok: true, skipped: true, welcome_email_sent_at: claim.sent_at };
  if (claim.state === "busy")
    throw Error("Welcome email is already sending. Try again shortly.");
  try {
    const sent = await deps.send(claim.name);
    const sentAt = await deps.finish(claim.token);
    return {
      ok: true,
      skipped: false,
      id: sent.id,
      welcome_email_sent_at: sentAt
    };
  } catch (error) {
    await deps.release(claim.token).catch(() => undefined);
    throw error;
  }
}
