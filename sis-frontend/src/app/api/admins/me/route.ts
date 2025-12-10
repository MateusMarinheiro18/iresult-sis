// src/app/api/admins/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import cookie from 'cookie';
import { verifyAdminToken } from '@/lib/auth/jwt';

export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie') ?? '';
    const parsed = cookie.parse(cookieHeader || '');
    const token = parsed.sis_admin_session;

    if (!token) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

    const { ok, payload } = verifyAdminToken(token);
    if (!ok || !payload?.sub) {
      return NextResponse.json({ error: 'Token inválido.' }, { status: 401 });
    }

    const adminId = Number(payload.sub);
    const admin = await prisma.administrador.findUnique({
      where: { id: adminId },
      select: { id: true, nome: true, email: true },
    });

    if (!admin) return NextResponse.json({ error: 'Administrador não encontrado.' }, { status: 401 });

    return NextResponse.json({ data: admin }, { status: 200 });
  } catch (err) {
    console.error('GET /api/admins/me error', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
