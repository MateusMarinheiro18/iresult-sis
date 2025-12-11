// src/app/api/rh/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import cookie from 'cookie';
import { prisma } from '@/lib/prisma';
import { verifyRhToken } from '@/lib/auth/jwt';

export async function GET(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie') ?? '';
    const parsed = cookie.parse(cookieHeader || '');
    const token = parsed.sis_rh_sess;

    if (!token) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

    const { ok, payload } = verifyRhToken(token);
    if (!ok || !payload?.sub) {
      return NextResponse.json({ error: 'Token inválido.' }, { status: 401 });
    }

    const userId = Number(payload.sub);
    const user = await prisma.empresaUsuario.findUnique({
      where: { id_usuario_rh: userId },
      select: { id_usuario_rh: true, nome: true, email: true, id_empresa: true },
    });

    if (!user) return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 401 });

    return NextResponse.json({ data: { id: user.id_usuario_rh, nome: user.nome, email: user.email, empresaId: user.id_empresa } }, { status: 200 });
  } catch (err) {
    console.error('GET /api/rh/me error', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
