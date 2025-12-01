import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { presignGetUrl } from '@/lib/s3';

type RouteParams = {
  id: string;
  reportId: string;
};

export async function GET(
  _request: NextRequest,
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

    const report = await prisma.empresaRelatorio.findUnique({
      where: { id: reportId },
      select: {
        id: true,
        idEmpresa: true,
        titulo: true,
        fileKey: true,
      },
    });

    if (!report || report.idEmpresa !== companyId) {
      return NextResponse.json(
        { message: 'Relatório não encontrado para esta empresa.' },
        { status: 404 }
      );
    }

    if (!report.fileKey) {
      return NextResponse.json(
        { message: 'Este relatório não possui arquivo anexado.' },
        { status: 404 }
      );
    }

    const url = await presignGetUrl(report.fileKey, 60);

    return NextResponse.json(
      {
        url,
        expiresIn: 60,
        title: report.titulo,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('[file] erro:', err);
    return NextResponse.json(
      { message: 'Erro ao gerar URL do arquivo.', details: err?.message },
      { status: 500 }
    );
  }
}
