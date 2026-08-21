export interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export function consumeRateLimit(
  store: Map<string, RateLimitEntry>,
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now()
) {
  const current = store.get(key);
  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }
  current.count += 1;
  return {
    allowed: current.count <= limit,
    remaining: Math.max(0, limit - current.count),
    resetAt: current.resetAt,
  };
}

export function hasTrustedMutationOrigin(origin: string | null, host: string | null) {
  if (!origin || !host) return false;
  try {
    return new URL(origin).host.toLowerCase() === host.toLowerCase();
  } catch {
    return false;
  }
}
