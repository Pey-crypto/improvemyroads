import type { ITileProvider } from '../interfaces/ITileProvider';
import type { ParsedTile, TileResponse } from '../interfaces/TileTypes';
import { TileCache } from './TileCache';
import { tilesConfig } from '@/src/config/tiles.config';
import { KeralaPWDProvider } from '../providers/KeralaPWDProvider';
import { logger } from '../utils/logger';

class TileCompositeManager {
  private providers = new Map<string, ITileProvider>();

  constructor() {
    // register default providers
    this.register(new KeralaPWDProvider());
  }

  register(provider: ITileProvider) {
    this.providers.set(provider.name, provider);
  }

  getProvider(name: string): ITileProvider {
    const p = this.providers.get(name);
    if (!p) throw new Error(`Provider not found: ${name}`);
    return p;
  }

  async fetchTile(providerName: string, z: number, x: number, y: number): Promise<TileResponse> {
    const key = `${providerName}:${z}:${x}:${y}`;

    const fromCache = await TileCache.get(key);
    if (fromCache) {
      return {
        data: fromCache.data,
        contentType: fromCache.contentType,
        cached: true,
        timestamp: new Date(),
      };
    }

    const provider = this.getProvider(providerName);
    const result = await provider.fetchTile(z, x, y);

    // Cache for 24h
    if (tilesConfig.cache.enabled) {
      await TileCache.set(key, { data: result.data, contentType: result.contentType });
    }

    return { ...result, cached: false, timestamp: new Date() };
  }

  async parseTile(providerName: string, buffer: Buffer, tileCoord?: { z: number; x: number; y: number }): Promise<ParsedTile> {
    const provider = this.getProvider(providerName);
    // provider.parseTile currently ignores tileCoord; use parser directly if provided
    if (tileCoord) {
      const { parseVectorTile } = await import('./TileParser');
      return parseVectorTile(buffer, tileCoord);
    }
    return provider.parseTile(buffer);
  }

  async health() {
    const results: Record<string, { healthy: boolean }> = {};
    for (const [name, provider] of this.providers.entries()) {
      try {
        results[name] = { healthy: await provider.isHealthy() };
      } catch (e) {
        results[name] = { healthy: false };
        logger.warn('Provider health check failed', { provider: name, error: (e as Error).message });
      }
    }
    return results;
  }
}

export const TileComposite = new TileCompositeManager();
