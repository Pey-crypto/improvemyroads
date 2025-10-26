import { NextRequest } from 'next/server';
import { requireAuth } from '@/src/lib/middleware/auth';
import { jsonOk, jsonError } from '@/src/lib/middleware/errorHandler';
import { ReportModel, type RoadData } from '@/src/lib/db/models/Report';
import { pwdOfficialsService } from '@/src/lib/services/PwdOfficialsService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth(request, ['ADMIN']);
    const { id } = await context.params;
    const report = await ReportModel.findReportById(id);
    if (!report) return jsonError('NOT_FOUND', 'Report not found', undefined, 404);
    if (!report.roadData) return jsonError('VALIDATION_ERROR', 'Report has no roadData to update', undefined, 400);
    const section = report.roadData?.roadId;
    const sectionId = section ? Number(section) : NaN;
    if (!Number.isFinite(sectionId) || sectionId <= 0) return jsonError('VALIDATION_ERROR', 'Report has no valid roadId/section_id', undefined, 400);

    const res = await pwdOfficialsService.fetchOfficials(sectionId);
    const rd: RoadData = report.roadData;
    const updated = await ReportModel.updateReport(id, {
      roadData: {
        ...rd,
        roadStartsAt: res.data.roadStartsAt,
        roadEndsAt: res.data.roadEndsAt,
        division: res.data.division,
        subDivision: res.data.subDivision,
        section: res.data.section,
        officials: res.data.officials,
        measuredLength: res.data.measuredLength,
      },
    });

    return jsonOk({ report: updated, cached: res.cached, timestamp: res.timestamp }, { headers: { 'Access-Control-Allow-Origin': '*' } });
  } catch (e) {
    const msg = (e as Error).message;
    const status = /forbidden/i.test(msg) ? 403 : /unauthorized|missing/i.test(msg) ? 401 : 400;
    return jsonError('SERVER_ERROR', msg, undefined, status);
  }
}
