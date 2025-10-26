import { promises as fs } from 'fs';
import path from 'path';

export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function writeFile(fullPath: string, data: Buffer): Promise<void> {
  await ensureDirectoryExists(path.dirname(fullPath));
  await fs.writeFile(fullPath, data);
}

export async function deleteFile(fullPath: string): Promise<boolean> {
  try {
    await fs.unlink(fullPath);
    return true;
  } catch {
    return false;
  }
}

export function joinPath(...segments: string[]) {
  return path.join(...segments);
}

export function getUploadBaseDir() {
  return process.env.UPLOAD_DIR || 'public/uploads';
}
