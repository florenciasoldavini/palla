import { describe, expect, it, vi } from "vitest";
import { createChatLocalRepository } from "../repositories/chat-local.repository";
import { OutboxRunner } from "./outbox-runner";
import { OutboxSendError } from "../offline-errors";
vi.mock("@/infrastructure/local-storage/durable-store", () => ({
  durableStore: {}
}));
const actor = "90000000-0000-4000-8000-000000000001",
  peer = "90000000-0000-4000-8000-000000000002",
  conversation = "90000000-0000-4000-8000-000000000003",
  other = "90000000-0000-4000-8000-000000000007";
const id = (n: number) =>
  `91000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
function fixture() {
  const disk = new Map<string, string>();
  let fail = false;
  const storage = {
    get: async (key: string) => disk.get(key) ?? null,
    set: async (key: string, value: string) => {
      if (fail) throw Error("disk full");
      disk.set(key, value);
    },
    remove: async (key: string) => {
      disk.delete(key);
    }
  };
  return {
    repository: createChatLocalRepository(storage),
    storage,
    fail: (value: boolean) => {
      fail = value;
    }
  };
}
describe("durable drafts and outbox", () => {
  it("serializes rapid draft writes and atomically moves text to the queue", async () => {
    const { repository: r, storage } = fixture();
    await Promise.all([
      r.saveDraft(actor, conversation, "H"),
      r.saveDraft(actor, conversation, "Hello")
    ]);
    await r.enqueue(actor, {
      id: id(1),
      conversation_id: conversation,
      body: "Hello"
    });
    const restarted = createChatLocalRepository(storage);
    expect((await restarted.load(actor)).drafts[conversation]).toBeUndefined();
    expect((await restarted.load(actor)).outbox[0].body).toBe("Hello");
  });
  it("keeps drafts on failed enqueue and isolates accounts/conversations", async () => {
    const f = fixture(),
      r = f.repository;
    await r.saveDraft(actor, conversation, "keep me");
    await r.saveDraft(actor, other, "other draft");
    await r.saveDraft(peer, conversation, "peer draft");
    f.fail(true);
    await expect(
      r.enqueue(actor, {
        id: id(1),
        conversation_id: conversation,
        body: "keep me"
      })
    ).rejects.toThrow();
    f.fail(false);
    expect((await r.load(actor)).drafts[conversation]).toBe("keep me");
    await r.forget(actor, conversation);
    expect((await r.load(actor)).drafts[other]).toBe("other draft");
    expect((await r.load(peer)).drafts[conversation]).toBe("peer draft");
  });
  it("recovers interrupted sends and preserves UUIDs across ambiguous acceptance", async () => {
    const { repository: r, storage } = fixture();
    await r.enqueue(actor, {
      id: id(1),
      conversation_id: conversation,
      body: "only once"
    });
    await r.patch(actor, id(1), { state: "sending" });
    const restarted = createChatLocalRepository(storage);
    await restarted.recover(actor);
    const server = new Set<string>([id(1)]);
    const send = vi.fn(async (_actor, row) => {
      server.add(row.id);
    });
    const runner = new OutboxRunner(restarted, send);
    runner.configure(actor, true);
    await runner.idle();
    expect(server.size).toBe(1);
    expect(send.mock.calls[0][1].id).toBe(id(1));
    expect((await r.load(actor)).outbox).toEqual([]);
  });
  it("backs off temporary failures, preserves conversation order and lets another chat send", async () => {
    const { repository: r } = fixture();
    let now = 1000;
    let online = false;
    const sent: string[] = [];
    for (const [n, c] of [
      [1, conversation],
      [2, conversation],
      [3, other]
    ] as const)
      await r.enqueue(actor, {
        id: id(n),
        conversation_id: c,
        body: `message ${n}`
      });
    const runner = new OutboxRunner(
      r,
      async (_actor, row) => {
        if (row.id === id(1) && !online) throw new OutboxSendError(true);
        sent.push(row.id);
      },
      () => now
    );
    runner.configure(actor, true);
    await runner.idle();
    expect(sent).toEqual([id(3)]);
    online = true;
    runner.wake();
    await runner.idle();
    expect(sent).toEqual([id(3)]);
    now += 2001;
    runner.wake();
    await runner.idle();
    expect(sent).toEqual([id(3), id(1), id(2)]);
  });
  it("retains permanent failures for explicit retry/removal without overtaking", async () => {
    const { repository: r } = fixture();
    await r.enqueue(actor, {
      id: id(1),
      conversation_id: conversation,
      body: "rejected"
    });
    await r.enqueue(actor, {
      id: id(2),
      conversation_id: conversation,
      body: "next"
    });
    const send = vi.fn(async () => {
      throw new OutboxSendError(false);
    });
    const runner = new OutboxRunner(r, send);
    runner.configure(actor, true);
    await runner.idle();
    runner.wake();
    await runner.idle();
    expect(send).toHaveBeenCalledTimes(1);
    expect((await r.load(actor)).outbox[0].state).toBe("failed");
    await r.discard(actor, id(1));
    runner.wake();
    await runner.idle();
    expect(send).toHaveBeenCalledTimes(2);
  });
  it("does not run offline or send an old account's next message after switching", async () => {
    const { repository: r } = fixture();
    for (const n of [1, 2])
      await r.enqueue(actor, {
        id: id(n),
        conversation_id: conversation,
        body: "old account"
      });
    let entered!: () => void, release!: () => void;
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const send = vi.fn(async (_actor, _row, signal) => {
      entered();
      await gate;
      if (signal.aborted) throw new OutboxSendError(true);
    });
    const runner = new OutboxRunner(r, send);
    runner.configure(actor, false);
    await runner.idle();
    expect(send).not.toHaveBeenCalled();
    runner.configure(actor, true);
    await started;
    runner.configure(peer, true);
    release();
    await runner.idle();
    expect(send).toHaveBeenCalledTimes(1);
    expect((await r.load(actor)).outbox).toHaveLength(2);
    expect((await r.load(peer)).outbox).toHaveLength(0);
    runner.configure(undefined, false);
  });
  it("fences chat deletion against an in-flight send and clears only its local data", async () => {
    const { repository: r } = fixture();
    await r.saveDraft(actor, conversation, "draft");
    await r.enqueue(actor, {
      id: id(1),
      conversation_id: conversation,
      body: "waiting"
    });
    let entered!: () => void;
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const runner = new OutboxRunner(r, async (_actor, _row, signal) => {
      entered();
      await new Promise<void>((resolve) =>
        signal.addEventListener("abort", () => resolve(), { once: true })
      );
      throw new OutboxSendError(true);
    });
    runner.configure(actor, true);
    await started;
    const resume = await runner.pauseConversation(conversation);
    await r.forget(actor, conversation);
    resume();
    await runner.idle();
    expect((await r.load(actor)).outbox).toEqual([]);
    runner.configure(undefined, false);
  });
  it("does not dispatch a row removed between selection and claiming", async () => {
    const { repository: r } = fixture();
    await r.enqueue(actor, {
      id: id(1),
      conversation_id: conversation,
      body: "cancel me"
    });
    let loaded!: () => void, release!: () => void;
    const began = new Promise<void>((resolve) => {
      loaded = resolve;
    });
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const load = r.load;
    let first = true;
    r.load = async (account) => {
      const state = await load(account);
      if (first) {
        first = false;
        loaded();
        await gate;
      }
      return state;
    };
    const send = vi.fn(async () => {});
    const runner = new OutboxRunner(r, send);
    runner.configure(actor, true);
    await began;
    await r.discard(actor, id(1));
    release();
    await runner.idle();
    expect(send).not.toHaveBeenCalled();
  });
});

describe("durable reply references", () => {
  it("restores a reply draft and atomically keeps the target in a queued send", async () => {
    const { repository: r, storage } = fixture();
    await r.saveDraft(actor, conversation, "Reply text");
    await r.saveReply(actor, conversation, id(9));
    const restarted = createChatLocalRepository(storage);
    expect((await restarted.load(actor)).replies[conversation]).toBe(id(9));
    expect((await restarted.load(peer)).replies[conversation]).toBeUndefined();
    await restarted.enqueue(actor, {
      id: id(1),
      conversation_id: conversation,
      body: "Reply text",
      reply_to_id: id(9)
    });
    const state = await createChatLocalRepository(storage).load(actor);
    expect(state.drafts[conversation]).toBeUndefined();
    expect(state.replies[conversation]).toBeUndefined();
    expect(state.outbox[0].reply_to_id).toBe(id(9));
    await expect(
      r.enqueue(actor, {
        id: id(1),
        conversation_id: conversation,
        body: "Reply text",
        reply_to_id: id(8)
      })
    ).rejects.toThrow("Message identity conflict");
  });
  it("keeps the reply target when a durable write fails and clears it with chat deletion", async () => {
    const f = fixture();
    await f.repository.saveReply(actor, conversation, id(9));
    f.fail(true);
    await expect(
      f.repository.enqueue(actor, {
        id: id(1),
        conversation_id: conversation,
        body: "reply",
        reply_to_id: id(9)
      })
    ).rejects.toThrow();
    f.fail(false);
    expect((await f.repository.load(actor)).replies[conversation]).toBe(id(9));
    await f.repository.forget(actor, conversation);
    expect(
      (await f.repository.load(actor)).replies[conversation]
    ).toBeUndefined();
  });
});
