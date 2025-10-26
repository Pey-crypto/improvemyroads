import NodeCache from 'node-cache';
import { tilesConfig } from '@/src/config/tiles.config';
import { logger } from '../utils/logger';

export interface CacheValue {
  data: Buffer;
  contentType: string;
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  keys: number;
}

type RedisClient = {
  getBuffer: (key: string) => Promise<Buffer | null>;
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: Buffer | string, mode: 'EX', ttlSeconds: number) => Promise<unknown>;
  connect?: () => Promise<void>;
};

type RedisModule = { default: new (url: string, opts: Record<string, unknown>) => RedisClient };

class TileCacheImpl {
  private memory: NodeCache;
  private accessOrder: Map<string, number>; // key -> lastAccessMs
  private stats: CacheStats = { hits: 0, misses: 0, evictions: 0, keys: 0 };
  private maxSize: number;
  private ttl: number;
  private redisReady = false;
  private redis: RedisClient | null = null;

  constructor() {
    this.ttl = tilesConfig.cache.ttl;
    this.maxSize = tilesConfig.cache.maxSize;
    this.memory = new NodeCache({ stdTTL: this.ttl, checkperiod: tilesConfig.cache.checkPeriod, useClones: false });
    this.accessOrder = new Map();
    if (tilesConfig.redis.url) {
      this.initRedis(tilesConfig.redis.url).catch(() => void 0);
    }
  }

  private async initRedis(url: string) {
    try {
      // dynamic import to keep optional
      const mod = (await import('ioredis').catch(() => null)) as RedisModule | null;
      if (!mod) return;
      this.redis = new mod.default(url, { lazyConnect: true, maxRetriesPerRequest: 2 });
      await this.redis.connect?.().catch(() => void 0);
      this.redisReady = true;
    } catch (e) {
      logger.warn('Redis init failed, falling back to memory cache', { error: (e as Error).message });
      this.redisReady = false;
      this.redis = null;
    }
  }

  private keyspace(key: string) { return `tile:${key}`; }

  private ensureCapacity() {
    const size = this.accessOrder.size;
    if (size <= this.maxSize) return;
    const overflow = size - this.maxSize;
    const entries = [...this.accessOrder.entries()].sort((a, b) => a[1] - b[1]); // oldest first
    for (let i = 0; i < overflow; i++) {
      const [oldKey] = entries[i];
      this.memory.del(oldKey);
      this.accessOrder.delete(oldKey);
      this.stats.evictions++;
    }
    this.stats.keys = this.accessOrder.size;
  }

  async get(key: string): Promise<CacheValue | null> {
    if (!tilesConfig.cache.enabled) return null;

    // Redis first
    const redis = this.redis;
    if (this.redisReady && redis) {
      try {
        const rkey = this.keyspace(key);
        const buf = (await redis.getBuffer(rkey)) as Buffer | null;
        if (buf) {
          const ctype = (await redis.get(`${rkey}:ct`)) as string | null;
          this.stats.hits++;
          return { data: buf, contentType: ctype || 'application/x-protobuf' };
        }
      } catch (e) {
        logger.warn('Redis get failed, continuing with memory', { error: (e as Error).message });
      }
    }

    const val = this.memory.get<CacheValue>(key) || null;
    if (val) {
      this.stats.hits++;
      this.accessOrder.set(key, Date.now());
      return val;
    }
    this.stats.misses++;
    return null;
  }

  async set(key: string, value: CacheValue): Promise<void> {
    if (!tilesConfig.cache.enabled) return;

    // Redis
    const redis = this.redis;
    if (this.redisReady && redis) {
      try {
        const rkey = this.keyspace(key);
        await redis.set(rkey, value.data, 'EX', this.ttl);
        await redis.set(`${rkey}:ct`, value.contentType, 'EX', this.ttl);
        return;
      } catch (e) {
        logger.warn('Redis set failed, using memory cache', { error: (e as Error).message });
      }
    }

    this.memory.set(key, value, this.ttl);
    this.accessOrder.set(key, Date.now());
    this.ensureCapacity();
    this.stats.keys = this.accessOrder.size;
  }

  getStats() {
    return { ...this.stats };
  }
}

export const TileCache = new TileCacheImpl();
