import { requireSupabase } from "@/infrastructure/supabase/repository-helpers";

// Serialize removal/rejoin of a topic: supabase.channel() reuses existing topics.
const closing = new Map<string, Promise<void>>();

/** Only the subject may publish; their conversation peers can observe via RLS. */
function connectOnline(
  _subject: string,
  token: string,
  publish: boolean,
  onOnline: (online: boolean) => void,
  topic: string
) {
  const client = requireSupabase();

  let closed = false;
  let ready = false;
  let pulse = 0;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  const leases = new Map<string, { pulse: number; expires: number }>();
  let channel: ReturnType<typeof client.channel> | undefined;
  const sync = () => {
    if (closed || !ready || !channel) return;
    const active = new Set<string>();
    for (const [key, devices] of Object.entries(
      channel.presenceState<{ online?: boolean; pulse?: number }>()
    )) {
      for (const device of devices) {
        if (device.online !== true || !Number.isSafeInteger(device.pulse))
          continue;
        const id = `${key}:${device.presence_ref}`;
        active.add(id);
        const previous = leases.get(id);
        if (!previous || previous.pulse !== device.pulse)
          leases.set(id, { pulse: device.pulse!, expires: Date.now() + 45000 });
      }
    }
    for (const key of leases.keys()) if (!active.has(key)) leases.delete(key);
    onOnline([...leases.values()].some((lease) => lease.expires > Date.now()));
  };
  const start = (async () => {
    await closing.get(topic);
    if (closed) return;
    await client.realtime.setAuth(token);
    if (closed) return;
    channel = client
      .channel(topic, {
        config: { private: true, presence: { enabled: true } }
      })
      .on("presence", { event: "sync" }, sync)
      .subscribe((status) => {
        if (closed) return;
        ready = status === "SUBSCRIBED";
        clearInterval(heartbeat);
        if (!ready) {
          leases.clear();
          onOnline(false);
        } else if (publish) {
          // A changing counter renews a short in-memory lease. No timestamps/history.
          const track = () => {
            if (!closed && ready)
              void channel!
                .track({ online: true, pulse: ++pulse })
                .catch(() => undefined);
          };
          track();
          heartbeat = setInterval(track, 15000);
        } else heartbeat = setInterval(sync, 5000);
      });
  })().catch(() => {
    if (!closed) onOnline(false);
  });
  return () => {
    if (closed) return;
    closed = true;
    ready = false;
    clearInterval(heartbeat);
    leases.clear();
    onOnline(false);
    const cleanup = start
      .then(async () => {
        if (channel) await client.removeChannel(channel);
      })
      .catch(() => undefined);
    closing.set(topic, cleanup);
    void cleanup.then(() => {
      if (closing.get(topic) === cleanup) closing.delete(topic);
    });
  };
}

const topicRefreshers = new Set<() => void>();
export function refreshOnlineTopics() {
  for (const refresh of topicRefreshers) refresh();
}
function watchVersionedOnline(
  subject: string,
  token: string,
  publish: boolean,
  onOnline: (online: boolean) => void
) {
  const client = requireSupabase();
  let closed = false;
  let resolving = false;
  let current: string | null = null;
  let stop: (() => void) | undefined;
  const refresh = async () => {
    if (closed || resolving) return;
    resolving = true;
    try {
      const { data, error } = await client.rpc("get_chat_online_topic", {
        p_subject: subject
      });
      if (closed) return;
      const topic =
        !error &&
        typeof data === "string" &&
        data.startsWith(`chat-online:${subject}:`)
          ? data
          : null;
      if (topic !== current) {
        stop?.();
        stop = undefined;
        current = topic;
        if (topic)
          stop = connectOnline(subject, token, publish, onOnline, topic);
        else onOnline(false);
      }
    } catch {
      if (!closed) {
        stop?.();
        stop = undefined;
        current = null;
        onOnline(false);
      }
    } finally {
      resolving = false;
    }
  };
  topicRefreshers.add(refresh);
  void refresh();
  const timer = setInterval(() => void refresh(), 20000);
  return () => {
    closed = true;
    clearInterval(timer);
    topicRefreshers.delete(refresh);
    stop?.();
    onOnline(false);
  };
}

// Virtualized inbox rows may reference the same peer. Share their readonly channel.
const observers = new Map<
  string,
  {
    listeners: Set<(online: boolean) => void>;
    online: boolean;
    stop: () => void;
  }
>();
export function watchOnline(
  subject: string,
  token: string,
  publish: boolean,
  onOnline: (online: boolean) => void
) {
  if (publish) return watchVersionedOnline(subject, token, true, onOnline);
  const key = `${subject}:${token}`;
  let group = observers.get(key);
  if (!group) {
    const entry = {
      listeners: new Set<(online: boolean) => void>(),
      online: false,
      stop: () => {}
    };
    observers.set(key, entry);
    entry.stop = watchVersionedOnline(subject, token, false, (online) => {
      entry.online = online;
      for (const listener of entry.listeners) listener(online);
    });
    group = entry;
  }
  const entry = group;
  entry.listeners.add(onOnline);
  onOnline(entry.online);
  let closed = false;
  return () => {
    if (closed) return;
    closed = true;
    entry.listeners.delete(onOnline);
    onOnline(false);
    if (!entry.listeners.size) {
      observers.delete(key);
      entry.stop();
    }
  };
}
