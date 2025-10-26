import type { NextRequest } from 'next/server';
import { AuthService } from '@/src/lib/services/AuthService';
import { UserModel } from '@/src/lib/db/models/User';

const authService = new AuthService();

export interface AuthContext {
  userId: string;
  role: string;
}

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export function extractBearerToken(req: NextRequest | Request): string | null {
  const header = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!header) return null;
  const m = header.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

export async function requireAuth(req: NextRequest | Request, roles?: string[]): Promise<AuthContext> {
  const token = extractBearerToken(req);
  if (!token) throw new Error('Missing Authorization header');
  const payload = await authService.verifyToken(token);
  if (!payload?.sub) throw new Error('Invalid token');
  if (roles && roles.length && !roles.includes(payload.role)) throw new Error('Forbidden');
  return { userId: payload.sub, role: payload.role };
}

export async function getCurrentUser(req: NextRequest | Request): Promise<CurrentUser | null> {
  const token = extractBearerToken(req);
  if (!token) return null;
  try {
    const payload = await authService.verifyToken(token);
    if (!payload?.sub) return null;
    const user = await UserModel.findUserById(payload.sub);
    if (!user) return null;
    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
    };
  } catch {
    return null;
  }
}
