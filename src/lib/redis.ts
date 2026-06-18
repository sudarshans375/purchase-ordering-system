// src/lib/redis.ts — Redis client (ioredis)
// Author: Sudarshan Sonawane

import Redis from "ioredis";

let redis: Redis | null = null;

function getRedisUrl(): string | undefined {
  const url = process.env.REDIS_URL;
  if (!url) return undefined;

  // Handle redis-cli --tls -u format from Upstash
  if (url.startsWith("redis-cli")) {
    const match = url.match(/-u\s+(\S+)/);
    if (match) return match[1];
  }

  return url;
}

export function getRedis(): Redis | null {
  if (redis) return redis;

  const url = getRedisUrl();
  if (!url) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[redis] REDIS_URL not configured. Redis features disabled.");
    }
    return null;
  }

  try {
    redis = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
      enableOfflineQueue: false,
    });

    redis.on("error", (err) => {
      console.error("[redis] Connection error:", err.message);
    });

    // Don't block startup on Redis connection
    redis.connect().catch((err) => {
      console.warn("[redis] Failed to connect:", err.message);
      redis = null;
    });

    return redis;
  } catch {
    console.warn("[redis] Failed to initialize Redis. Features disabled.");
    return null;
  }
}

// ─── Idempotency Cache ──────────────────────────────

const IDEMPOTENCY_TTL = 60 * 60 * 24; // 24 hours

export async function getIdempotencyCache(
  key: string
): Promise<{ status: number; body: string } | null> {
  const r = getRedis();
  if (!r) return null;

  try {
    const cached = await r.get(`idempotency:${key}`);
    if (!cached) return null;
    return JSON.parse(cached);
  } catch {
    return null;
  }
}

export async function setIdempotencyCache(
  key: string,
  status: number,
  body: string
): Promise<void> {
  const r = getRedis();
  if (!r) return;

  try {
    await r.setex(
      `idempotency:${key}`,
      IDEMPOTENCY_TTL,
      JSON.stringify({ status, body })
    );
  } catch {
    // Non-critical — DB is source of truth
  }
}

// ─── Rate Limiting ──────────────────────────────────

const RATE_LIMIT_WINDOW = 60; // 1 minute in seconds
const RATE_LIMIT_MAX = 10; // max requests per window

export async function checkRateLimit(
  poId: string
): Promise<{ allowed: boolean; remaining: number; retryAfter: number }> {
  const r = getRedis();
  if (!r) {
    // No Redis = no rate limiting
    return { allowed: true, remaining: Infinity, retryAfter: 0 };
  }

  try {
    const key = `ratelimit:receive:${poId}`;
    const now = Date.now();
    const window = now - RATE_LIMIT_WINDOW * 1000;

    // Remove old entries
    await r.zremrangebyscore(key, 0, window);

    // Count recent requests
    const count = await r.zcard(key);

    if (count >= RATE_LIMIT_MAX) {
      const oldest = await r.zrange(key, 0, 0, "WITHSCORES");
      const retryAfter = oldest.length >= 2
        ? Math.ceil((Number(oldest[1]) + RATE_LIMIT_WINDOW * 1000 - now) / 1000)
        : RATE_LIMIT_WINDOW;

      return { allowed: false, remaining: 0, retryAfter };
    }

    // Add current request
    await r.zadd(key, now, `${now}:${Math.random()}`);
    await r.expire(key, RATE_LIMIT_WINDOW);

    return { allowed: true, remaining: RATE_LIMIT_MAX - count - 1, retryAfter: 0 };
  } catch {
    return { allowed: true, remaining: Infinity, retryAfter: 0 };
  }
}

// ─── List Caching ───────────────────────────────────

const LIST_CACHE_TTL = 60; // 60 seconds

export async function getCachedList<T>(key: string): Promise<T | null> {
  const r = getRedis();
  if (!r) return null;

  try {
    const cached = await r.get(`list:${key}`);
    if (!cached) return null;
    return JSON.parse(cached);
  } catch {
    return null;
  }
}

export async function setCachedList<T>(
  key: string,
  data: T
): Promise<void> {
  const r = getRedis();
  if (!r) return;

  try {
    await r.setex(`list:${key}`, LIST_CACHE_TTL, JSON.stringify(data));
  } catch {
    // Non-critical
  }
}

export async function invalidateListCache(key: string): Promise<void> {
  const r = getRedis();
  if (!r) return;

  try {
    await r.del(`list:${key}`);
  } catch {
    // Non-critical
  }
}
