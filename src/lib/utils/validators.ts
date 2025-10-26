import { ZodSchema, ZodError } from 'zod';
import { jsonError } from '@/src/lib/middleware/errorHandler';

export function parseOrError<T>(schema: ZodSchema<T>, data: unknown): { ok: true; data: T } | { ok: false; response: Response } {
  try {
    const parsed = schema.parse(data);
    return { ok: true, data: parsed };
  } catch (e) {
    const err = e as ZodError;
    return {
      ok: false,
      response: jsonError('VALIDATION_ERROR', 'Validation failed', err.flatten(), 400),
    };
  }
}
