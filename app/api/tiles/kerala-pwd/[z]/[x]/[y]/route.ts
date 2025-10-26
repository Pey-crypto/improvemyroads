import { NextRequest } from 'next/server';
import { TileComposite } from '@/src/lib/tiles/services/TileComposite';
import { isValidTileCoord } from '@/src/lib/tiles/utils/coordinates';
import { tilesConfig } from '@/src/config/tiles.config';
import { RateLimiter } from '@/src/lib/tiles/utils/rateLimiter';
import { logger } from '@/src/lib/tiles/utils/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getClientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  const xrip = req.headers.get('x-real-ip');
  if (xrip) return xrip;
  return 'unknown';
}

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

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ z: string; x: string; y: string }> }
) {
  const t0 = Date.now();
  const { z: zStr, x: xStr, y: yStr } = await context.params;
  const z = Number(zStr);
  const x = Number(xStr);
  const y = Number(yStr);

  const log = logger.child({ scope: 'api.tiles.kerala', z, x, y });

  if (!Number.isFinite(z) || !Number.isFinite(x) || !Number.isFinite(y) || !isValidTileCoord(z, x, y)) {
    return Response.json({ error: 'Invalid tile coordinates' }, { status: 400 });
  }

  if (z < tilesConfig.keralaPWD.minZoom || z > tilesConfig.keralaPWD.maxZoom) {
    return Response.json({ error: `Zoom out of range (${tilesConfig.keralaPWD.minZoom}-${tilesConfig.keralaPWD.maxZoom})` }, { status: 400 });
  }

  if (tilesConfig.rateLimit.enabled) {
    const ip = getClientIp(request);
    const rl = RateLimiter.allow(ip);
    if (!rl.allowed) {
      return Response.json(
        { error: 'Rate limit exceeded' },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rl.resetTime - Date.now()) / 1000).toString(),
            'X-RateLimit-Limit': String(rl.limit),
            'X-RateLimit-Remaining': String(rl.remaining),
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }
  }

  try {
    const tile = await TileComposite.fetchTile('keralaPWD', z, x, y);

    const duration = Date.now() - t0;
    log.info('Tile served', { cached: tile.cached, durationMs: duration });

    const body = new Uint8Array(tile.data);
    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': tile.contentType || 'application/x-protobuf',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=600',
        'X-Cache': tile.cached ? 'HIT' : 'MISS',
      },
    });
  } catch (e) {
    const err = e as Error;
    log.error('Tile fetch failed', { error: err.message });
    const status = /404/.test(err.message) ? 404 : 502;
    return Response.json({ error: 'Failed to fetch tile', detail: err.message }, { status });
  }
}
