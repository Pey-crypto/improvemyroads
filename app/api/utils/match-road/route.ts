import { NextRequest } from 'next/server';
import { jsonOk, jsonError } from '@/src/lib/middleware/errorHandler';
import { RoadMatcher } from '@/src/lib/services/RoadMatcher';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const matcher = new RoadMatcher();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const lat = Number(body.lat);
    const lng = Number(body.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return jsonError('VALIDATION_ERROR', 'Invalid lat/lng', undefined, 400);
    const match = await matcher.matchCoordinatesToRoad(lat, lng);
    return jsonOk({ match }, { headers: { 'Access-Control-Allow-Origin': '*' } });
  } catch (e) {
    return jsonError('SERVER_ERROR', (e as Error).message, undefined, 400);
  }
}
