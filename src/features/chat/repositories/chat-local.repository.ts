import { z } from "zod";
import {
  durableStore,
  type DurableStore
} from "@/infrastructure/local-storage/durable-store";
import { entityIdSchema } from "@/types/domain-schema";
import { messageBodySchema } from "../domain";
import { localPhotoSchema, type LocalPhoto } from "../attachment-domain";
const entrySchema = z
  .object({
    id: entityIdSchema,
    conversation_id: entityIdSchema,
    body: z.string().trim().max(4000),
    photo: localPhotoSchema.optional(),
    reply_to_id: entityIdSchema.nullable().optional(),
    created_at: z.string(),
    order: z.number().int(),
    state: z.enum(["queued", "sending", "failed"]),
    attempts: z.number().int().nonnegative(),
    nextAttempt: z.number(),
    failure: z.enum(["connection", "rejected"]).nullable()
  })
  .refine((row) => !!row.body || !!row.photo, "Message needs text or a photo");
const stateSchema = z.object({
  version: z.literal(1),
  nextOrder: z.number().int(),
  drafts: z.record(z.string(), z.string().max(4000)),
  replies: z.record(z.string(), entityIdSchema).default({}),
  outbox: z.array(entrySchema)
});
export type OutboxEntry = z.infer<typeof entrySchema>;
export type LocalChatState = z.infer<typeof stateSchema>;
const empty = (): LocalChatState => ({
  version: 1,
  nextOrder: 1,
  drafts: {},
  replies: {},
  outbox: []
});
export function createChatLocalRepository(storage: DurableStore) {
  let chain: Promise<unknown> = Promise.resolve();
  const listeners = new Set<() => void>();
  const key = (actor: string) => `chat-local-v1:${entityIdSchema.parse(actor)}`;
  const read = async (actor: string) => {
    const raw = await storage.get(key(actor));
    return raw ? stateSchema.parse(JSON.parse(raw)) : empty();
  };
  // All read-modify-write operations share a lane, including rapid keystrokes and enqueue.
  function serial<T>(work: () => Promise<T>): Promise<T> {
    const result = chain.then(work);
    chain = result.catch(() => undefined);
    return result;
  }
  function update<T>(actor: string, change: (state: LocalChatState) => T) {
    return serial(async () => {
      const state = await read(actor);
      const result = change(state);
      await storage.set(key(actor), JSON.stringify(state));
      listeners.forEach((fn) => fn());
      return result;
    });
  }
  return {
    subscribe(fn: () => void) {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    load: (actor: string) => serial(() => read(actor)),
    saveDraft: (actor: string, id: string, body: string) =>
      update(actor, (state) => {
        entityIdSchema.parse(id);
        z.string().max(4000).parse(body);
        if (body) state.drafts[id] = body;
        else delete state.drafts[id];
      }),
    enqueue: (
      actor: string,
      input: {
        id: string;
        conversation_id: string;
        body: string;
        reply_to_id?: string | null;
        photo?: LocalPhoto;
      }
    ) =>
      update(actor, (state) => {
        const row = entrySchema.parse({
          ...input,
          body: input.photo
            ? z.string().trim().max(4000).parse(input.body)
            : messageBodySchema.parse(input.body),
          created_at: new Date().toISOString(),
          order: state.nextOrder,
          state: "queued",
          attempts: 0,
          nextAttempt: 0,
          failure: null
        });
        const existing = state.outbox.find((r) => r.id === row.id);
        if (existing) {
          if (
            existing.body !== row.body ||
            existing.conversation_id !== row.conversation_id ||
            (existing.reply_to_id ?? null) !== (row.reply_to_id ?? null) ||
            JSON.stringify(existing.photo) !== JSON.stringify(row.photo)
          )
            throw Error("Message identity conflict");
          return existing;
        }
        if (state.outbox.length >= 100)
          throw Error("Queue is full. Send or remove waiting messages first.");
        state.outbox.push(row);
        state.nextOrder++;
        delete state.drafts[row.conversation_id];
        delete state.replies[row.conversation_id];
        return row;
      }),
    saveReply: (actor: string, conversation: string, target: string | null) =>
      update(actor, (state) => {
        entityIdSchema.parse(conversation);
        if (target) state.replies[conversation] = entityIdSchema.parse(target);
        else delete state.replies[conversation];
      }),
    claim: (actor: string, id: string) =>
      update(actor, (state) => {
        const row = state.outbox.find(
          (entry) => entry.id === id && entry.state === "queued"
        );
        if (!row) return undefined;
        row.state = "sending";
        row.attempts++;
        return { ...row };
      }),
    patch: (
      actor: string,
      id: string,
      patch: Partial<
        Pick<OutboxEntry, "state" | "attempts" | "nextAttempt" | "failure">
      >
    ) =>
      update(actor, (state) => {
        const row = state.outbox.find((r) => r.id === id);
        if (row) Object.assign(row, patch);
      }),
    complete: (actor: string, id: string) =>
      update(actor, (state) => {
        state.outbox = state.outbox.filter((r) => r.id !== id);
      }),
    discard: (actor: string, id: string) =>
      update(actor, (state) => {
        if (state.outbox.some((r) => r.id === id && r.state === "sending"))
          throw Error("Message is sending");
        state.outbox = state.outbox.filter((r) => r.id !== id);
      }),
    recover: (actor: string) =>
      update(actor, (state) => {
        state.outbox.forEach((r) => {
          if (r.state === "sending") {
            r.state = "queued";
            r.nextAttempt = 0;
          }
        });
      }),
    forget: (actor: string, id: string) =>
      update(actor, (state) => {
        delete state.drafts[id];
        delete state.replies[id];
        state.outbox = state.outbox.filter((r) => r.conversation_id !== id);
      })
  };
}
export const chatLocalRepository = createChatLocalRepository(durableStore);
export type ChatLocalRepository = ReturnType<typeof createChatLocalRepository>;
