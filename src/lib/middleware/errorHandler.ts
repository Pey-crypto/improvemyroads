export type ApiErrorCode = 'VALIDATION_ERROR' | 'NOT_FOUND' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'SERVER_ERROR';

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return Response.json({ success: true, data }, { status: 200, ...init });
}

export function jsonError(code: ApiErrorCode, message: string, details?: unknown, status?: number) {
  return Response.json(
    { success: false, error: { code, message, details } },
    { status: status || 400 }
  );
}
