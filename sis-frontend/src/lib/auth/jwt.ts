// src/lib/auth/jwt.ts
import jwt from 'jsonwebtoken';

const SECRET = process.env.APP_JWT_SECRET || process.env.NEXTAUTH_SECRET;
const EXPIRES_IN = Number(process.env.APP_JWT_EXPIRES || 28800); // seconds

if (!SECRET) {
  console.warn('APP_JWT_SECRET is not set. Set it in your .env for production use.');
}

export function signAdminToken(payload: { sub: number; email?: string }) {
  return jwt.sign(
    {
      sub: payload.sub,
      email: payload.email,
    },
    SECRET as string,
    {
      algorithm: 'HS256',
      expiresIn: EXPIRES_IN,
      issuer: process.env.APP_JWT_ISSUER ?? 'SIS',
    }
  );
}

export function verifyAdminToken(token: string) {
  try {
    const decoded = jwt.verify(token, SECRET as string) as any;
    return { ok: true, payload: decoded as { sub: number; email?: string; iat?: number; exp?: number } };
  } catch (err: any) {
    return { ok: false, error: err };
  }
}
