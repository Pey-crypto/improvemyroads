import type { TileProviderMetadata, TileResponse } from '../interfaces/TileTypes';
import { BaseTileProvider } from './BaseTileProvider';
import { tilesConfig } from '@/src/config/tiles.config';

export class KeralaPWDProvider extends BaseTileProvider {
  public name = 'keralaPWD';
  protected baseUrl = tilesConfig.keralaPWD.baseUrl;

  getHeaders(): Record<string, string> {
    return {
      Referer: tilesConfig.keralaPWD.headers.Referer,
      'User-Agent': tilesConfig.keralaPWD.headers['User-Agent'],
      Accept: 'application/x-protobuf'
    };
  }

  override getMetadata(): TileProviderMetadata {
    return {
      name: this.name,
      minZoom: tilesConfig.keralaPWD.minZoom,
      maxZoom: tilesConfig.keralaPWD.maxZoom,
      attribution: 'Kerala PWD / KSTP Network'
    };
  }

  // Optionally override fetchTile to add provider-specific behavior
  override async fetchTile(z: number, x: number, y: number): Promise<TileResponse> {
    return super.fetchTile(z, x, y);
  }
}
