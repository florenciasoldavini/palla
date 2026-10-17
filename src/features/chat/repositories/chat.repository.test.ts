import { beforeEach, describe, expect, it, vi } from "vitest";
import { watchTyping } from "./chat.repository";

const mock = vi.hoisted(() => ({
  rpc: vi.fn(),
  setAuth: vi.fn(),
  channel: vi.fn(),
  removeChannel: vi.fn()
}));
vi.mock("@/infrastructure/supabase/repository-helpers", () => ({
  requireSupabase: () => ({
    rpc: mock.rpc,
    realtime: { setAuth: mock.setAuth },
    channel: mock.channel,
    removeChannel: mock.removeChannel
  }),
  toRepositoryError: (error: unknown) => error
}));
const actor = "11111111-1111-4111-8111-111111111111";
const peer = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  vi.resetAllMocks();
  mock.rpc.mockResolvedValue({ data: `chat-typing:${actor}:0`, error: null });
});
describe("private typing channel lifecycle", () => {
  it("does not join a stale account's channel if auth completes after cleanup", async () => {
    let resolve!: () => void;
    mock.setAuth.mockReturnValue(
      new Promise<void>((done) => {
        resolve = done;
      })
    );
    const handle = watchTyping(actor, actor, peer, "test-token", vi.fn());
    handle.stop();
    resolve();
    await Promise.resolve();
    expect(mock.channel).not.toHaveBeenCalled();
  });
  it("ignores malformed/self payloads and late events after leaving", async () => {
    let receive!: (value: { payload: unknown }) => void;
    let status!: (value: string) => void;
    const channel = {
      on: vi.fn((_kind: string, _filter: unknown, handler: typeof receive) => {
        receive = handler;
        return channel;
      }),
      subscribe: vi.fn((handler: typeof status) => {
        status = handler;
        return channel;
      }),
      send: vi.fn().mockResolvedValue("ok")
    };
    mock.setAuth.mockResolvedValue(undefined);
    mock.channel.mockReturnValue(channel);
    const change = vi.fn();
    const handle = watchTyping(actor, actor, peer, "test-token", change);
    for (let i = 0; i < 6; i++) await Promise.resolve();
    expect(mock.channel).toHaveBeenCalledWith(`chat-typing:${actor}:0`, {
      config: { private: true, broadcast: { self: false } }
    });
    status("SUBSCRIBED");
    receive({ payload: { actor_id: actor, typing: true } });
    receive({ payload: { actor_id: peer, typing: true, body: "draft" } });
    expect(change).not.toHaveBeenCalled();
    receive({ payload: { actor_id: peer, typing: true } });
    expect(change).toHaveBeenLastCalledWith(true);
    handle.setTyping(true);
    expect(channel.send).toHaveBeenLastCalledWith({
      type: "broadcast",
      event: "typing",
      payload: { actor_id: actor, typing: true }
    });
    handle.stop();
    expect(channel.send).toHaveBeenLastCalledWith({
      type: "broadcast",
      event: "typing",
      payload: { actor_id: actor, typing: false }
    });
    change.mockClear();
    receive({ payload: { actor_id: peer, typing: true } });
    expect(change).not.toHaveBeenCalled();
    expect(mock.removeChannel).toHaveBeenCalledWith(channel);
  });
});
