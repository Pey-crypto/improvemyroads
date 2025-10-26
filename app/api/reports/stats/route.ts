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

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const lat = coerceNumber(url.searchParams.get('lat'));
  const lng = coerceNumber(url.searchParams.get('lng'));
  const radiusKm = coerceNumber(url.searchParams.get('radiusKm'), 5);
  const district = url.searchParams.get('district') || undefined;

  const { collections } = await getMongo();

  // Build base match
  const match: Record<string, unknown> = {};
  if (district) match.district = district;

  // Helper to build an aggregation starting with optional $geoNear
  function buildPipeline(extraStages: Record<string, unknown>[]) {
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
          ...(Object.keys(match).length ? { query: match } : {}),
        },
      });
    } else if (Object.keys(match).length) {
      stages.push({ $match: match });
    }
    stages.push(...extraStages);
    return stages;
  }

  // Totals
  const totalAgg = await collections.reports
    .aggregate(buildPipeline([{ $count: 'c' }]))
    .toArray();
  const total = (totalAgg[0]?.c as number) || 0;

  // By status
  const byStatusAgg = await collections.reports
    .aggregate(buildPipeline([{ $group: { _id: '$status', c: { $sum: 1 } } }]))
    .toArray();
  const byStatus: Record<string, number> = {};
  for (const s of byStatusAgg as { _id: string; c: number }[]) byStatus[s._id] = s.c;

  // By category
  const byCategoryAgg = await collections.reports
    .aggregate(buildPipeline([{ $group: { _id: '$category', c: { $sum: 1 } } }]))
    .toArray();
  const byCategory: Record<string, number> = {};
  for (const c of byCategoryAgg as { _id: string; c: number }[]) byCategory[c._id] = c.c;

  // Top roads (where roadData.roadName exists)
  const topRoadsAgg = await collections.reports
    .aggregate(
      buildPipeline([
        { $match: { 'roadData.roadName': { $exists: true, $ne: '' } } },
        { $group: { _id: '$roadData.roadName', c: { $sum: 1 } } },
        { $sort: { c: -1 } },
        { $limit: 10 },
      ])
    )
    .toArray();
  const topRoads = (topRoadsAgg as { _id: string; c: number }[]).map((r) => ({ name: r._id, count: r.c }));

  // Top districts (useful for admin/global view)
  const topDistrictsAgg = await collections.reports
    .aggregate(
      buildPipeline([
        { $match: { district: { $exists: true, $ne: '' } } },
        { $group: { _id: '$district', c: { $sum: 1 } } },
        { $sort: { c: -1 } },
        { $limit: 10 },
      ])
    )
    .toArray();
  const topDistricts = (topDistrictsAgg as { _id: string; c: number }[]).map((d) => ({ name: d._id, count: d.c }));

  return Response.json(
    {
      success: true,
      data: {
        total,
        byStatus,
        byCategory,
        topRoads,
        topDistricts,
      },
    },
    { headers: { 'Access-Control-Allow-Origin': '*' } }
  );
}
