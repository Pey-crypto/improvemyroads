import type { RateLimitResult } from '../interfaces/TileTypes';
import { tilesConfig } from '@/src/config/tiles.config';

interface Bucket {
  timestamps: number[];
}

class RateLimiterImpl {
  private buckets = new Map<string, Bucket>();

  allow(ip: string, weight = 1): RateLimitResult {
    const now = Date.now();
    const windowMs = tilesConfig.rateLimit.windowMs;
    const limit = tilesConfig.rateLimit.maxRequests;
    const bucket = this.buckets.get(ip) || { timestamps: [] };

    // drop old
    bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);

    if (bucket.timestamps.length + weight > limit) {
      const oldest = Math.min(...bucket.timestamps);
      const reset = oldest + windowMs;
      this.buckets.set(ip, bucket);
      return { allowed: false, remaining: Math.max(0, limit - bucket.timestamps.length), resetTime: reset, limit };
    }

    for (let i = 0; i < weight; i++) bucket.timestamps.push(now);
    this.buckets.set(ip, bucket);

    const remaining = Math.max(0, limit - bucket.timestamps.length);
    const resetTime = bucket.timestamps.length ? Math.min(...bucket.timestamps) + windowMs : now + windowMs;

    return { allowed: true, remaining, resetTime, limit };
  }
}

export const RateLimiter = new RateLimiterImpl();
