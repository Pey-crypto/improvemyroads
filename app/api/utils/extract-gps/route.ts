import { NextRequest } from 'next/server';
import { ExifExtractor } from '@/src/lib/services/ExifExtractor';
import { jsonOk, jsonError } from '@/src/lib/middleware/errorHandler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const exif = new ExifExtractor();

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const image = form.get('image');
    if (!(image instanceof File)) return jsonError('VALIDATION_ERROR', 'Image is required', undefined, 400);
    const ab = await image.arrayBuffer();
    const gps = await exif.extractGPS(Buffer.from(new Uint8Array(ab)));
    return jsonOk({ gps }, { headers: { 'Access-Control-Allow-Origin': '*' } });
  } catch (e) {
    return jsonError('SERVER_ERROR', (e as Error).message, undefined, 400);
  }
}
