import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyRhToken } from '@/lib/auth/jwt';

type RouteParams = { reportId: string };

/**
 * GET /api/client/reports/:reportId
 * - Exige cookie sis_rh_sess
 * - Garante que o RH pertence à mesma empresa do relatório
 * - Retorna relatório com datas em ISO
 */

function resolveReportIdFromResolvedParams(resolvedParams: { [k: string]: any } | null | undefined) {
  if (!resolvedParams) return NaN;
  const maybe = resolvedParams.reportId ?? resolvedParams.id ?? null;
  const num = maybe != null ? Number(maybe) : NaN;
  return Number.isFinite(num) && num > 0 ? num : NaN;
}

export async function GET(_request: NextRequest, context: { params: Promise<RouteParams> }) {
  try {
    const resolved = await context.params;
    const reportId = resolveReportIdFromResolvedParams(resolved);
    if (Number.isNaN(reportId)) {
      return NextResponse.json({ message: 'reportId inválido' }, { status: 400 });
    }

    // auth: RH token
    const token = _request.cookies.get('sis_rh_sess')?.value;
    if (!token) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 });

    const { ok, payload } = verifyRhToken(token);
    if (!ok || !payload) return NextResponse.json({ message: 'Token inválido ou expirado' }, { status: 401 });

    const rhId = Number(payload.sub);
    if (!rhId || Number.isNaN(rhId)) return NextResponse.json({ message: 'ID do usuário inválido' }, { status: 401 });

    // checa vínculo RH -> empresa
    const rh = await prisma.empresaUsuario.findUnique({
      where: { id_usuario_rh: rhId },
      select: { id_usuario_rh: true, id_empresa: true },
    });
    if (!rh || !rh.id_empresa) {
      return NextResponse.json({ message: 'Usuário não vinculado a nenhuma empresa.' }, { status: 403 });
    }
    const companyId = Number(rh.id_empresa);

    // busca relatório
    const rel = await prisma.empresaRelatorio.findUnique({
      where: { id: reportId },
      select: {
        id: true,
        idEmpresa: true,
        titulo: true,
        texto: true,
        dataPublicacao: true,
        created: true,
        updated: true,
        fileKey: true,
        ativo: true,
        deleted: true,
      },
    });

    if (!rel || rel.idEmpresa !== companyId) {
      return NextResponse.json({ message: 'Relatório não encontrado.' }, { status: 404 });
    }
    if (rel.deleted !== null || rel.ativo !== 1) {
      return NextResponse.json({ message: 'Relatório indisponível.' }, { status: 404 });
    }

    const safe = {
      id: rel.id,
      titulo: rel.titulo,
      texto: rel.texto ?? null,
      dataPublicacao: rel.dataPublicacao ? rel.dataPublicacao.toISOString() : null,
      created: rel.created ? rel.created.toISOString() : null,
      updated: rel.updated ? rel.updated.toISOString() : null,
      fileKey: rel.fileKey ?? null,
      idEmpresa: rel.idEmpresa,
    };

    return NextResponse.json(safe, { status: 200 });
  } catch (err: any) {
    console.error('API client GET report error:', err);
    return NextResponse.json({ message: 'Erro interno ao buscar relatório.' }, { status: 500 });
  }
}
