export interface TileResponse {
  data: Buffer;
  contentType: string;
  cached: boolean;
  timestamp: Date;
}

export interface LayerInfo {
  name: string;
  featureCount: number;
  extent?: number;
  version?: number;
}

export type GeometryType = 'Point' | 'LineString' | 'Polygon' | 'Unknown';

export interface Feature {
  id?: number;
  type: GeometryType;
  properties: Record<string, unknown>;
  sampleGeometry?: { lat: number; lng: number }[];
  layerName?: string;
}

export interface TileStatistics {
  sizeBytes: number;
  layerCount: number;
  featuresTotal: number;
  parseTimeMs: number;
}

export interface ParsedTile {
  layers: Record<string, LayerInfo>;
  features: Feature[];
  statistics: TileStatistics;
}

export interface TileProviderMetadata {
  name: string;
  minZoom: number;
  maxZoom: number;
  attribution?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number; // epoch ms
  limit: number;
}
