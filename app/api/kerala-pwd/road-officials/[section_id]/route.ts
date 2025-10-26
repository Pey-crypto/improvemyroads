import { NextRequest } from 'next/server';
import { jsonError } from '@/src/lib/middleware/errorHandler';
import { pwdOfficialsService } from '@/src/lib/services/PwdOfficialsService';

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

export async function GET(_request: NextRequest, context: { params: Promise<{ section_id: string }> }) {
  try {
    const { section_id } = await context.params;
    const id = Number(section_id);
    if (!Number.isFinite(id) || id <= 0) return jsonError('VALIDATION_ERROR', 'section_id must be a positive number', undefined, 400);

    const res = await pwdOfficialsService.fetchOfficials(id);
    return new Response(
      JSON.stringify({ success: true, data: res.data, cached: res.cached, timestamp: res.timestamp }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=600',
          'X-Cache': res.cached ? 'HIT' : 'MISS',
        },
      }
    );
  } catch (e) {
    const msg = (e as Error).message || 'Failed to fetch officials';
    const status = /not found/i.test(msg) ? 404 : 502;
    return jsonError('SERVER_ERROR', msg, undefined, status);
  }
}
