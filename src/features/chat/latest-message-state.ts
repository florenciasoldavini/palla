import type { ChatMessage } from "./domain";

export type LatestMessageState = {
  through: string | null;
  newIds: string[];
};

// A sequence watermark distinguishes new arrivals from older pagination,
// refreshed message objects, edits and reaction updates.
export function advanceLatestMessages(
  state: LatestMessageState,
  messages: ChatMessage[],
  actorId: string,
  away: boolean
): LatestMessageState {
  let through = BigInt(state.through ?? "0");
  for (const message of messages) {
    if (BigInt(message.sequence) > through) through = BigInt(message.sequence);
  }
  const live = new Set(messages.filter((m) => !m.deleted_at).map((m) => m.id));
  const newIds = new Set(away ? state.newIds.filter((id) => live.has(id)) : []);
  if (away && state.through !== null) {
    for (const message of messages) {
      if (
        message.sender_id !== actorId &&
        !message.deleted_at &&
        BigInt(message.sequence) > BigInt(state.through)
      )
        newIds.add(message.id);
    }
  }
  return { through: through.toString(), newIds: [...newIds] };
}
