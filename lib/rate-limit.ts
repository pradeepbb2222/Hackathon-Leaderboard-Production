type Bucket = { count: number; reset: number };

const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number, consume = true) {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.reset < now) {
    if (consume) buckets.set(key, { count: 1, reset: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }
  if (current.count >= limit) {
    return { ok: false, retryAfter: Math.ceil((current.reset - now) / 1000) };
  }
  if (consume) current.count += 1;
  return { ok: true, retryAfter: 0 };
}

export function clientKey(headers: Headers) {
  const fwd = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return fwd || headers.get("x-real-ip") || "local";
}
