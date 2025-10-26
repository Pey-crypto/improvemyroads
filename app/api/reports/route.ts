import { NextRequest } from 'next/server';
import { requireAuth, getCurrentUser } from '@/src/lib/middleware/auth';
import { jsonOk, jsonError } from '@/src/lib/middleware/errorHandler';
import { CreateReportSchema, ReportFiltersSchema } from '@/src/lib/db/types/schemas';
import { ReportService } from '@/src/lib/services/ReportService';
import { ReportModel } from '@/src/lib/db/models/Report';
import { getMongo, toObjectId } from '@/src/lib/db/mongodb';
import { VoteModel } from '@/src/lib/db/models/Vote';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const service = new ReportService();

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } });
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireAuth(request);
    const form = await request.formData();
    const image = form.get('image');
    if (!(image instanceof File)) return jsonError('VALIDATION_ERROR', 'Image is required', undefined, 400);

    const category = String(form.get('category') || '');
    const title = String(form.get('title') || '');
    const description = String(form.get('description') || '');
    const latitude = form.get('latitude') != null ? Number(form.get('latitude')) : undefined;
    const longitude = form.get('longitude') != null ? Number(form.get('longitude')) : undefined;

    const body = { category, title, description, latitude, longitude };
    const parsed = CreateReportSchema.safeParse(body);
    if (!parsed.success) return jsonError('VALIDATION_ERROR', 'Validation failed', parsed.error.flatten(), 400);

    const report = await service.createReport(userId, parsed.data, image);
    return jsonOk({ report }, { headers: { 'Access-Control-Allow-Origin': '*' } });
  } catch (e) {
    return jsonError('SERVER_ERROR', (e as Error).message, undefined, 400);
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams.entries());
    const parsed = ReportFiltersSchema.safeParse({
      category: params.category,
      status: params.status,
      district: params.district,
      division: params.division,
      section: params.section,
      userId: params.userId,
      page: params.page,
      limit: params.limit,
      sort: params.sort,
      lat: params.lat,
      lng: params.lng,
    });
    if (!parsed.success) return jsonError('VALIDATION_ERROR', 'Invalid filters', parsed.error.flatten(), 400);

    const { page, limit, ...rest } = parsed.data;
    const reports = await ReportModel.findReports({ ...rest, page, limit });

    // Optionally enrich with current user's vote
    const me = await getCurrentUser(request);
    let reportsWithVote = reports as unknown as Array<Record<string, unknown>>;
    if (me) {
      const ids = reports.map((r) => r._id.toString());
      const votes = await VoteModel.findVotesForReports(me.id, ids);
      const voteMap = new Map(votes.map((v) => [v.reportId.toString(), v.voteType]));
      reportsWithVote = reports.map((r) => ({ ...r, myVote: (voteMap.get(r._id.toString()) as 'UP' | 'DOWN' | undefined) ?? null }));
    }

    // Total count for pagination (without geo sort)
    const { collections } = await getMongo();
    const countQuery: Record<string, unknown> = {};
    if (rest.category) countQuery.category = rest.category;
    if (rest.status) countQuery.status = rest.status;
    if (rest.district) countQuery.district = rest.district;
    if (rest.division) countQuery['roadData.division'] = rest.division;
    if (rest.section) countQuery['roadData.section'] = rest.section;
    if (rest.userId) countQuery.userId = toObjectId(rest.userId);

    const total = await collections.reports.countDocuments(countQuery);
    const totalPages = Math.ceil(total / (limit || 20));

    return jsonOk({ reports: reportsWithVote, pagination: { page, limit, total, totalPages } }, { headers: { 'Access-Control-Allow-Origin': '*' } });
  } catch (e) {
    return jsonError('SERVER_ERROR', (e as Error).message, undefined, 400);
  }
}
