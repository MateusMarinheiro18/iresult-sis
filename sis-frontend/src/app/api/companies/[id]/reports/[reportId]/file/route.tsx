// src/app/api/companies/[id]/reports/[reportId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { presignGetUrl } from '@/lib/s3';
import { verifyAdminToken } from '@/lib/auth/jwt';

/** stub de permissão por empresa — substitua quando integrar regras reais */
async function checkAdminForCompany(_adminId: number, _companyId: number) {
  return true;
}

type RouteParams = {
  id: string;
  reportId: string;
};

export async function GET(
  request: NextRequest,
  context: { params: Promise<RouteParams> }
) {
  try {
    const params = await context.params;
    const companyId = Number(params.id);
    const reportId = Number(params.reportId);

    if (!Number.isFinite(companyId) || companyId <= 0) {
      return NextResponse.json({ message: 'Empresa inválida.' }, { status: 400 });
    }
    if (!Number.isFinite(reportId) || reportId <= 0) {
      return NextResponse.json({ message: 'Relatório inválido.' }, { status: 400 });
    }

    // auth: exigir token no cookie
    const token = request.cookies.get('sis_admin_sess')?.value;
    if (!token) {
      return NextResponse.json({ message: 'Não autenticado' }, { status: 401 });
    }
    const { ok, payload } = verifyAdminToken(token);
    if (!ok || !payload) {
      return NextResponse.json({ message: 'Token inválido ou expirado' }, { status: 401 });
    }
    const adminId = Number(payload.sub);
    if (!adminId || Number.isNaN(adminId)) {
      return NextResponse.json({ message: 'ID do administrador inválido' }, { status: 401 });
    }

    // optional company-level permission check (stub)
    const allowed = await checkAdminForCompany(adminId, companyId);
    if (!allowed) {
      return NextResponse.json({ message: 'Não autorizado para esta empresa.' }, { status: 403 });
    }

    const report = await prisma.empresaRelatorio.findUnique({
      where: { id: reportId },
      select: {
        id: true,
        idEmpresa: true,
        titulo: true,
        fileKey: true,
        ativo: true,
        deleted: true,
      },
    });

    if (!report || report.idEmpresa !== companyId) {
      return NextResponse.json(
        { message: 'Relatório não encontrado para esta empresa.' },
        { status: 404 }
      );
    }

    if (report.deleted !== null) {
      return NextResponse.json({ message: 'Relatório deletado.' }, { status: 400 });
    }

    if (report.ativo !== 1) {
      return NextResponse.json({ message: 'Relatório inativo.' }, { status: 400 });
    }

    if (!report.fileKey) {
      return NextResponse.json(
        { message: 'Este relatório não possui arquivo anexado.' },
        { status: 404 }
      );
    }

    // gera URL de download presignada (60s por padrão)
    const EXPIRES = 60;
    const url = await presignGetUrl(String(report.fileKey), EXPIRES);

    return NextResponse.json(
      {
        url,
        expiresIn: EXPIRES,
        title: report.titulo,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('[file] erro:', err);
    return NextResponse.json(
      { message: 'Erro ao gerar URL do arquivo.', details: err?.message ?? null },
      { status: 500 }
    );
  }
}
