import { TileComposite } from '@/src/lib/tiles/services/TileComposite';
import { latLngToTile, tileToLatLng } from '@/src/lib/tiles/utils/coordinates';
import { tilesConfig } from '@/src/config/tiles.config';
import { VectorTile, VectorTileLayer, VectorTileFeature } from '@mapbox/vector-tile';
import Pbf from 'pbf';
import * as turf from '@turf/turf';

export interface TileCoords { z: number; x: number; y: number }

export interface ParsedRoad {
  layer: string;
  properties: Record<string, unknown>;
  coordinates: [number, number][]; // [lng, lat]
}

export interface RoadMatchResult {
  roadName: string;
  roadType: string;
  roadId?: string;
  district?: string;
  distanceFromRoad: number;
  matchConfidence: number; // 0-100
  tileCoordinates: TileCoords;
}

export class RoadMatcher {
  private pickZoom() {
    const { minZoom, maxZoom } = tilesConfig.keralaPWD;
    const preferred = 14;
    return Math.min(maxZoom, Math.max(minZoom, preferred));
  }

  private async fetchTileForCoordinates(lat: number, lng: number, zoom: number): Promise<{ buffer: Buffer; coords: TileCoords }> {
    const { x, y, z } = latLngToTile(lat, lng, zoom);
    const tileX = Math.floor(x);
    const tileY = Math.floor(y);
    const res = await TileComposite.fetchTile('keralaPWD', z, tileX, tileY);
    return { buffer: res.data, coords: { z, x: tileX, y: tileY } };
  }

  private wrapTileX(x: number, z: number): number {
    const n = Math.pow(2, z);
    return ((x % n) + n) % n;
  }

  private clampTileY(y: number, z: number): number {
    const n = Math.pow(2, z);
    return Math.max(0, Math.min(n - 1, y));
  }

  private neighborTiles(center: TileCoords): TileCoords[] {
    const tiles: TileCoords[] = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = this.wrapTileX(center.x + dx, center.z);
        const ny = this.clampTileY(center.y + dy, center.z);
        tiles.push({ z: center.z, x: nx, y: ny });
      }
    }
    return tiles;
  }

  private async fetchTileByCoords(coords: TileCoords): Promise<{ buffer: Buffer; coords: TileCoords } | null> {
    try {
      const res = await TileComposite.fetchTile('keralaPWD', coords.z, coords.x, coords.y);
      return { buffer: res.data, coords };
    } catch {
      return null;
    }
  }

  private parseMVTTile(buffer: Buffer, coords: TileCoords): ParsedRoad[] {
    const pbf = new Pbf(buffer);
    const vt = new VectorTile(pbf);
    const roads: ParsedRoad[] = [];

    for (const lname of Object.keys(vt.layers)) {
      const layer = vt.layers[lname] as unknown as VectorTileLayer;
      for (let i = 0; i < layer.length; i++) {
        const f = layer.feature(i) as unknown as VectorTileFeature;
        if (f.type !== 2 /* LineString */) continue;
        const geom = f.loadGeometry();
        const extent = layer.extent || 4096;
        for (const ring of geom) {
          const coordsLL: [number, number][] = ring.map((pt: { x: number; y: number }) => {
            const tileX = coords.x + pt.x / extent;
            const tileY = coords.y + pt.y / extent;
            const { lat, lng } = tileToLatLng(tileX, tileY, coords.z);
            return [lng, lat];
          });
          roads.push({ layer: lname, properties: f.properties as unknown as Record<string, unknown>, coordinates: coordsLL });
        }
      }
    }

    return roads;
  }

  private findNearestRoad(point: [number, number], roads: ParsedRoad[]): { road: ParsedRoad; distanceM: number } | null {
    let best: { road: ParsedRoad; distanceM: number } | null = null;
    const pt = turf.point(point);
    for (const r of roads) {
      if (r.coordinates.length < 2) continue;
      const line = turf.lineString(r.coordinates);
      const dist = turf.pointToLineDistance(pt, line, { units: 'meters' });
      if (!best || dist < best.distanceM) best = { road: r, distanceM: dist };
    }
    return best;
  }

  async matchCoordinatesToRoad(lat: number, lng: number): Promise<RoadMatchResult | null> {
    const z = this.pickZoom();
    const base = latLngToTile(lat, lng, z);
    const baseCoords: TileCoords = { z, x: Math.floor(base.x), y: Math.floor(base.y) };
    const candidates: TileCoords[] = this.neighborTiles(baseCoords);
    const roads: ParsedRoad[] = [];

    await Promise.all(
      candidates.map(async (tc) => {
        const fetched = await this.fetchTileByCoords(tc);
        if (fetched) {
          const parsed = this.parseMVTTile(fetched.buffer, fetched.coords);
          if (parsed.length) roads.push(...parsed);
        }
      })
    );

    if (roads.length === 0) return null;
    const nearest = this.findNearestRoad([lng, lat], roads);
    if (!nearest) return null;

    const { road, distanceM } = nearest;
    const props = road.properties || {};
    const name = (props['name'] ?? props['road_name'] ?? props['RD_NAME'] ?? 'Unknown') as string;
    const type = (props['type'] ?? props['road_type'] ?? props['RD_TYPE'] ?? 'ROAD') as string;
    const roadId = (props['id'] ?? props['road_id'] ?? props['RD_ID']) as string | undefined;
    const district = (props['district'] ?? props['DISTRICT']) as string | undefined;

    const maxRadius = 100; // meters
    const confidence = Math.max(0, Math.min(100, Math.round(100 - (distanceM / maxRadius) * 100)));

    return {
      roadName: name,
      roadType: type,
      roadId,
      district,
      distanceFromRoad: distanceM,
      matchConfidence: confidence,
      tileCoordinates: baseCoords,
    };
  }
}
