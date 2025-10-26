import type { ParsedTile, TileProviderMetadata, TileResponse } from './TileTypes';

export interface ITileProvider {
  name: string;
  fetchTile(z: number, x: number, y: number): Promise<TileResponse>;
  parseTile(buffer: Buffer): Promise<ParsedTile>;
  isHealthy(): Promise<boolean>;
  getMetadata(): TileProviderMetadata;
}
