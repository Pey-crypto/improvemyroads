import { ensureDirectoryExists, writeFile, getUploadBaseDir } from '@/src/lib/utils/fileSystem';
import path from 'path';
import { nanoid } from 'nanoid';
import sharp from 'sharp';
import { put } from '@vercel/blob';

export interface UploadResult {
  url: string; // /uploads/reports/2024/10/25/xxx.jpg
  path: string; // absolute filesystem path
  filename: string;
  size: number;
  mimeType: string;
  width?: number;
  height?: number;
  thumbnailUrl?: string;
}

const MAX_SIZE = Number(process.env.MAX_FILE_SIZE || 5 * 1024 * 1024); // 5MB
const ALLOWED = (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,image/webp')
  .split(',')
  .map((s) => s.trim());

export class FileUploadService {
  private validateImage(file: File) {
    if (!ALLOWED.includes(file.type)) {
      throw new Error(`Invalid file type. Allowed: ${ALLOWED.join(', ')}`);
    }
    if (file.size > MAX_SIZE) {
      throw new Error(`File too large. Max ${MAX_SIZE} bytes`);
    }
  }

  private generateFilename(originalName: string): string {
    const ts = Date.now();
    const rand = nanoid(6);
    const ext = originalName.includes('.') ? originalName.split('.').pop()!.toLowerCase() : 'jpg';
    return `${ts}-${rand}.${ext}`;
  }

  private getDatePath(folder: 'reports' | 'avatars') {
    const d = new Date();
    const yyyy = String(d.getFullYear());
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const base = getUploadBaseDir(); // e.g., 'public/uploads'
    let baseRel = base;
    if (baseRel.startsWith('public/')) baseRel = baseRel.slice('public/'.length);
    if (baseRel.startsWith('/')) baseRel = baseRel.slice(1);
    const rel = path.posix.join(baseRel || 'uploads', folder, yyyy, mm, dd);
    const abs = path.join(process.cwd(), 'public', rel);
    return { rel, abs };
  }

  async uploadImage(file: File, folder: 'reports' | 'avatars' = 'reports'): Promise<UploadResult> {
    this.validateImage(file);
    const { rel, abs } = this.getDatePath(folder);

    const filename = this.generateFilename(file.name);
    const ab = await file.arrayBuffer();
    const buffer = Buffer.from(ab);

    const meta = await sharp(buffer).metadata();

    const useBlob = (process.env.UPLOAD_PROVIDER || '').toLowerCase() === 'blob';
    if (useBlob) {
      const key = `${rel}/${filename}`;
      const uploaded = await put(key, buffer, {
        access: 'public',
        contentType: file.type,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });

      let thumbnailUrl: string | undefined;
      if (meta.width && meta.width > 1200) {
        const thumbName = filename.replace(/\.(\w+)$/, '-thumb.$1');
        const thumbKey = `${rel}/${thumbName}`;
        const thumbBuffer = await sharp(buffer).resize({ width: 1200 }).toBuffer();
        const thumbUploaded = await put(thumbKey, thumbBuffer, {
          access: 'public',
          contentType: file.type,
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });
        thumbnailUrl = thumbUploaded.url;
      }

      const result: UploadResult = {
        url: uploaded.url,
        path: key,
        filename,
        size: buffer.length,
        mimeType: file.type,
        width: meta.width,
        height: meta.height,
        thumbnailUrl,
      };
      return result;
    }

    await ensureDirectoryExists(abs);
    const fullPath = path.join(abs, filename);
    await writeFile(fullPath, buffer);

    let thumbnailUrl: string | undefined;
    if (meta.width && meta.width > 1200) {
      const thumbName = filename.replace(/\.(\w+)$/, '-thumb.$1');
      const thumbPath = path.join(abs, thumbName);
      await sharp(buffer).resize({ width: 1200 }).toFile(thumbPath);
      thumbnailUrl = `/${rel}/${thumbName}`;
    }

    const result: UploadResult = {
      url: `/${rel}/${filename}`,
      path: fullPath,
      filename,
      size: buffer.length,
      mimeType: file.type,
      width: meta.width,
      height: meta.height,
      thumbnailUrl,
    };
    return result;
  }

  async deleteImage(imagePath: string): Promise<boolean> {
    try {
      const full = path.join(process.cwd(), 'public', imagePath.replace(/^\//, ''));
      const fs = await import('fs/promises');
      await fs.unlink(full);
      return true;
    } catch {
      return false;
    }
  }
}
