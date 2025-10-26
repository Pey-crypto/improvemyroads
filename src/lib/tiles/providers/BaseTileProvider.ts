import axios, { AxiosInstance } from 'axios';
import { tilesConfig } from '@/src/config/tiles.config';
import type { ITileProvider } from '../interfaces/ITileProvider';
import type { ParsedTile, TileProviderMetadata, TileResponse } from '../interfaces/TileTypes';
import { parseVectorTile } from '../services/TileParser';
import { logger } from '../utils/logger';

export abstract class BaseTileProvider implements ITileProvider {
  public abstract name: string;
  protected abstract baseUrl: string;
  protected client: AxiosInstance;
  protected timeout: number;
  protected retries: number;

  constructor() {
    this.timeout = tilesConfig.keralaPWD.timeout;
    this.retries = tilesConfig.keralaPWD.retries;
    this.client = axios.create({
      timeout: this.timeout,
      responseType: 'arraybuffer',
      validateStatus: (s: number) => s >= 200 && s < 500, // let us handle 4xx
      maxContentLength: 5 * 1024 * 1024
    });
  }

  abstract getHeaders(): Record<string, string>;

  abstract getMetadata(): TileProviderMetadata;

  async fetchTile(z: number, x: number, y: number): Promise<TileResponse> {
    const url = `${this.baseUrl}/${z}/${x}/${y}.mvt`;
    const log = logger.child({ scope: 'BaseTileProvider.fetchTile', provider: this.name, z, x, y });

    let attempt = 0;
    const start = Date.now();
    while (attempt < this.retries) {
      try {
        attempt++;
        const res = await this.client.get(url, { headers: this.getHeaders() });
        if (res.status === 200 && res.data) {
          const buf = Buffer.from(res.data);
          return {
            data: buf,
            contentType: res.headers['content-type'] || 'application/x-protobuf',
            cached: false,
            timestamp: new Date()
          };
        }
        if (res.status === 404) {
          throw new Error(`Tile not found (404)`);
        }
        if (attempt >= this.retries) {
          throw new Error(`Failed with HTTP ${res.status}`);
        }
        const backoff = Math.min(1000 * 2 ** (attempt - 1), 4000);
        await new Promise((r) => setTimeout(r, backoff));
      } catch (err: unknown) {
        if (attempt >= this.retries) {
          log.error('Fetch failed', { error: (err as Error).message, durationMs: Date.now() - start });
          throw err;
        }
        const backoff = Math.min(1000 * 2 ** (attempt - 1), 4000);
        await new Promise((r) => setTimeout(r, backoff));
      }
    }
    throw new Error('Unreachable');
  }

  async parseTile(buffer: Buffer): Promise<ParsedTile> {
    return parseVectorTile(buffer);
  }

  async isHealthy(): Promise<boolean> {
    try {
      // probe a known small tile within allowed zooms
      const z = Math.max(tilesConfig.keralaPWD.minZoom, 9);
      const x = 364;
      const y = 239;
      const url = `${this.baseUrl}/${z}/${x}/${y}.mvt`;
      const res = await this.client.get(url, { headers: this.getHeaders() });
      return res.status === 200 && !!res.data;
    } catch {
      return false;
    }
  }
}
