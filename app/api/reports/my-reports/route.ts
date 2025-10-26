import { NextRequest } from 'next/server';
import { requireAuth } from '@/src/lib/middleware/auth';
import { jsonError, jsonOk } from '@/src/lib/middleware/errorHandler';
import { ReportModel } from '@/src/lib/db/models/Report';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireAuth(request);
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') || 1);
    const limit = Number(url.searchParams.get('limit') || 20);
    const reports = await ReportModel.findReports({ userId, page, limit });
    return jsonOk({ reports }, { headers: { 'Access-Control-Allow-Origin': '*' } });
  } catch (e) {
    return jsonError('UNAUTHORIZED', (e as Error).message, undefined, 401);
  }
}
