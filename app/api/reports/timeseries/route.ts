import { NextRequest } from 'next/server';
import { getMongo } from '@/src/lib/db/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

function coerceNumber(v: string | null, def?: number) {
  if (v == null || v === '') return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

function parseBucket(v: string | null): 'day' | 'week' | 'month' {
  if (v === 'week' || v === 'month') return v;
  return 'day';
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const lat = coerceNumber(url.searchParams.get('lat'));
  const lng = coerceNumber(url.searchParams.get('lng'));
  const radiusKm = coerceNumber(url.searchParams.get('radiusKm'), 5);
  const district = url.searchParams.get('district') || undefined;
  const bucket = parseBucket(url.searchParams.get('bucket'));

  const endParam = url.searchParams.get('end');
  const startParam = url.searchParams.get('start');
  const end = endParam ? new Date(endParam) : new Date();
  const start = startParam ? new Date(startParam) : new Date(end.getTime() - 29 * 24 * 60 * 60 * 1000);

  const { collections } = await getMongo();

  const baseMatch: Record<string, unknown> = {
    createdAt: { $gte: start, $lte: end },
  };
  if (district) baseMatch.district = district;

  const stages: Record<string, unknown>[] = [];
  const useGeo = lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng);
  if (useGeo) {
    stages.push({
      $geoNear: {
        near: { type: 'Point', coordinates: [lng as number, lat as number] },
        distanceField: 'dist.calculated',
        spherical: true,
        key: 'location',
        ...(radiusKm ? { maxDistance: (radiusKm as number) * 1000 } : {}),
        query: baseMatch,
      },
    });
  } else {
    stages.push({ $match: baseMatch });
  }

  // Group by date bucket and status for flexibility
  stages.push(
    {
      $group: {
        _id: {
          d: { $dateTrunc: { date: '$createdAt', unit: bucket } },
          s: '$status',
        },
        c: { $sum: 1 },
      },
    },
    { $sort: { '_id.d': 1 } }
  );

  const agg = (await collections.reports.aggregate(stages).toArray()) as Array<{ _id: { d: Date; s: string }; c: number }>;

  // Fold into points with byStatus map and total
  const map = new Map<string, { date: string; total: number; byStatus: Record<string, number> }>();
  for (const row of agg) {
    const key = row._id.d.toISOString();
    if (!map.has(key)) {
      map.set(key, { date: key, total: 0, byStatus: {} });
    }
    const pt = map.get(key)!;
    pt.total += row.c;
    pt.byStatus[row._id.s] = (pt.byStatus[row._id.s] || 0) + row.c;
  }

  // Ensure continuity (fill missing buckets with zeros)
  const points: { date: string; total: number; byStatus: Record<string, number> }[] = [];
  const cursor = new Date(start);
  const last = new Date(end);
  const stepDays = bucket === 'day' ? 1 : bucket === 'week' ? 7 : 30; // coarse step for continuity
  while (cursor <= last) {
    const k = new Date(cursor);
    const trunc = new Date(k.toISOString().slice(0, 10)); // YYYY-MM-DD to midnight UTC
    const key = trunc.toISOString();
    const existing = map.get(key);
    points.push(existing || { date: key, total: 0, byStatus: {} });
    cursor.setDate(cursor.getDate() + stepDays);
  }

  return Response.json(
    {
      success: true,
      data: {
        bucket,
        range: { start: start.toISOString(), end: end.toISOString() },
        points,
      },
    },
    { headers: { 'Access-Control-Allow-Origin': '*' } }
  );
}
