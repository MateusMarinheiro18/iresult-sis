// src/app/api/companies/[id]/reports/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/** stub de autorização — substitua pela sua lógica real quando integrar auth */
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

/** POST — criar novo relatório (ou atualizar se for enviado reportId por engano) */
export async function POST(
  req: Request,
  context: { params: Promise<{ [key: string]: any }> | { [key: string]: any } }
) {
  try {
    const resolvedParams = await context.params;
    const companyId = resolveCompanyIdFromResolvedParams(resolvedParams);
    if (Number.isNaN(companyId)) {
      return NextResponse.json({ message: 'companyId inválido' }, { status: 400 });
    }

    // autorização (stub)
    const allowed = await checkAdminForCompany(req, companyId);
    if (!allowed) return NextResponse.json({ message: 'Não autorizado' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const tituloRaw = (body?.titulo ?? '').trim();
    const textoRaw = body?.texto ?? null;
    const maybeReportId = body?.reportId ?? null;

    if (!tituloRaw) return NextResponse.json({ message: 'Título do relatório é obrigatório.' }, { status: 400 });
    if (tituloRaw.length > 300) return NextResponse.json({ message: 'Título muito longo (máx 300).' }, { status: 400 });
    if (textoRaw && String(textoRaw).length > 100000) return NextResponse.json({ message: 'Texto muito grande.' }, { status: 400 });

    // Se veio um reportId (provavelmente por engano do front), tenta atualizar em vez de criar
    if (maybeReportId) {
      const rid = Number(maybeReportId);
      if (!Number.isFinite(rid) || rid <= 0) {
        return NextResponse.json({ message: 'reportId inválido' }, { status: 400 });
      }

      const existing = await prisma.empresaRelatorio.findUnique({ where: { id: rid }, select: { idEmpresa: true } });
      if (!existing || existing.idEmpresa !== companyId) {
        return NextResponse.json({ message: 'Relatório para atualizar não encontrado.' }, { status: 404 });
      }

      const now = new Date();
      const updated = await prisma.empresaRelatorio.update({
        where: { id: rid },
        data: {
          titulo: tituloRaw,
          texto: textoRaw == null ? null : String(textoRaw).trim(),
          updated: now,
        },
        select: { id: true, titulo: true, texto: true, dataPublicacao: true, ativo: true },
      });

      return NextResponse.json(updated, { status: 200 });
    }

    // fluxo normal de criação
    const empresa = await prisma.empresa.findUnique({ where: { id: companyId }, select: { id: true, ativo: true } });
    if (!empresa) return NextResponse.json({ message: 'Empresa não encontrada.' }, { status: 404 });
    if (empresa.ativo !== 1) return NextResponse.json({ message: 'Empresa inativa.' }, { status: 400 });

    const now = new Date();
    const created = await prisma.empresaRelatorio.create({
      data: {
        titulo: tituloRaw,
        texto: textoRaw == null ? null : String(textoRaw).trim(),
        idEmpresa: companyId,
        ativo: 1,
        dataPublicacao: now,
        created: now,
      },
      select: { id: true, titulo: true, dataPublicacao: true, ativo: true },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    console.error('API POST /reports error:', err);
    const msg = extractBodyText(err) ?? 'Erro interno ao criar/atualizar relatório.';
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}

/** GET — listar relatórios da empresa (apenas ativos e não-deletados) */
export async function GET(
  _req: Request,
  context: { params: Promise<{ [key: string]: any }> | { [key: string]: any } }
) {
  try {
    const resolvedParams = await context.params;
    const companyId = resolveCompanyIdFromResolvedParams(resolvedParams);
    if (Number.isNaN(companyId)) {
      return NextResponse.json({ message: 'companyId inválido' }, { status: 400 });
    }

    const rels = await prisma.empresaRelatorio.findMany({
      where: { idEmpresa: companyId, deleted: null, ativo: 1 },
      orderBy: { dataPublicacao: 'desc' },
      select: { id: true, titulo: true, dataPublicacao: true, ativo: true },
    });

    return NextResponse.json(rels);
  } catch (err: any) {
    console.error('API GET /reports error:', err);
    return NextResponse.json({ message: 'Erro interno ao listar relatórios.' }, { status: 500 });
  }
}
