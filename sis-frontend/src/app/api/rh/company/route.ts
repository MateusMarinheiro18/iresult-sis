import { NextRequest, NextResponse } from 'next/server';
import cookie from 'cookie';
import { prisma } from '@/lib/prisma';
import { verifyRhToken } from '@/lib/auth/jwt';

/**
 * GET /api/rh/company
 * - extrai empresaId do cookie sis_rh_sess (token RH)
 * - retorna informações da empresa do usuário RH logado
 */
export async function GET(request: NextRequest) {
  try {
    // 1) extrair token RH do cookie
    const cookieHeader = request.headers.get('cookie') ?? '';
    const parsed = cookie.parse(cookieHeader || '');
    const token = parsed.sis_rh_sess;

    if (!token) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const { ok, payload } = verifyRhToken(token);
    if (!ok || !payload?.sub) {
      return NextResponse.json({ error: 'Token inválido.' }, { status: 401 });
    }

    const userId = Number(payload.sub);
    if (!userId || Number.isNaN(userId)) {
      return NextResponse.json({ error: 'ID de usuário inválido.' }, { status: 401 });
    }

    // 2) buscar usuário RH para obter id_empresa e dados da empresa
    const user = await prisma.empresaUsuario.findUnique({
      where: { id_usuario_rh: userId },
      select: {
        id_empresa: true,
        empresa: {
          select: {
            id: true,
            razaoSocial: true
          }
        }
      }
    });

    if (!user || !user.id_empresa || !user.empresa) {
      return NextResponse.json({ error: 'Usuário sem empresa vinculada.' }, { status: 400 });
    }

    // 3) retornar dados da empresa no formato esperado pelo Headbar
    return NextResponse.json({
      id: user.empresa.id,
      name: user.empresa.razaoSocial
    }, { status: 200 });

  } catch (err) {
    console.error('API GET /api/rh/company error:', err);
    return NextResponse.json({ error: 'Erro interno ao buscar empresa.' }, { status: 500 });
  }
}
