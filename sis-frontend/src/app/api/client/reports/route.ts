import { NextRequest, NextResponse } from 'next/server';
import cookie from 'cookie';
import { prisma } from '@/lib/prisma';
import { verifyRhToken } from '@/lib/auth/jwt';

/**
 * GET /api/client/reports
 * - extrai empresaId do cookie sis_rh_sess (token RH)
 * - retorna relatórios ativos e não-deletados da empresa
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

    // 2) buscar usuário para obter id_empresa
    const user = await prisma.empresaUsuario.findUnique({
      where: { id_usuario_rh: userId },
      select: { id_empresa: true }
    });

    if (!user || !user.id_empresa) {
      return NextResponse.json({ error: 'Usuário sem empresa vinculada.' }, { status: 400 });
    }

    const companyId = Number(user.id_empresa);

    // 3) buscar relatórios ativos e não-deletados da empresa
    const rels = await prisma.empresaRelatorio.findMany({
      where: {
        idEmpresa: companyId,
        deleted: null,
        ativo: 1
      },
      orderBy: { dataPublicacao: 'desc' },
      select: { id: true, titulo: true, dataPublicacao: true }
    });

    // 4) normalizar datas (ISO) e retornar
    const items = rels.map(r => ({
      id: r.id,
      titulo: r.titulo,
      dataPublicacao: r.dataPublicacao ? (r.dataPublicacao instanceof Date ? r.dataPublicacao.toISOString() : String(r.dataPublicacao)) : null
    }));

    return NextResponse.json(items, { status: 200 });
  } catch (err) {
    console.error('API GET /api/client/reports error:', err);
    return NextResponse.json({ error: 'Erro interno ao listar relatórios.' }, { status: 500 });
  }
}
