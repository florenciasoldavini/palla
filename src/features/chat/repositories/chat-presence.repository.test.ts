import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { watchOnline } from "./chat-presence.repository";
const mock = vi.hoisted(() => ({
  rpc: vi.fn(),
  auth: vi.fn(),
  channel: vi.fn(),
  remove: vi.fn()
}));
vi.mock("@/infrastructure/supabase/repository-helpers", () => ({
  requireSupabase: () => ({
    rpc: mock.rpc,
    realtime: { setAuth: mock.auth },
    channel: mock.channel,
    removeChannel: mock.remove
  })
}));
const flush = async () => {
  for (let i = 0; i < 8; i++) await Promise.resolve();
};
function setup() {
  let sync!: () => void;
  let status!: (value: string) => void;
  let state: Record<
    string,
    { online: boolean; pulse: number; presence_ref?: string }[]
  > = {};
  const channel = {
    on: vi.fn((_type, _filter, callback) => {
      sync = callback;
      return channel;
    }),
    subscribe: vi.fn((callback) => {
      status = callback;
      return channel;
    }),
    presenceState: () => state,
    track: vi.fn().mockResolvedValue("ok")
  };
  mock.rpc.mockImplementation(async (_name, args) => ({
    data: `chat-online:${args.p_subject}:0`,
    error: null
  }));
  mock.auth.mockResolvedValue(undefined);
  mock.channel.mockReturnValue(channel);
  mock.remove.mockResolvedValue("ok");
  return {
    channel,
    sync: () => sync(),
    status: (s: string) => status(s),
    state: (s: typeof state) => (state = s)
  };
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());
describe("private online presence", () => {
  it("publishes only an ephemeral online flag and removes its channel on cleanup", async () => {
    const c = setup();
    const stop = watchOnline("actor", "token", true, vi.fn());
    await flush();
    c.status("SUBSCRIBED");
    expect(mock.channel).toHaveBeenCalledWith("chat-online:actor:0", {
      config: { private: true, presence: { enabled: true } }
    });
    expect(c.channel.track).toHaveBeenCalledWith({ online: true, pulse: 1 });
    stop();
    await flush();
    expect(mock.remove).toHaveBeenCalledWith(c.channel);
  });
  it("observes without publishing and keeps online while any device remains", async () => {
    const c = setup(),
      change = vi.fn();
    const stop = watchOnline("peer", "token", false, change);
    await flush();
    c.status("SUBSCRIBED");
    expect(c.channel.track).not.toHaveBeenCalled();
    c.state({
      a: [{ online: true, pulse: 1 }],
      b: [{ online: true, pulse: 1 }]
    });
    c.sync();
    expect(change).toHaveBeenLastCalledWith(true);
    c.state({ b: [{ online: true, pulse: 1 }] });
    c.sync();
    expect(change).toHaveBeenLastCalledWith(true);
    vi.advanceTimersByTime(45001);
    c.sync();
    expect(change).toHaveBeenLastCalledWith(false);
    c.state({ b: [{ online: true, pulse: 2 }] });
    c.sync();
    expect(change).toHaveBeenLastCalledWith(true);
    c.state({});
    c.sync();
    expect(change).toHaveBeenLastCalledWith(false);
    c.status("CHANNEL_ERROR");
    expect(change).toHaveBeenLastCalledWith(false);
    stop();
    change.mockClear();
    c.state({ b: [{ online: true, pulse: 1 }] });
    c.sync();
    expect(change).not.toHaveBeenCalled();
    await flush();
  });
  it("does not join after auth resolves for an account that has left", async () => {
    setup();
    let resolve!: () => void;
    mock.auth.mockReturnValue(new Promise<void>((done) => (resolve = done)));
    const stop = watchOnline("stale", "token", true, vi.fn());
    await Promise.resolve();
    stop();
    resolve();
    await flush();
    expect(mock.channel).not.toHaveBeenCalled();
  });
  it("shares a peer observer and keeps it until its last viewer leaves", async () => {
    const c = setup(),
      first = vi.fn(),
      second = vi.fn();
    const stopFirst = watchOnline("shared", "token", false, first);
    const stopSecond = watchOnline("shared", "token", false, second);
    await flush();
    expect(mock.channel).toHaveBeenCalledTimes(1);
    c.status("SUBSCRIBED");
    c.state({ a: [{ online: true, pulse: 1 }] });
    c.sync();
    expect(first).toHaveBeenLastCalledWith(true);
    expect(second).toHaveBeenLastCalledWith(true);
    stopFirst();
    await flush();
    expect(mock.remove).not.toHaveBeenCalled();
    expect(second).toHaveBeenLastCalledWith(true);
    stopSecond();
    await flush();
    expect(mock.remove).toHaveBeenCalledTimes(1);
  });
  it("rotates away from old topic permissions and stops on denied access", async () => {
    const c = setup();
    const change = vi.fn();
    const stop = watchOnline("peer-rotation", "token", false, change);
    await flush();
    c.status("SUBSCRIBED");
    mock.rpc.mockResolvedValue({
      data: "chat-online:peer-rotation:1",
      error: null
    });
    const { refreshOnlineTopics } = await import("./chat-presence.repository");
    refreshOnlineTopics();
    await flush();
    expect(mock.remove).toHaveBeenCalledTimes(1);
    expect(mock.channel).toHaveBeenLastCalledWith(
      "chat-online:peer-rotation:1",
      expect.anything()
    );
    mock.rpc.mockResolvedValue({ data: null, error: { code: "42501" } });
    refreshOnlineTopics();
    await flush();
    expect(change).toHaveBeenLastCalledWith(false);
    expect(mock.remove).toHaveBeenCalledTimes(2);
    stop();
    await flush();
  });
  it("waits for a topic's old connection to close before rejoining", async () => {
    setup();
    let resolve!: () => void;
    mock.remove.mockReturnValue(new Promise<void>((done) => (resolve = done)));
    const first = watchOnline("repeat", "token", true, vi.fn());
    await flush();
    first();
    const second = watchOnline("repeat", "new-token", true, vi.fn());
    await flush();
    expect(mock.channel).toHaveBeenCalledTimes(1);
    resolve();
    await flush();
    expect(mock.channel).toHaveBeenCalledTimes(2);
    mock.remove.mockResolvedValue("ok");
    second();
    await flush();
  });
});
