import NodeCache from 'node-cache';
import { pwdConfig } from '@/src/config/pwd.config';

export type CacheEntry<T> = { value: T; ts: number };

// Optional Redis-like minimal interface (lazy, optional dependency like TileCache)
type RedisClient = {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, mode: 'EX', ttlSeconds: number) => Promise<unknown>;
  connect?: () => Promise<void>;
};

type RedisModule = { default: new (url: string, opts: Record<string, unknown>) => RedisClient };

class PwdOfficialsCacheImpl {
  private memory = new NodeCache({ stdTTL: pwdConfig.cacheTTL, useClones: false, checkperiod: 600 });
  private redis: RedisClient | null = null;
  private redisReady = false;

  constructor() {
    const url = process.env.REDIS_URL || '';
    if (url) this.initRedis(url).catch(() => void 0);
  }

  private async initRedis(url: string) {
    try {
      const mod = (await import('ioredis').catch(() => null)) as RedisModule | null;
      if (!mod) return;
      this.redis = new mod.default(url, { lazyConnect: true, maxRetriesPerRequest: 2 });
      await this.redis.connect?.().catch(() => void 0);
      this.redisReady = true;
    } catch {
      this.redisReady = false;
      this.redis = null;
    }
  }

  private keyspace(key: string) { return `pwd:officials:${key}`; }

  async get<T = unknown>(key: string): Promise<CacheEntry<T> | null> {
    // Redis first
    if (this.redisReady && this.redis) {
      try {
        const raw = await this.redis.get(this.keyspace(key));
        if (raw) return JSON.parse(raw) as CacheEntry<T>;
      } catch {}
    }
    const v = this.memory.get<CacheEntry<T>>(key) || null;
    return v;
  }

  async set<T = unknown>(key: string, value: T): Promise<void> {
    const entry: CacheEntry<T> = { value, ts: Date.now() };
    if (this.redisReady && this.redis) {
      try {
        await this.redis.set(this.keyspace(key), JSON.stringify(entry), 'EX', pwdConfig.cacheTTL);
        return;
      } catch {}
    }
    this.memory.set(key, entry, pwdConfig.cacheTTL);
  }
}

export const PwdOfficialsCache = new PwdOfficialsCacheImpl();
