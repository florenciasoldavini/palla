import type {
  ChatLocalRepository,
  OutboxEntry
} from "../repositories/chat-local.repository";
import { OutboxSendError } from "../offline-errors";
export function nextOutboxEntry(
  rows: OutboxEntry[],
  now: number,
  blocked: Set<string>
) {
  const seen = new Set<string>();
  return [...rows]
    .sort((a, b) => a.order - b.order)
    .find((row) => {
      if (seen.has(row.conversation_id)) return false;
      seen.add(row.conversation_id);
      return (
        !blocked.has(row.conversation_id) &&
        row.state === "queued" &&
        row.nextAttempt <= now
      );
    });
}
export class OutboxRunner {
  private actor?: string;
  private enabled = false;
  private generation = 0;
  private running?: Promise<void>;
  private request?: { id: string; controller: AbortController };
  private blocked = new Set<string>();
  constructor(
    private repository: ChatLocalRepository,
    private send: (
      actor: string,
      row: OutboxEntry,
      signal: AbortSignal
    ) => Promise<void>,
    private now = Date.now,
    private completed?: (actor: string, row: OutboxEntry) => Promise<void>
  ) {}
  configure(actor: string | undefined, enabled: boolean) {
    if (this.actor !== actor || this.enabled !== enabled) {
      this.generation++;
      this.request?.controller.abort();
    }
    this.actor = actor;
    this.enabled = enabled;
    if (enabled) this.wake();
  }
  wake() {
    if (this.running || !this.actor || !this.enabled) return;
    const actor = this.actor,
      generation = this.generation;
    this.running = this.drain(actor, generation)
      .catch(() => undefined)
      .finally(() => {
        this.running = undefined;
        if (generation !== this.generation && this.enabled) this.wake();
      });
  }
  async idle() {
    await this.running;
  }
  async pauseConversation(id: string) {
    this.blocked.add(id);
    if (this.request?.id === id) this.request.controller.abort();
    await this.running;
    return () => {
      this.blocked.delete(id);
      this.wake();
    };
  }
  private async drain(actor: string, generation: number) {
    const current = () =>
      this.actor === actor && this.enabled && this.generation === generation;
    while (current()) {
      const entries = (await this.repository.load(actor)).outbox;
      if (!current()) return;
      if (entries.some((row) => row.state === "sending")) {
        await this.repository.recover(actor);
        continue;
      }
      const row = nextOutboxEntry(entries, this.now(), this.blocked);
      if (!row || !current()) return;
      const claimed = await this.repository.claim(actor, row.id);
      if (!claimed) continue;
      const controller = new AbortController();
      this.request = { id: row.conversation_id, controller };
      const timeout = setTimeout(
        () => controller.abort(),
        row.photo ? 60000 : 15000
      );
      try {
        if (!current() || this.blocked.has(row.conversation_id))
          throw new OutboxSendError(true);
        await this.send(actor, row, controller.signal);
        await this.repository.complete(actor, row.id);
        await this.completed?.(actor, row).catch(() => undefined);
      } catch (error) {
        const retryable =
          !(error instanceof OutboxSendError) || error.retryable;
        await this.repository.patch(actor, row.id, {
          state: retryable ? "queued" : "failed",
          failure: retryable ? "connection" : "rejected",
          nextAttempt:
            this.now() + Math.min(60000, 2000 * 2 ** Math.min(row.attempts, 5))
        });
        if (!current()) return;
      } finally {
        clearTimeout(timeout);
        this.request = undefined;
      }
    }
  }
}
