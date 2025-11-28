import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type RouteParams = {
  id: string;       // [id] = companyId
  reportId: string; // [reportId]
};

export async function POST(req: Request, ctx: { params: Promise<RouteParams> }) {
  try {
    const params = await ctx.params;
    const companyId = Number(params.id);
    const reportId = Number(params.reportId);

    if (!Number.isFinite(companyId) || companyId <= 0) {
      return NextResponse.json({ message: 'Empresa inválida.' }, { status: 400 });
    }
    if (!Number.isFinite(reportId) || reportId <= 0) {
      return NextResponse.json({ message: 'Relatório inválido.' }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ message: 'Body inválido.' }, { status: 400 });
    }

    const { fileKey, fileName, versionSuffix } = body ?? {};

    if (!fileKey || !fileName) {
      return NextResponse.json(
        { message: 'Campos obrigatórios: fileKey e fileName.' },
        { status: 400 }
      );
    }

    // valida padrão da key: reports/{companyId}/{reportId}-
    const expectedPrefix = `reports/${companyId}/${reportId}-`;
    if (!fileKey.startsWith(expectedPrefix)) {
      return NextResponse.json(
        { message: 'fileKey inválido para este relatório/empresa.' },
        { status: 400 }
      );
    }

    const existing = await prisma.empresaRelatorio.findUnique({
      where: { id: reportId },
      select: {
        id: true,
        idEmpresa: true,
        versionSuffix: true,
      },
    });

    if (!existing || existing.idEmpresa !== companyId) {
      return NextResponse.json(
        { message: 'Relatório não encontrado para esta empresa.' },
        { status: 404 }
      );
    }

    const current = existing.versionSuffix ?? 0;
    let newVersion: number;

    if (typeof versionSuffix === 'number' && Number.isFinite(versionSuffix) && versionSuffix > current) {
      newVersion = versionSuffix;
    } else {
      newVersion = current > 0 ? current + 1 : 1;
    }

    const updated = await prisma.empresaRelatorio.update({
      where: { id: reportId },
      data: {
        fileKey,
        fileName,
        versionSuffix: newVersion,
        updated: new Date(),
        // updatedBy: <id admin> se tiver auth
      },
      select: {
        id: true,
        titulo: true,
        fileKey: true,
        fileName: true,
        versionSuffix: true,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        report: updated,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('[attach] erro:', err);
    return NextResponse.json(
      { message: 'Erro ao associar arquivo ao relatório.', details: err?.message },
      { status: 500 }
    );
  }
}
