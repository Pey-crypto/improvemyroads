import { VectorTile, VectorTileLayer, VectorTileFeature } from '@mapbox/vector-tile';
import Pbf from 'pbf';
import type { Feature, GeometryType, LayerInfo, ParsedTile, TileStatistics } from '../interfaces/TileTypes';
import { tileToLatLng } from '../utils/coordinates';

function geomTypeToString(t: number): GeometryType {
  switch (t) {
    case 1: return 'Point';
    case 2: return 'LineString';
    case 3: return 'Polygon';
    default: return 'Unknown';
  }
}

export async function parseVectorTile(buffer: Buffer, tileCoord?: { z: number; x: number; y: number }): Promise<ParsedTile> {
  const start = Date.now();
  let vt: VectorTile;
  try {
    const pbf = new Pbf(buffer);
    vt = new VectorTile(pbf);
  } catch {
    // Return minimal structure on parse failure
    const statistics: TileStatistics = {
      sizeBytes: buffer.byteLength,
      layerCount: 0,
      featuresTotal: 0,
      parseTimeMs: Date.now() - start,
    };
    return { layers: {}, features: [], statistics };
  }

  const layers: Record<string, LayerInfo> = {};
  const features: Feature[] = [];

  for (const lname of Object.keys(vt.layers)) {
    const layer = vt.layers[lname] as unknown as VectorTileLayer;
    layers[lname] = {
      name: lname,
      featureCount: layer.length,
      extent: layer.extent,
      version: layer.version,
    };

    // sample up to 10 features per layer for properties and sample geometry
    const sampleCount = Math.min(10, layer.length);
    for (let i = 0; i < sampleCount; i++) {
      const f = layer.feature(i) as unknown as VectorTileFeature;
      const props: Record<string, unknown> = f.properties as unknown as Record<string, unknown>;
      let sampleGeometry: { lat: number; lng: number }[] | undefined;
      try {
        if (tileCoord) {
          const geom = f.loadGeometry(); // tile coords 0..extent
          const firstRing = geom[0] as { x: number; y: number }[] | undefined;
          if (firstRing && firstRing.length > 0) {
            // convert first few points to lat/lng
            const samplePts = firstRing.slice(0, Math.min(3, firstRing.length));
            sampleGeometry = samplePts.map((pt: { x: number; y: number }) => {
              // pt.{x,y} in tile pixels; convert to global tile coords
              const extent = layer.extent || 4096;
              const tileX = tileCoord.x + pt.x / extent;
              const tileY = tileCoord.y + pt.y / extent;
              const { lat, lng } = tileToLatLng(tileX, tileY, tileCoord.z);
              return { lat, lng };
            });
          }
        }
      } catch {
        // ignore geometry errors
      }

      features.push({
        id: typeof f.id === 'number' ? f.id : undefined,
        type: geomTypeToString(f.type),
        properties: props,
        sampleGeometry,
        layerName: lname,
      });
    }
  }

  const statistics: TileStatistics = {
    sizeBytes: buffer.byteLength,
    layerCount: Object.keys(layers).length,
    featuresTotal: features.length,
    parseTimeMs: Date.now() - start,
  };

  return { layers, features, statistics };
}
