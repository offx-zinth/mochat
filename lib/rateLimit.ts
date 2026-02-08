type Entry = {
  count: number;
  resetAt: number;
};

const limiter = new Map<string, Entry>();

export function checkRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const entry = limiter.get(key);
  if (!entry || entry.resetAt < now) {
    limiter.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }
  if (entry.count >= limit) {
    return { allowed: false, remaining: 0 };
  }
  entry.count += 1;
  limiter.set(key, entry);
  return { allowed: true, remaining: limit - entry.count };
}
