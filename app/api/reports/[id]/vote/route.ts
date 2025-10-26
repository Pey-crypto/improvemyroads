import { NextRequest } from 'next/server';
import { requireAuth } from '@/src/lib/middleware/auth';
import { jsonError, jsonOk } from '@/src/lib/middleware/errorHandler';
import { VoteSchema } from '@/src/lib/db/types/schemas';
import { VoteModel } from '@/src/lib/db/models/Vote';
import { ReportModel } from '@/src/lib/db/models/Report';
import { ObjectId } from 'mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    
    // Validate ObjectId format early
    if (!ObjectId.isValid(id)) {
      return jsonError('VALIDATION_ERROR', 'Invalid report ID format', undefined, 400);
    }
    
    const { userId } = await requireAuth(request);
    
    const body = await request.json();
    const parsed = VoteSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError('VALIDATION_ERROR', 'Invalid vote data', parsed.error.flatten(), 400);
    }
    const vt = parsed.data.voteType;
    if (vt === 'UP') {
      console.log(`[VOTE:UP] incoming user=${userId} report=${id}`);
    } else {
      console.log(`[VOTE:${vt}] incoming user=${userId} report=${id}`);
    }

    // Check if report exists before creating vote
    const report = await ReportModel.findReportById(id);
    if (!report) {
      return jsonError('NOT_FOUND', 'Report not found', undefined, 404);
    }

    const existing = await VoteModel.findVote(userId, id);
    console.log(`[VOTE:${vt}] existing=${existing ? existing.voteType : 'none'}`);
    let userVote: 'UP' | 'DOWN' | null = null;
    let deltaUp = 0;
    let deltaDown = 0;

    try {
      if (!existing) {
        // New vote: create and increment
        await VoteModel.createVote(userId, id, parsed.data.voteType);
        userVote = parsed.data.voteType;
        deltaUp = userVote === 'UP' ? 1 : 0;
        deltaDown = userVote === 'DOWN' ? 1 : 0;
        if (vt === 'UP') console.log(`[VOTE:UP] action=create user=${userId} report=${id} -> deltaUp=${deltaUp} deltaDown=${deltaDown}`);
      } else if (existing.voteType === parsed.data.voteType) {
        // Same vote: toggle off (delete)
        await VoteModel.deleteVote(userId, id);
        userVote = null;
        deltaUp = existing.voteType === 'UP' ? -1 : 0;
        deltaDown = existing.voteType === 'DOWN' ? -1 : 0;
        if (vt === 'UP') console.log(`[VOTE:UP] action=toggle-off user=${userId} report=${id} -> deltaUp=${deltaUp} deltaDown=${deltaDown}`);
      } else {
        // Different vote: change vote type
        await VoteModel.updateVote(userId, id, parsed.data.voteType);
        userVote = parsed.data.voteType;
        deltaUp = parsed.data.voteType === 'UP' ? 1 : -1;
        deltaDown = parsed.data.voteType === 'DOWN' ? 1 : -1;
        if (vt === 'UP') console.log(`[VOTE:UP] action=change from=${existing.voteType} to=${vt} user=${userId} report=${id} -> deltaUp=${deltaUp} deltaDown=${deltaDown}`);
      }

      // Apply vote count adjustments
      const updated = await ReportModel.adjustVotes(id, deltaUp, deltaDown);
      if (vt === 'UP') console.log(`[VOTE:UP] adjusted => upvotes=${updated.upvotes} downvotes=${updated.downvotes}; userVote=${userVote}`);
      
      // Validate that counts didn't go negative (shouldn't happen but safety check)
      if (updated.upvotes < 0 || updated.downvotes < 0) {
        console.error(`[VOTE] Negative vote count detected for report ${id}: upvotes=${updated.upvotes}, downvotes=${updated.downvotes}`);
        // Correct the negative values
        await ReportModel.updateReport(id, {
          upvotes: Math.max(0, updated.upvotes),
          downvotes: Math.max(0, updated.downvotes)
        });
      }

      return jsonOk(
        { 
          report: { 
            id, 
            upvotes: Math.max(0, updated.upvotes), 
            downvotes: Math.max(0, updated.downvotes) 
          }, 
          userVote 
        }, 
        { headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    } catch (voteError: unknown) {
      // Handle duplicate vote error from unique index
      if (voteError && typeof voteError === 'object' && 'code' in voteError && voteError.code === 11000) {
        console.warn(`[VOTE:${vt}] duplicate vote detected user=${userId} report=${id}`);
        return jsonError('VALIDATION_ERROR', 'Vote already exists', undefined, 409);
      }
      throw voteError;
    }
  } catch (e) {
    const error = e as Error;
    console.error('[VOTE] Error:', error);
    
    // Provide more specific error messages
    if (error.message.includes('not found')) {
      return jsonError('NOT_FOUND', error.message, undefined, 404);
    }
    if (error.message.includes('Invalid') || error.message.includes('invalid')) {
      return jsonError('VALIDATION_ERROR', error.message, undefined, 400);
    }
    
    return jsonError('SERVER_ERROR', error.message, undefined, 500);
  }
}
