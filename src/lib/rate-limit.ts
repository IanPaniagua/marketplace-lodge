// In-memory token bucket per user. Suitable for the current early-stage traffic.
// Move to a DB-backed counter before scaling across multiple server instances.

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

function getBucket(key: string, windowMs: number): Bucket {
  const now = Date.now();
  const existing = buckets.get(key);
  if (existing && now < existing.resetAt) return existing;
  const bucket: Bucket = { count: 0, resetAt: now + windowMs };
  buckets.set(key, bucket);
  return bucket;
}

export function checkRateLimit(
  userId: string,
  action: 'message' | 'listing' | 'report',
): boolean {
  const configs: Record<typeof action, { limit: number; windowMs: number }> = {
    message: { limit: 30, windowMs: 60_000 },
    listing: { limit: 10, windowMs: 24 * 60 * 60_000 },
    report: { limit: 5, windowMs: 24 * 60 * 60_000 },
  };
  const { limit, windowMs } = configs[action];
  const key = `${userId}:${action}`;
  const bucket = getBucket(key, windowMs);
  if (bucket.count >= limit) return false;
  bucket.count++;
  return true;
}
