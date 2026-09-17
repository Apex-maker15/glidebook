import { HttpError } from "@/lib/api";

/**
 * Small sliding-window rate limiter for public endpoints (booking creation,
 * registration). In-memory per server instance: on serverless hosts that
 * means "per warm function", which still stops a single client hammering one
 * instance without any external dependency. Swap for Upstash/Redis if abuse
 * ever becomes a real problem.
 */
const buckets = new Map<string, number[]>();
const MAX_KEYS = 5000;

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/** Throws 429 when `limit` requests were seen from this IP for `scope` within `windowMs`. */
export function rateLimit(req: Request, scope: string, limit: number, windowMs: number): void {
  const key = `${scope}:${clientIp(req)}`;
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    const retryAfter = Math.ceil((windowMs - (now - hits[0])) / 1000);
    throw new HttpError(429, `Too many requests. Try again in ${retryAfter}s.`, "RATE_LIMITED");
  }
  hits.push(now);
  buckets.set(key, hits);

  if (buckets.size > MAX_KEYS) {
    for (const [k, v] of buckets) {
      if (v.every((t) => now - t >= windowMs)) buckets.delete(k);
      if (buckets.size <= MAX_KEYS / 2) break;
    }
  }
}
