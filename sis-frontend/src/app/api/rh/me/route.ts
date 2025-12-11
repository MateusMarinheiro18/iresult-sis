// src/app/api/rh/me/route.ts
import { NextRequest, NextResponse } from 'next/server';
import cookie from 'cookie';
import { prisma } from '@/lib/prisma';
import { verifyRhToken } from '@/lib/auth/jwt';

export async function GET(request: NextRequest) {
  try {
    // 1) Ler cookie
    const cookieHeader = request.headers.get('cookie') ?? '';
    const parsed = cookie.parse(cookieHeader || '');
    const token = parsed.sis_rh_sess;

    if (!token) {
      console.warn('GET /api/rh/me -> Cookie sis_rh_sess não encontrado');
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    // 2) Verificar token (compatível async/sync)
    const verification = await Promise.resolve(verifyRhToken(token));
    const { ok, payload } = verification ?? {};

    if (!ok || !payload?.sub) {
      console.warn('GET /api/rh/me -> Token inválido', verification);
      return NextResponse.json({ error: 'Token inválido.' }, { status: 401 });
    }

    const userId = Number(payload.sub);
    if (Number.isNaN(userId) || userId <= 0) {
      console.warn('GET /api/rh/me -> "sub" inválido no payload', payload);
      return NextResponse.json({ error: 'Token inválido.' }, { status: 401 });
    }

    // 3) Buscar usuário pelo campo REAL do banco (id_usuario_rh)
    const user = await prisma.empresaUsuario.findUnique({
      where: { id_usuario_rh: userId },
      select: {
        id_usuario_rh: true,
        nome: true,
        email: true,
        id_empresa: true
      }
    });

    if (!user) {
      console.warn('GET /api/rh/me -> Usuário não encontrado no banco', { userId });
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 401 });
    }

    // 4) Normalização da resposta (garante compatibilidade com o client)
    const empresaId = user.id_empresa ?? null;
    const response = {
      id: user.id_usuario_rh,
      nome: user.nome,
      email: user.email,
      empresaId
    };

    console.log('GET /api/rh/me -> Usuário autenticado:', response);

    // **IMPORTANTE**: devolve empresaId no root E dentro de data
    return NextResponse.json(
      {
        data: response,
        empresaId: response.empresaId
      },
      { status: 200 }
    );

  } catch (err) {
    console.error('GET /api/rh/me error', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
