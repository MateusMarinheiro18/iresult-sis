// src/app/api/admins/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';

const COOKIE_NAME = 'sis_admin_sess'; // DEVE SER O MESMO DO MIDDLEWARE
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 dias

function cookieOptions() {
  return {
    httpOnly: true,
    path: '/',
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE,
  };
}

type JWTP = { sub: number | string; email?: string } & JwtPayload;

/** POST -> autentica (email + senha) e seta cookie JWT */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as any;
    const email = (body.email ?? '').toString().trim();
    const senha = (body.senha ?? '').toString();

    if (!email || !senha) {
      return NextResponse.json({ error: 'Email e senha são obrigatórios.' }, { status: 400 });
    }

    // *** IMPORTANTE: se email não é unique no schema, use findFirst ***
    const admin = await prisma.administrador.findFirst({ where: { email } });
    if (!admin) {
      return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 });
    }

    const senhaHash = (admin as any).senhaHash ?? (admin as any).senha_hash ?? '';
    const ok = await bcrypt.compare(senha, senhaHash);
    if (!ok) {
      return NextResponse.json({ error: 'Credenciais inválidas.' }, { status: 401 });
    }

    // cria JWT
    const token = jwt.sign(
      { sub: admin.id, email: admin.email },
      JWT_SECRET,
      { expiresIn: COOKIE_MAX_AGE } // seconds or string
    );

    const res = NextResponse.json({ message: 'Autenticado', redirectTo: '/admin/dashboard' });
    res.cookies.set(COOKIE_NAME, token, cookieOptions());

    return res;
  } catch (err) {
    console.error('POST /api/admins/login error', err);
    return NextResponse.json({ error: 'Erro interno ao autenticar.' }, { status: 500 });
  }
}

/** GET -> checar sessão (retorna authenticated + admin minimal) */
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (!token) return NextResponse.json({ authenticated: false }, { status: 401 });

    let decoded: string | JwtPayload;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // garante que payload é objeto (JwtPayload)
    let payload: JWTP | null = null;
    if (typeof decoded === 'string') {
      // token decodificado como string (incomum para nossos JWTs) -> inválido para nossos usos
      return NextResponse.json({ authenticated: false }, { status: 401 });
    } else {
      payload = decoded as JWTP;
    }

    const adminId = Number(payload.sub);
    if (!adminId || Number.isNaN(adminId)) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const admin = await prisma.administrador.findUnique({
      where: { id: adminId },
      select: { id: true, nome: true, email: true },
    });

    if (!admin) return NextResponse.json({ authenticated: false }, { status: 401 });

    return NextResponse.json({ authenticated: true, admin });
  } catch (err) {
    console.error('GET /api/admins/login error', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
