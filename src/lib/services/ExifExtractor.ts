import * as ExifReader from 'exifreader';

export interface ImageMetadata {
  make?: string;
  model?: string;
  dateTime?: string;
}

export interface GPSResult {
  latitude: number;
  longitude: number;
  altitude?: number;
  timestamp?: Date;
  camera?: string;
  metadata?: ImageMetadata;
}

function toNumber(val: unknown): number | undefined {
  if (typeof val === 'number') return val;
  if (Array.isArray(val) && val.length) return Number(val[0]);
  const n = Number(val as unknown as string);
  return Number.isFinite(n) ? n : undefined;
}

function dmsToDecimal(dms: number[] | string, ref?: string): number | null {
  let d: number, m: number, s: number;
  if (typeof dms === 'string') {
    const parts = dms.split(',').map((p) => Number(p));
    [d, m, s] = parts as [number, number, number];
  } else {
    [d, m, s] = dms as [number, number, number];
  }
  if (![d, m, s].every((x) => Number.isFinite(x))) return null;
  let dd = d + m / 60 + s / 3600;
  if (ref === 'S' || ref === 'W') dd = -dd;
  return dd;
}

function bufferToArrayBuffer(buf: Buffer): ArrayBuffer {
  const copy = new Uint8Array(buf.byteLength);
  copy.set(buf);
  return copy.buffer;
}

export class ExifExtractor {
  async extractGPS(buffer: Buffer): Promise<GPSResult | null> {
    try {
      const ab = bufferToArrayBuffer(buffer);
      const tags = await ExifReader.load(ab);

      const lat = tags.GPSLatitude?.description || tags.GPSLatitude?.value;
      const latRef = tags.GPSLatitudeRef?.value || tags.GPSLatitudeRef?.description;
      const lng = tags.GPSLongitude?.description || tags.GPSLongitude?.value;
      const lngRef = tags.GPSLongitudeRef?.value || tags.GPSLongitudeRef?.description;

      const latD = dmsToDecimal(lat as string | number[], Array.isArray(latRef) ? String(latRef[0]) : String(latRef || 'N'));
      const lngD = dmsToDecimal(lng as string | number[], Array.isArray(lngRef) ? String(lngRef[0]) : String(lngRef || 'E'));

      if (latD == null || lngD == null) return null;

      const altitude = toNumber(tags.GPSAltitude?.value);
      const dateTime = tags.DateTimeOriginal?.description || tags.DateTime?.description;
      const make = tags.Make?.description;
      const model = tags.Model?.description;

      return {
        latitude: latD,
        longitude: lngD,
        altitude: altitude,
        timestamp: dateTime ? new Date(dateTime) : undefined,
        camera: [make, model].filter(Boolean).join(' '),
        metadata: { make, model, dateTime },
      };
    } catch {
      return null;
    }
  }
}

