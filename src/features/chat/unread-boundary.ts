import type { ChatMessage } from "./domain";

export type UnreadEntry = { through: string; latest: string };

/** Use the entry snapshot, never the live receipt which advances while reading. */
export function unreadDividerMessageId(
  messages: ChatMessage[],
  actorId: string,
  entry: UnreadEntry | null,
  hasEarlier: boolean
): string | null {
  if (!entry || !messages.length) return null;
  const through = BigInt(entry.through);
  const latest = BigInt(entry.latest);
  const oldest = messages.reduce((a, b) =>
    BigInt(a.sequence) < BigInt(b.sequence) ? a : b
  );
  // The first unread might be on an unloaded page. Don't label a later one.
  if (hasEarlier && BigInt(oldest.sequence) > through) return null;
  let first: ChatMessage | undefined;
  for (const message of messages) {
    const sequence = BigInt(message.sequence);
    if (
      message.sender_id !== actorId &&
      !message.deleted_at &&
      sequence > through &&
      sequence <= latest &&
      (!first || sequence < BigInt(first.sequence))
    )
      first = message;
  }
  return first?.id ?? null;
}
