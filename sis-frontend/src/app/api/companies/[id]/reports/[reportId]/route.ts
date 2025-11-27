// src/app/api/companies/[id]/reports/[reportId]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/** stub de autorização */
async function checkAdminForCompany(_req: Request, _companyId: number) {
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

/** GET — retorna o relatório */
export async function GET(
  _req: Request,
  context: { params: Promise<{ [key: string]: any }> | { [key: string]: any } }
) {
  try {
    const resolved = await context.params;
    const companyId = resolveCompanyIdFromResolvedParams(resolved);
    const reportId = resolveReportIdFromResolvedParams(resolved);
    if (Number.isNaN(companyId) || Number.isNaN(reportId)) {
      return NextResponse.json({ message: 'companyId ou reportId inválido' }, { status: 400 });
    }

    const rel = await prisma.empresaRelatorio.findFirst({
      where: { id: reportId, idEmpresa: companyId, deleted: null },
      select: { id: true, titulo: true, texto: true, dataPublicacao: true, ativo: true, created: true, updated: true },
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
  req: Request,
  context: { params: Promise<{ [key: string]: any }> | { [key: string]: any } }
) {
  try {
    const resolved = await context.params;
    const companyId = resolveCompanyIdFromResolvedParams(resolved);
    const reportId = resolveReportIdFromResolvedParams(resolved);
    if (Number.isNaN(companyId) || Number.isNaN(reportId)) {
      return NextResponse.json({ message: 'companyId ou reportId inválido' }, { status: 400 });
    }

    const allowed = await checkAdminForCompany(req, companyId);
    if (!allowed) return NextResponse.json({ message: 'Não autorizado' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const tituloRaw = body?.titulo;
    const textoRaw = body?.texto;

    // verifica existência e vínculo
    const existing = await prisma.empresaRelatorio.findUnique({ where: { id: reportId }, select: { idEmpresa: true } });
    if (!existing || existing.idEmpresa !== companyId) {
      return NextResponse.json({ message: 'Relatório não encontrado para essa empresa.' }, { status: 404 });
    }

    // validações
    if (tituloRaw != null) {
      if (typeof tituloRaw !== 'string' || !tituloRaw.trim()) return NextResponse.json({ message: 'Título inválido.' }, { status: 400 });
      if (tituloRaw.trim().length > 300) return NextResponse.json({ message: 'Título muito longo.' }, { status: 400 });
    }
    if (textoRaw != null) {
      if (typeof textoRaw !== 'string') return NextResponse.json({ message: 'Texto inválido.' }, { status: 400 });
      if (textoRaw.length > 100000) return NextResponse.json({ message: 'Texto muito grande.' }, { status: 400 });
    }

    const now = new Date();
    const updateData: any = { updated: now };
    if (tituloRaw != null) updateData.titulo = String(tituloRaw).trim();
    if (textoRaw != null) updateData.texto = String(textoRaw);

    const updated = await prisma.empresaRelatorio.update({
      where: { id: reportId },
      data: updateData,
      select: { id: true, titulo: true, texto: true, dataPublicacao: true, ativo: true },
    });

    const safe = { ...updated, dataPublicacao: updated.dataPublicacao ? updated.dataPublicacao.toISOString() : null };
    return NextResponse.json(safe);
  } catch (err: any) {
    console.error('API PATCH report error:', err);
    return NextResponse.json({ message: 'Erro interno ao atualizar relatório.' }, { status: 500 });
  }
}

/** DELETE — soft delete (marca deleted e inativa) */
export async function DELETE(
  _req: Request,
  context: { params: Promise<{ [key: string]: any }> | { [key: string]: any } }
) {
  try {
    const resolved = await context.params;
    const companyId = resolveCompanyIdFromResolvedParams(resolved);
    const reportId = resolveReportIdFromResolvedParams(resolved);

    if (Number.isNaN(companyId) || Number.isNaN(reportId)) {
      return NextResponse.json({ message: 'companyId ou reportId inválido' }, { status: 400 });
    }

    const existing = await prisma.empresaRelatorio.findUnique({ where: { id: reportId }, select: { idEmpresa: true } });
    if (!existing || existing.idEmpresa !== companyId) {
      return NextResponse.json({ message: 'Relatório não encontrado.' }, { status: 404 });
    }

    const now = new Date();
    await prisma.empresaRelatorio.update({
      where: { id: reportId },
      data: { deleted: now, deletedBy: undefined, ativo: 0 },
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    console.error('API DELETE report error:', err);
    return NextResponse.json({ message: 'Erro interno ao deletar relatório.' }, { status: 500 });
  }
}
