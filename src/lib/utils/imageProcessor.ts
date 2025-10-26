import sharp from 'sharp';

export interface ImageMeta {
  width?: number;
  height?: number;
  format?: string;
  size?: number;
}

export async function metadata(buffer: Buffer): Promise<ImageMeta> {
  const meta = await sharp(buffer).metadata();
  return { width: meta.width, height: meta.height, format: meta.format };
}

export async function resizeToWidth(buffer: Buffer, width: number): Promise<Buffer> {
  return sharp(buffer).resize({ width }).toBuffer();
}
