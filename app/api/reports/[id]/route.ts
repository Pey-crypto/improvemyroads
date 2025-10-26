import { NextRequest } from 'next/server';
import { requireAuth } from '@/src/lib/middleware/auth';
import { jsonError, jsonOk } from '@/src/lib/middleware/errorHandler';
import { ReportModel } from '@/src/lib/db/models/Report';
import { UserModel } from '@/src/lib/db/models/User';
import { VoteModel } from '@/src/lib/db/models/Vote';
import { UpdateReportSchema } from '@/src/lib/db/types/schemas';
import { FileUploadService } from '@/src/lib/services/FileUploadService';
import { getCurrentUser } from '@/src/lib/middleware/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const report = await ReportModel.findReportById(id);
  if (!report) return jsonError('NOT_FOUND', 'Report not found', undefined, 404);
  const user = await UserModel.findUserById(report.userId.toString());
  const me = await getCurrentUser(request);
  const myVote = me ? await VoteModel.findVote(me.id, id) : null;
  const response = {
    ...report,
    user: user ? { id: user._id.toString(), name: user.name } : undefined,
    myVote: myVote?.voteType || null,
  };
  return jsonOk(response, { headers: { 'Access-Control-Allow-Origin': '*' } });
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await requireAuth(request, ['ADMIN']);
    const body = await request.json();
    const parsed = UpdateReportSchema.safeParse(body);
    if (!parsed.success) return jsonError('VALIDATION_ERROR', 'Invalid payload', parsed.error.flatten(), 400);
    const doc = await ReportModel.updateReport(id, { ...parsed.data, resolvedAt: parsed.data.status === 'RESOLVED' ? new Date() : undefined });
    return jsonOk(doc, { headers: { 'Access-Control-Allow-Origin': '*' } });
  } catch (e) {
    return jsonError('SERVER_ERROR', (e as Error).message, undefined, 400);
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const me = await getCurrentUser(request);
    if (!me) return jsonError('UNAUTHORIZED', 'Not authenticated', undefined, 401);
    const report = await ReportModel.findReportById(id);
    if (!report) return jsonError('NOT_FOUND', 'Report not found', undefined, 404);
    const isOwner = report.userId.toString() === me.id;
    const isAdmin = me.role === 'ADMIN';
    if (!isOwner && !isAdmin) return jsonError('FORBIDDEN', 'Not allowed', undefined, 403);
    if (isOwner && report.status !== 'PENDING' && !isAdmin) return jsonError('FORBIDDEN', 'Cannot delete after review started', undefined, 403);
    
    // Delete the report and associated data
    const ok = await ReportModel.deleteReport(id);
    if (ok) {
      // Cleanup associated votes
      await VoteModel.deleteVotesByReport(id);
      // Delete image if exists
      if (report.imageUrl) await new FileUploadService().deleteImage(report.imageUrl);
    }
    
    return jsonOk({ deleted: ok }, { headers: { 'Access-Control-Allow-Origin': '*' } });
  } catch (e) {
    return jsonError('SERVER_ERROR', (e as Error).message, undefined, 400);
  }
}
