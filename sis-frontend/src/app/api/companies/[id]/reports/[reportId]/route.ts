// src/app/api/companies/[id]/reports/[reportId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminToken } from '@/lib/auth/jwt';

/** stub de autorização */
async function checkAdminForCompany(_req: NextRequest, _companyId: number) {
  // substitua por verificação real se precisar restringir por empresa
  return true;
}

function extractBodyText(body: any) {
  if (!body && body !== 0) return null;
  if (typeof body === 'string' && body.trim()) return body.trim();
  if (typeof body === 'object') {
    if (typeof body.message === 'string' && body.message.trim()) return body.message.trim();
    if (typeof body.msg === 'string' && body.msg.trim()) return body.msg.trim();
  }
  return null;
}

function resolveCompanyIdFromResolvedParams(resolvedParams: { [key: string]: any } | null | undefined) {
  if (!resolvedParams) return NaN;
  const maybe = resolvedParams.companyId ?? resolvedParams.id ?? resolvedParams.company ?? null;
  const num = maybe != null ? Number(maybe) : NaN;
  return Number.isFinite(num) && num > 0 ? num : NaN;
}

function resolveReportIdFromResolvedParams(resolvedParams: { [key: string]: any } | null | undefined) {
  if (!resolvedParams) return NaN;
  const maybe = resolvedParams.reportId ?? resolvedParams.id ?? null;
  const num = maybe != null ? Number(maybe) : NaN;
  return Number.isFinite(num) && num > 0 ? num : NaN;
}

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

type RouteParams = { id: string; reportId: string };

/** GET — retorna o relatório */
export async function GET(
  request: NextRequest,
  context: { params: Promise<RouteParams> }
) {
  try {
    const resolved = await context.params;
    const companyId = resolveCompanyIdFromResolvedParams(resolved);
    const reportId = resolveReportIdFromResolvedParams(resolved);
    if (Number.isNaN(companyId) || Number.isNaN(reportId)) {
      return NextResponse.json({ message: 'companyId ou reportId inválido' }, { status: 400 });
    }

    // auth: require admin token (cookie)
    const token = request.cookies.get('sis_admin_sess')?.value;
    if (!token) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 });
    const { ok, payload } = verifyAdminToken(token);
    if (!ok || !payload) return NextResponse.json({ message: 'Token inválido ou expirado' }, { status: 401 });

    // optional company-level permission check (keeps stub)
    const allowed = await checkAdminForCompany(request, companyId);
    if (!allowed) return NextResponse.json({ message: 'Não autorizado' }, { status: 403 });

    const rel = await prisma.empresaRelatorio.findFirst({
      where: { id: reportId, idEmpresa: companyId, deleted: null },
      select: {
        id: true,
        titulo: true,
        texto: true,
        dataPublicacao: true,
        ativo: true,
        created: true,
        updated: true,
      },
    });

    if (!rel) return NextResponse.json({ message: 'Relatório não encontrado.' }, { status: 404 });

    const safe = {
      ...rel,
      dataPublicacao: rel.dataPublicacao ? rel.dataPublicacao.toISOString() : null,
      created: rel.created ? rel.created.toISOString() : null,
      updated: rel.updated ? rel.updated.toISOString() : null,
    };

    return NextResponse.json(safe);
  } catch (err: any) {
    console.error('API GET report error:', err);
    return NextResponse.json({ message: 'Erro interno ao buscar relatório.' }, { status: 500 });
  }
}

