/**
 * Best-effort in-memory rate limiter.
 * Works per server instance (including a single Vercel isolate). It is not a
 * global distributed limiter; use it as a cheap abuse brake, not a quota system.
 */

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterMs: number };

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): RateLimitResult {
  if (limit < 1 || windowMs < 1) {
    return { ok: true };
  }

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (existing.count >= limit) {
    return { ok: false, retryAfterMs: Math.max(1, existing.resetAt - now) };
  }

  existing.count += 1;
  return { ok: true };
}

/** Test helper. */
export function resetRateLimitBuckets(): void {
  buckets.clear();
}
