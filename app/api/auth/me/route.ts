import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/src/lib/middleware/auth';
import { jsonOk, jsonError } from '@/src/lib/middleware/errorHandler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) return jsonError('UNAUTHORIZED', 'Not authenticated', undefined, 401);
  return jsonOk(user, { headers: { 'Access-Control-Allow-Origin': '*' } });
}