/** PATCH — atualiza título/texto */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<RouteParams> }
) {
  try {
    const resolved = await context.params;
    const companyId = resolveCompanyIdFromResolvedParams(resolved);
    const reportId = resolveReportIdFromResolvedParams(resolved);
    if (Number.isNaN(companyId) || Number.isNaN(reportId)) {
      return NextResponse.json({ message: 'companyId ou reportId inválido' }, { status: 400 });
    }

    // auth: require admin token (cookie)
    const token = request.cookies.get('sis_admin_sess')?.value;
    if (!token) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 });
    const { ok, payload } = verifyAdminToken(token);
    if (!ok || !payload) return NextResponse.json({ message: 'Token inválido ou expirado' }, { status: 401 });
    const adminId = Number(payload.sub);
    if (!adminId || Number.isNaN(adminId)) return NextResponse.json({ message: 'ID do administrador inválido' }, { status: 401 });

    // company-level check (stub)
    const allowed = await checkAdminForCompany(request, companyId);
    if (!allowed) return NextResponse.json({ message: 'Não autorizado' }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const tituloRaw = body?.titulo;
    const textoRaw = body?.texto;

    // verifica existência e vínculo
    const existing = await prisma.empresaRelatorio.findUnique({
      where: { id: reportId },
      select: { idEmpresa: true },
    });
    if (!existing || existing.idEmpresa !== companyId) {
      return NextResponse.json(
        { message: 'Relatório não encontrado para essa empresa.' },
        { status: 404 }
      );
    }

    // validações
    if (tituloRaw != null) {
      if (typeof tituloRaw !== 'string' || !tituloRaw.trim()) {
        return NextResponse.json({ message: 'Título inválido.' }, { status: 400 });
      }
      if (tituloRaw.trim().length > 300) {
        return NextResponse.json({ message: 'Título muito longo.' }, { status: 400 });
      }
    }
    if (textoRaw != null) {
      if (typeof textoRaw !== 'string') {
        return NextResponse.json({ message: 'Texto inválido.' }, { status: 400 });
      }
      if (textoRaw.length > 100000) {
        return NextResponse.json({ message: 'Texto muito grande.' }, { status: 400 });
      }
    }

    const now = getBrasiliaDate();

    // prepare update payloads with audit; try camelCase -> snake_case -> no audit
    const updateBase: any = {};
    if (tituloRaw != null) updateBase.titulo = String(tituloRaw).trim();
    if (textoRaw != null) updateBase.texto = String(textoRaw);

    const updateWithCamel = { ...updateBase, updated: now, updatedBy: adminId };
    const updateWithSnake = { ...updateBase, updated: now, updated_by: adminId };

    let updated: any;
    try {
      updated = await prisma.empresaRelatorio.update({
        where: { id: reportId },
        data: updateWithCamel,
        select: { id: true, titulo: true, texto: true, dataPublicacao: true, ativo: true },
      });
    } catch (err: any) {
      if (isPrismaUnknownArgError(err)) {
        try {
          updated = await prisma.empresaRelatorio.update({
            where: { id: reportId },
            data: updateWithSnake,
            select: { id: true, titulo: true, texto: true, dataPublicacao: true, ativo: true },
          });
        } catch (err2: any) {
          if (isPrismaUnknownArgError(err2)) {
            updated = await prisma.empresaRelatorio.update({
              where: { id: reportId },
              data: updateBase,
              select: { id: true, titulo: true, texto: true, dataPublicacao: true, ativo: true },
            });
          } else {
            throw err2;
          }
        }
      } else {
        throw err;
      }
    }

    const safe = {
      ...updated,
      dataPublicacao: updated.dataPublicacao ? updated.dataPublicacao.toISOString() : null,
    };

    return NextResponse.json(safe);
  } catch (err: any) {
    console.error('API PATCH report error:', err);
    const msg = extractBodyText(err) ?? 'Erro interno ao atualizar relatório.';
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}

/** DELETE — soft delete (marca deleted e inativa, com audit e fallback) */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<RouteParams> }
) {
  try {
    const resolved = await context.params;
    const companyId = resolveCompanyIdFromResolvedParams(resolved);
    const reportId = resolveReportIdFromResolvedParams(resolved);
    if (Number.isNaN(companyId) || Number.isNaN(reportId)) {
      return NextResponse.json({ message: 'companyId ou reportId inválido' }, { status: 400 });
    }

    // auth
    const token = request.cookies.get('sis_admin_sess')?.value;
    if (!token) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 });
    const { ok, payload } = verifyAdminToken(token);
    if (!ok || !payload) return NextResponse.json({ message: 'Token inválido ou expirado' }, { status: 401 });
    const adminId = Number(payload.sub);
    if (!adminId || Number.isNaN(adminId)) return NextResponse.json({ message: 'ID do administrador inválido' }, { status: 401 });

    // company-level check (stub)
    const allowed = await checkAdminForCompany(request, companyId);
    if (!allowed) return NextResponse.json({ message: 'Não autorizado' }, { status: 403 });

    const existing = await prisma.empresaRelatorio.findUnique({
      where: { id: reportId },
      select: { idEmpresa: true },
    });
    if (!existing || existing.idEmpresa !== companyId) {
      return NextResponse.json({ message: 'Relatório não encontrado.' }, { status: 404 });
    }

    const now = getBrasiliaDate();

    // try camelCase audit
    try {
      await prisma.empresaRelatorio.update({
        where: { id: reportId },
        data: {
          deleted: now,
          deletedBy: adminId,
          updated: now,
          updatedBy: adminId,
          ativo: 0,
        },
      });
      return NextResponse.json({ ok: true }, { status: 200 });
    } catch (err: any) {
      if (isPrismaUnknownArgError(err)) {
        // try snake_case
        try {
          await prisma.empresaRelatorio.update({
            where: { id: reportId },
            data: {
              deleted: now,
              deleted_by: adminId,
              updated: now,
              updated_by: adminId,
              ativo: 0,
            } as any,
          });
          return NextResponse.json({ ok: true }, { status: 200 });
        } catch (err2: any) {
          if (isPrismaUnknownArgError(err2)) {
            // last resort: minimal update
            await prisma.empresaRelatorio.update({
              where: { id: reportId },
              data: { deleted: now, ativo: 0 },
            });
            return NextResponse.json({ ok: true }, { status: 200 });
          }
          throw err2;
        }
      }
      throw err;
    }
  } catch (err: any) {
    console.error('API DELETE report error:', err);
    const msg = extractBodyText(err) ?? 'Erro interno ao deletar relatório.';
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}
