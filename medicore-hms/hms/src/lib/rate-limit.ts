import { RateLimiterMemory } from "rate-limiter-flexible";

/**
 * In-memory limiter for local/dev. Swap to RateLimiterRedis with `ioredis`
 * in production so limits are enforced across multiple server instances:
 *
 *   import { RateLimiterRedis } from "rate-limiter-flexible";
 *   import Redis from "ioredis";
 *   new RateLimiterRedis({ storeClient: new Redis(process.env.REDIS_URL), points: 100, duration: 60 })
 */
const limiters = {
  auth: new RateLimiterMemory({ points: 5, duration: 60 }),      // 5 login attempts / min
  api: new RateLimiterMemory({ points: 120, duration: 60 }),     // 120 req / min general
  mutation: new RateLimiterMemory({ points: 30, duration: 60 }), // 30 writes / min
};

export async function checkRateLimit(
  bucket: keyof typeof limiters,
  key: string
): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  try {
    await limiters[bucket].consume(key);
    return { allowed: true };
  } catch (rejection: any) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((rejection?.msBeforeNext ?? 1000) / 1000),
    };
  }
}
