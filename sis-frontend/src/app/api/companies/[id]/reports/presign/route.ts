import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { makeFileKey, presignUploadUrl } from '@/lib/s3';

const DEFAULT_UPLOAD_EXPIRES = Number(process.env.S3_UPLOAD_EXPIRES ?? 900);

type RouteParams = {
  id: string;
};

export async function POST(req: Request, ctx: { params: Promise<RouteParams> }) {
  try {
    const params = await ctx.params;
    const companyId = Number(params.id);

    if (!Number.isFinite(companyId) || companyId <= 0) {
      return NextResponse.json({ message: 'Empresa inválida.' }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ message: 'Body inválido.' }, { status: 400 });
    }

    const { reportId, fileName, fileType, fileSize, versionSuffix } = body ?? {};

    if (!reportId || !fileName || !fileType || !fileSize) {
      return NextResponse.json(
        { message: 'Campos obrigatórios: reportId, fileName, fileType, fileSize.' },
        { status: 400 }
      );
    }

    if (fileType !== 'application/pdf') {
      return NextResponse.json(
        { message: 'Tipo de arquivo inválido. Apenas PDF é permitido.' },
        { status: 400 }
      );
    }

    const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES ?? 50 * 1024 * 1024);
    if (fileSize > MAX_UPLOAD_BYTES) {
      const mb = (MAX_UPLOAD_BYTES / (1024 * 1024)).toFixed(0);
      return NextResponse.json(
        { message: `Arquivo muito grande. Tamanho máximo permitido: ${mb} MB.` },
        { status: 400 }
      );
    }

    const report = await prisma.empresaRelatorio.findUnique({
      where: { id: Number(reportId) },
      select: {
        id: true,
        idEmpresa: true,
        versionSuffix: true,
      },
    });

    if (!report || report.idEmpresa !== companyId) {
      return NextResponse.json(
        { message: 'Relatório não encontrado para esta empresa.' },
        { status: 404 }
      );
    }

    const current = report.versionSuffix ?? 0;
    let newVersion: number;

    if (
      typeof versionSuffix === 'number' &&
      Number.isFinite(versionSuffix) &&
      versionSuffix > current
    ) {
      newVersion = versionSuffix;
    } else {
      newVersion = current > 0 ? current + 1 : 1;
    }

    const key = makeFileKey(companyId, report.id, newVersion, fileName);

    const EXPIRES_IN = DEFAULT_UPLOAD_EXPIRES;
    const uploadUrl = await presignUploadUrl(key, fileType, EXPIRES_IN);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + EXPIRES_IN * 1000);

    return NextResponse.json(
      {
        uploadUrl,
        fileKey: key,
        versionSuffix: newVersion,
        expiresIn: EXPIRES_IN,
        now: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('[presign] erro:', err);
    return NextResponse.json(
      { message: 'Erro ao gerar URL de upload.', details: err?.message },
      { status: 500 }
    );
  }
}
