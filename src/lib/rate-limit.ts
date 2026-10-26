export interface RateLimitState {
  count: number;
  resetAt: number;
}

export function consumeFixedWindowRateLimit({
  key,
  limit,
  now = Date.now(),
  store,
  windowMs
}: {
  key: string;
  limit: number;
  now?: number;
  store: Map<string, RateLimitState>;
  windowMs: number;
}) {
  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    const next = { count: 1, resetAt: now + windowMs };
    store.set(key, next);
    return { allowed: true, remaining: Math.max(limit - 1, 0), state: next };
  }

  if (current.count >= limit) {
    return { allowed: false, remaining: 0, state: current };
  }

  current.count += 1;
  return {
    allowed: true,
    remaining: Math.max(limit - current.count, 0),
    state: current
  };
}
