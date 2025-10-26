import { NextRequest } from 'next/server';
import { LoginSchema } from '@/src/lib/db/types/schemas';
import { parseOrError } from '@/src/lib/utils/validators';
import { jsonError, jsonOk } from '@/src/lib/middleware/errorHandler';
import { AuthService } from '@/src/lib/services/AuthService';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const auth = new AuthService();

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = parseOrError(LoginSchema, body);
  if (!parsed.ok) return parsed.response;
  try {
    const result = await auth.login(parsed.data.email, parsed.data.password);
    return jsonOk(result, { headers: { 'Access-Control-Allow-Origin': '*' } });
  } catch (e) {
    return jsonError('UNAUTHORIZED', (e as Error).message, undefined, 401);
  }
}
