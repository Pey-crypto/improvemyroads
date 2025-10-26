export type ApiErrorCode = 'VALIDATION_ERROR' | 'NOT_FOUND' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'SERVER_ERROR';

function withCors(init?: ResponseInit): ResponseInit {
  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
  const mergedHeaders = { ...corsHeaders, ...(init?.headers as Record<string, string> | undefined) };
  return { ...init, headers: mergedHeaders };
}

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return Response.json({ success: true, data }, withCors({ status: 200, ...init }));
}

export function jsonError(code: ApiErrorCode, message: string, details?: unknown, status?: number) {
  return Response.json(
    { success: false, error: { code, message, details } },
    withCors({ status: status || 400 })
  );
}
