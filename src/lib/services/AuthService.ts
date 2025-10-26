import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserModel } from '@/src/lib/db/models/User';
import type { RegisterInput } from '@/src/lib/db/types/schemas';

export interface TokenPayload {
  sub: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface AuthResult {
  user: { id: string; email: string; name: string; role: string };
  token: string;
  expiresAt: Date;
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export class AuthService {
  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  async generateToken(userId: string, role: string): Promise<string> {
    const payload = { role };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: Math.floor(this.expiresMs() / 1000), subject: userId });
  }

  async verifyToken(token: string): Promise<TokenPayload> {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  }

  async register(data: RegisterInput): Promise<AuthResult> {
    const hashed = await this.hashPassword(data.password);
    const user = await UserModel.createUser({
      email: data.email,
      phone: data.phone,
      name: data.name,
      password: hashed,
    });
    const token = await this.generateToken(user._id.toString(), user.role);
    const expiresAt = new Date(Date.now() + this.expiresMs());
    return { user: { id: user._id.toString(), email: user.email, name: user.name, role: user.role }, token, expiresAt };
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const user = await UserModel.findUserByEmail(email);
    if (!user) throw new Error('Invalid credentials');
    const ok = await this.verifyPassword(password, user.password);
    if (!ok) throw new Error('Invalid credentials');
    const token = await this.generateToken(user._id.toString(), user.role);
    const expiresAt = new Date(Date.now() + this.expiresMs());
    return { user: { id: user._id.toString(), email: user.email, name: user.name, role: user.role }, token, expiresAt };
  }

  private expiresMs() {
    // Approximate parsing for days only (7d etc.). For standard durations use ms library, but avoid extra deps.
    const m = String(JWT_EXPIRES_IN).match(/(\d+)d/);
    if (m) return Number(m[1]) * 24 * 60 * 60 * 1000;
    return 7 * 24 * 60 * 60 * 1000;
  }
}
