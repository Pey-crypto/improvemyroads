import { TileComposite } from '@/src/lib/tiles/services/TileComposite';
import { TileCache } from '@/src/lib/tiles/services/TileCache';
import { tilesConfig } from '@/src/config/tiles.config';
import pkg from '@/package.json';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export async function GET() {
  const t0 = Date.now();
  const providers = await TileComposite.health();
  const responseTimeMs = Date.now() - t0;
  const cacheStats = TileCache.getStats();

  const healthy = Object.values(providers).every((p) => p.healthy);

  return Response.json(
    {
      status: healthy ? 'healthy' : 'unhealthy',
      responseTimeMs,
      providers,
      cache: {
        enabled: tilesConfig.cache.enabled,
        ttl: tilesConfig.cache.ttl,
        stats: cacheStats,
      },
      timestamp: new Date().toISOString(),
      version: {
        app: pkg.version || '0.0.0',
        next: (pkg.dependencies as Record<string, string>).next,
        node: process.versions.node,
      },
    },
    { status: healthy ? 200 : 502, headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' } }
  );
}
