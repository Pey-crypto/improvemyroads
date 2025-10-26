import { NextRequest } from 'next/server';
import { TileComposite } from '@/src/lib/tiles/services/TileComposite';
import { isValidTileCoord } from '@/src/lib/tiles/utils/coordinates';
import { RateLimiter } from '@/src/lib/tiles/utils/rateLimiter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const z = Number(searchParams.get('z'));
  const x = Number(searchParams.get('x'));
  const y = Number(searchParams.get('y'));

  if (!Number.isFinite(z) || !Number.isFinite(x) || !Number.isFinite(y) || !isValidTileCoord(z, x, y)) {
    return Response.json({ error: 'Invalid or missing z/x/y query parameters' }, { status: 400 });
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
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

  try {
    const tile = await TileComposite.fetchTile('keralaPWD', z, x, y);
    const parsed = await TileComposite.parseTile('keralaPWD', tile.data, { z, x, y });
    return Response.json(
      {
        coord: { z, x, y },
        layers: parsed.layers,
        features: parsed.features,
        statistics: parsed.statistics,
      },
      { status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' } }
    );
  } catch (e) {
    const err = e as Error;
    return Response.json({ error: 'Failed to parse tile', detail: err.message }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
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

  try {
    const ab = await request.arrayBuffer();
    const buffer = Buffer.from(new Uint8Array(ab));
    const parsed = await TileComposite.parseTile('keralaPWD', buffer);
    return Response.json(
      { layers: parsed.layers, features: parsed.features, statistics: parsed.statistics },
      { status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' } }
    );
  } catch (e) {
    const err = e as Error;
    return Response.json({ error: 'Failed to parse tile', detail: err.message }, { status: 400 });
  }
}
