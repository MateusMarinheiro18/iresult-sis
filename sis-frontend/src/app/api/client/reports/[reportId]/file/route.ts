import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { presignGetUrl } from '@/lib/s3';
import { verifyRhToken } from '@/lib/auth/jwt';

type RouteParams = { reportId: string };

/**
 * GET /api/client/reports/:reportId/file
 * - Exige cookie sis_rh_sess
 * - Garante vínculo RH <-> empresa do relatório
 * - Retorna { url, expiresIn, title } se fileKey existir
 */

function resolveReportIdFromResolvedParams(resolvedParams: { [k: string]: any } | null | undefined) {
  if (!resolvedParams) return NaN;
  const maybe = resolvedParams.reportId ?? resolvedParams.id ?? null;
  const num = maybe != null ? Number(maybe) : NaN;
  return Number.isFinite(num) && num > 0 ? num : NaN;
}

export async function GET(request: NextRequest, context: { params: Promise<RouteParams> }) {
  try {
    const resolved = await context.params;
    const reportId = resolveReportIdFromResolvedParams(resolved);
    if (Number.isNaN(reportId)) {
      return NextResponse.json({ message: 'reportId inválido' }, { status: 400 });
    }

    // auth RH
    const token = request.cookies.get('sis_rh_sess')?.value;
    if (!token) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 });

    const { ok, payload } = verifyRhToken(token);
    if (!ok || !payload) return NextResponse.json({ message: 'Token inválido ou expirado' }, { status: 401 });

    const rhId = Number(payload.sub);
    if (!rhId || Number.isNaN(rhId)) return NextResponse.json({ message: 'ID do usuário inválido' }, { status: 401 });

    const rh = await prisma.empresaUsuario.findUnique({
      where: { id_usuario_rh: rhId },
      select: { id_usuario_rh: true, id_empresa: true },
    });
    if (!rh || !rh.id_empresa) {
      return NextResponse.json({ message: 'Usuário não vinculado a nenhuma empresa.' }, { status: 403 });
    }
    const companyId = Number(rh.id_empresa);

    // busca relatório com fileKey
    const report = await prisma.empresaRelatorio.findUnique({
      where: { id: reportId },
      select: { id: true, idEmpresa: true, titulo: true, fileKey: true, ativo: true, deleted: true },
    });

    if (!report || report.idEmpresa !== companyId) {
      return NextResponse.json({ message: 'Relatório não encontrado para esta empresa.' }, { status: 404 });
    }
    if (report.deleted !== null) {
      return NextResponse.json({ message: 'Relatório deletado.' }, { status: 400 });
    }
    if (report.ativo !== 1) {
      return NextResponse.json({ message: 'Relatório inativo.' }, { status: 400 });
    }
    if (!report.fileKey) {
      return NextResponse.json({ message: 'Este relatório não possui arquivo anexado.' }, { status: 404 });
    }

    const EXPIRES = 60;
    const url = await presignGetUrl(String(report.fileKey), EXPIRES);

    return NextResponse.json({ url, expiresIn: EXPIRES, title: report.titulo }, { status: 200 });
  } catch (err: any) {
    console.error('[client file] erro:', err);
    return NextResponse.json({ message: 'Erro ao gerar URL do arquivo.', details: err?.message ?? null }, { status: 500 });
  }
}
