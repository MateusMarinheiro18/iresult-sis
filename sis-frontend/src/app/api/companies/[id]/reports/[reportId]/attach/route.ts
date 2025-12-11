// src/app/api/companies/[id]/reports/[reportId]/attach/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminToken } from '@/lib/auth/jwt';

type RouteParams = {
  id: string; // companyId
  reportId: string;
};

/** util: get date in Brasilia (UTC-3) */
function getBrasiliaDate() {
  const now = new Date();
  const utcMs = now.getTime();
  const brasiliaOffsetInMs = -3 * 3600000;
  return new Date(utcMs + brasiliaOffsetInMs);
}

/** Detecta erro do Prisma tipo "Unknown argument" (campo inexistente no model) */
function isPrismaUnknownArgError(err: any) {
  const m = String(err?.message ?? '').toLowerCase();
  return /unknown argument|unknown field|field does not exist/i.test(m);
}

/** stub de permissão por empresa — substitua quando integrar regras reais */
async function checkAdminForCompany(_adminId: number, _companyId: number) {
  return true;
}

export async function POST(
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
    if (!token) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 });

    const { ok, payload } = verifyAdminToken(token);
    if (!ok || !payload) return NextResponse.json({ message: 'Token inválido ou expirado' }, { status: 401 });

    const adminId = Number(payload.sub);
    if (!adminId || Number.isNaN(adminId)) return NextResponse.json({ message: 'ID do administrador inválido' }, { status: 401 });

    // optional company-level permission check (stub)
    const allowed = await checkAdminForCompany(adminId, companyId);
    if (!allowed) return NextResponse.json({ message: 'Não autorizado para esta empresa.' }, { status: 403 });

    const body = await request.json().catch(() => null);
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

    // valida prefix da key: reports/{companyId}/{reportId}-
    const expectedPrefix = `reports/${companyId}/${reportId}-`;
    if (!String(fileKey).startsWith(expectedPrefix)) {
      return NextResponse.json(
        { message: 'fileKey inválido para este relatório/empresa.' },
        { status: 400 }
      );
    }

    // verificar existência do relatório e vínculo com a empresa
    const existing = await prisma.empresaRelatorio.findUnique({
      where: { id: reportId },
      select: {
        id: true,
        idEmpresa: true,
        versionSuffix: true,
        ativo: true,
        deleted: true,
      },
    });

    if (!existing || existing.idEmpresa !== companyId) {
      return NextResponse.json(
        { message: 'Relatório não encontrado para esta empresa.' },
        { status: 404 }
      );
    }

    if (existing.deleted !== null) {
      return NextResponse.json({ message: 'Relatório está deletado.' }, { status: 400 });
    }
    if (existing.ativo !== 1) {
      return NextResponse.json({ message: 'Relatório inativo.' }, { status: 400 });
    }

    const current = Number(existing.versionSuffix ?? 0);
    let newVersion: number;

    const vsNum = typeof versionSuffix === 'number' ? versionSuffix : Number(versionSuffix);
    if (Number.isFinite(vsNum) && vsNum > current) {
      newVersion = vsNum;
    } else {
      newVersion = current > 0 ? current + 1 : 1;
    }

    const now = getBrasiliaDate();

    // tentativa 1: update com audit camelCase
    const updateWithCamel: any = {
      fileKey: String(fileKey),
      fileName: String(fileName),
      versionSuffix: newVersion,
      updated: now,
      updatedBy: adminId,
    };

    // tentativa 2: audit snake_case
    const updateWithSnake: any = {
      fileKey: String(fileKey),
      fileName: String(fileName),
      versionSuffix: newVersion,
      updated: now,
      updated_by: adminId,
    };

    let updated: any;
    try {
      updated = await prisma.empresaRelatorio.update({
        where: { id: reportId },
        data: updateWithCamel,
        select: {
          id: true,
          titulo: true,
          fileKey: true,
          fileName: true,
          versionSuffix: true,
        },
      });
    } catch (err: any) {
      if (isPrismaUnknownArgError(err)) {
        try {
          updated = await prisma.empresaRelatorio.update({
            where: { id: reportId },
            data: updateWithSnake,
            select: {
              id: true,
              titulo: true,
              fileKey: true,
              fileName: true,
              versionSuffix: true,
            },
          });
        } catch (err2: any) {
          if (isPrismaUnknownArgError(err2)) {
            // fallback sem audit fields
            updated = await prisma.empresaRelatorio.update({
              where: { id: reportId },
              data: {
                fileKey: String(fileKey),
                fileName: String(fileName),
                versionSuffix: newVersion,
              },
              select: {
                id: true,
                titulo: true,
                fileKey: true,
                fileName: true,
                versionSuffix: true,
              },
            });
          } else {
            throw err2;
          }
        }
      } else {
        throw err;
      }
    }

    return NextResponse.json({ ok: true, report: updated }, { status: 200 });
  } catch (err: any) {
    console.error('[attach] erro:', err);
    return NextResponse.json(
      {
        message: 'Erro ao associar arquivo ao relatório.',
        details: err?.message ?? null,
      },
      { status: 500 }
    );
  }
}
