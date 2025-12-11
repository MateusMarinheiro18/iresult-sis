// src/app/api/rh/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';

const COOKIE_NAME = 'sis_rh_sess';
const JWT_SECRET = process.env.APP_JWT_SECRET || 'dev-secret-change-me';
const COOKIE_MAX_AGE = Number(process.env.RH_COOKIE_MAX_AGE ?? 60 * 60 * 24 * 7); // default 7 dias

type JWTPayload = { sub: number | string; email?: string; empresaId?: number; role?: string };

function cookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    path: '/',
    sameSite: 'lax' as const,
    secure: isProduction && process.env.USE_SECURE_COOKIES === 'true',
    maxAge: COOKIE_MAX_AGE,
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as any;
    const email = String(body?.email ?? '').trim().toLowerCase();
    const senha = String(body?.senha ?? '');

    if (!email || !senha) {
      return NextResponse.json({ error: 'Email e senha são obrigatórios.' }, { status: 400 });
    }

    const user = await prisma.empresaUsuario.findFirst({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 });
    }

    const senhaHash = (user as any).senha_hash ?? '';
    const ok = await bcrypt.compare(senha, senhaHash);
    if (!ok) {
      return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 });
    }

    // payload
    const payload: JWTPayload = {
      sub: user.id_usuario_rh,
      email: user.email ?? undefined,
      empresaId: user.id_empresa ?? undefined,
      role: 'rh',
    };

    const token = jwt.sign(payload as any, JWT_SECRET, { expiresIn: COOKIE_MAX_AGE });

    const res = NextResponse.json({
      message: 'Autenticado',
      redirectTo: '/client/dashboard',
      user: { id: user.id_usuario_rh, nome: user.nome, email: user.email, empresaId: user.id_empresa },
    });
    res.cookies.set(COOKIE_NAME, token, cookieOptions());

    return res;
  } catch (err) {
    console.error('POST /api/rh/login error', err);
    return NextResponse.json({ error: 'Erro interno ao autenticar.' }, { status: 500 });
  }
}
