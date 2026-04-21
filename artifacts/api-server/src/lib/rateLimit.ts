import type { Request, Response, NextFunction } from "express";

/**
 * Tiny in-memory per-IP fixed-window rate limiter.
 *
 * Good enough for blunting scraping/abuse on public read endpoints in a
 * single-process Node deployment. NOT suitable for multi-replica horizontal
 * scaling — swap in a shared store (Redis) before that.
 */
type Bucket = { count: number; resetAt: number };

export function ipRateLimit(opts: { windowMs: number; max: number; key?: string }) {
  const buckets = new Map<string, Bucket>();
  const { windowMs, max, key = "default" } = opts;

  return (req: Request, res: Response, next: NextFunction) => {
    const ip =
      (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ||
      req.ip ||
      req.socket.remoteAddress ||
      "unknown";
    const id = `${key}:${ip}`;
    const now = Date.now();

    let bucket = buckets.get(id);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(id, bucket);
    }
    bucket.count += 1;

    if (bucket.count > max) {
      const retrySec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      res.setHeader("Retry-After", String(retrySec));
      res.status(429).json({ error: "Too many requests. Please slow down." });
      return;
    }

    // Opportunistic GC: keep map from growing unbounded if many unique IPs.
    if (buckets.size > 5000) {
      for (const [k, b] of buckets) {
        if (b.resetAt <= now) buckets.delete(k);
      }
    }

    next();
  };
}
