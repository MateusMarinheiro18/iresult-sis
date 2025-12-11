// src/app/api/companies/[id]/reports/presign/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { makeFileKey, presignUploadUrl } from '@/lib/s3';
import { verifyAdminToken } from '@/lib/auth/jwt';

const DEFAULT_UPLOAD_EXPIRES = Number(process.env.S3_UPLOAD_EXPIRES ?? 900);

type RouteParams = {
  id: string;
};

/** get date in Brasilia (UTC-3) */
function getBrasiliaDate() {
  const now = new Date();
  const utcMs = now.getTime();
  const brasiliaOffsetInMs = -3 * 3600000;
  return new Date(utcMs + brasiliaOffsetInMs);
}

/** simple company-level permission stub (keeps for future improvement) */
async function checkAdminForCompany(_adminId: number, _companyId: number) {
  // implement real permission check if necessary
  return true;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<RouteParams> }
) {
  try {
    // params
    const params = await context.params;
    const companyId = Number(params.id);
    if (!Number.isFinite(companyId) || companyId <= 0) {
      return NextResponse.json({ message: 'Empresa inválida.' }, { status: 400 });
    }

    // auth: require admin token (cookie)
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

    // optional company-level check (stub)
    const allowed = await checkAdminForCompany(adminId, companyId);
    if (!allowed) {
      return NextResponse.json({ message: 'Não autorizado para esta empresa.' }, { status: 403 });
    }

    // body
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ message: 'Body inválido.' }, { status: 400 });
    }

    const { reportId, fileName, fileType, fileSize, versionSuffix } = body ?? {};

    if (!reportId || !fileName || !fileType || fileSize === undefined || fileSize === null) {
      return NextResponse.json(
        { message: 'Campos obrigatórios: reportId, fileName, fileType, fileSize.' },
        { status: 400 }
      );
    }

    const reportIdNum = Number(reportId);
    if (!Number.isFinite(reportIdNum) || reportIdNum <= 0) {
      return NextResponse.json({ message: 'reportId inválido.' }, { status: 400 });
    }

    const fileSizeNum = Number(fileSize);
    if (!Number.isFinite(fileSizeNum) || fileSizeNum < 0) {
      return NextResponse.json({ message: 'fileSize inválido.' }, { status: 400 });
    }

    // only allow PDFs
    if (fileType !== 'application/pdf') {
      return NextResponse.json(
        { message: 'Tipo de arquivo inválido. Apenas PDF é permitido.' },
        { status: 400 }
      );
    }

    // max size
    const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES ?? 50 * 1024 * 1024);
    if (fileSizeNum > MAX_UPLOAD_BYTES) {
      const mb = (MAX_UPLOAD_BYTES / (1024 * 1024)).toFixed(0);
      return NextResponse.json(
        { message: `Arquivo muito grande. Tamanho máximo permitido: ${mb} MB.` },
        { status: 400 }
      );
    }

    // ensure report exists and belongs to company
    const report = await prisma.empresaRelatorio.findUnique({
      where: { id: reportIdNum },
      select: { id: true, idEmpresa: true, versionSuffix: true, ativo: true, deleted: true },
    });

    if (!report || report.idEmpresa !== companyId) {
      return NextResponse.json(
        { message: 'Relatório não encontrado para esta empresa.' },
        { status: 404 }
      );
    }

    if (report.deleted !== null) {
      return NextResponse.json({ message: 'Relatório está deletado.' }, { status: 400 });
    }
    if (report.ativo !== 1) {
      return NextResponse.json({ message: 'Relatório inativo.' }, { status: 400 });
    }

    // resolve versionSuffix (allow numeric string)
    const current = Number(report.versionSuffix ?? 0);
    let newVersion: number;

    const vsNum = typeof versionSuffix === 'number' ? versionSuffix : Number(versionSuffix);
    if (Number.isFinite(vsNum) && vsNum > current) {
      newVersion = vsNum;
    } else {
      newVersion = current > 0 ? current + 1 : 1;
    }

    // build key and presign
    const key = makeFileKey(companyId, report.id, newVersion, String(fileName));
    const EXPIRES_IN = Number(DEFAULT_UPLOAD_EXPIRES);
    const uploadUrl = await presignUploadUrl(key, String(fileType), EXPIRES_IN);

    const now = getBrasiliaDate();
    const expiresAt = new Date(now.getTime() + EXPIRES_IN * 1000);

    // Note: this endpoint only returns the presigned URL and metadata.
    // If you want to persist the newVersion/versionSuffix to DB after successful upload,
    // implement a separate webhook/callback that verifies the uploaded object and then updates the report.
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
      { message: 'Erro ao gerar URL de upload.', details: err?.message ?? null },
      { status: 500 }
    );
  }
}
