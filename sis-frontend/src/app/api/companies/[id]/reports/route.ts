// src/app/api/companies/[id]/reports/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/** stub de autorização — substitua pela sua lógica real */
async function checkAdminForCompany(req: Request, companyId: number) {
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

/** Helper para suportar params named [companyId] ou [id]
 *  Agora recebe o params já *resolvido* (não Promise).
 */
function resolveCompanyIdFromResolvedParams(resolvedParams: { [key: string]: any } | null | undefined) {
  if (!resolvedParams) return NaN;
  const maybe = resolvedParams.companyId ?? resolvedParams.id ?? resolvedParams.company ?? null;
  const num = maybe != null ? Number(maybe) : NaN;
  return Number.isFinite(num) && num > 0 ? num : NaN;
}

/** POST — criar um novo relatório (sem arquivo) */
export async function POST(
  req: Request,
  context: { params: Promise<{ [key: string]: any }> | { [key: string]: any } }
) {
  try {
    // unwrap params (suporta Promise ou objeto já resolvido)
    const resolvedParams = await context.params;
    const companyId = resolveCompanyIdFromResolvedParams(resolvedParams);
    if (Number.isNaN(companyId)) {
      return NextResponse.json({ message: 'companyId inválido' }, { status: 400 });
    }

    const isAllowed = await checkAdminForCompany(req, companyId);
    if (!isAllowed) return NextResponse.json({ message: 'Não autorizado' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const tituloRaw = body?.titulo ?? '';
    const textoRaw = body?.texto ?? null;

    const titulo = typeof tituloRaw === 'string' ? tituloRaw.trim() : '';
    const texto = textoRaw == null ? null : (typeof textoRaw === 'string' ? textoRaw.trim() : String(textoRaw));

    if (!titulo) return NextResponse.json({ message: 'Título do relatório é obrigatório.' }, { status: 400 });
    if (titulo.length > 300) return NextResponse.json({ message: 'Título muito longo (máx 300 caracteres).' }, { status: 400 });
    if (texto && texto.length > 100000) return NextResponse.json({ message: 'Texto do relatório muito grande.' }, { status: 400 });

    const empresa = await prisma.empresa.findUnique({
      where: { id: companyId },
      select: { id: true, razaoSocial: true, ativo: true },
    });
    if (!empresa) return NextResponse.json({ message: 'Empresa não encontrada.' }, { status: 404 });
    if (empresa.ativo !== 1) return NextResponse.json({ message: 'Empresa inativa.' }, { status: 400 });

    const createdBy = undefined; // integrar com auth/session quando houver
    const now = new Date();

    const created = await prisma.empresaRelatorio.create({
      data: {
        titulo,
        texto,
        idEmpresa: companyId,
        ativo: 1,
        dataPublicacao: now,
        created: now,
        createdBy: createdBy ?? undefined,
      },
      select: {
        id: true,
        titulo: true,
        dataPublicacao: true,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    console.error('API POST /api/companies/[id]/reports error:', err);
    const msg = extractBodyText(err) ?? 'Erro interno ao criar relatório.';
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}

/** GET — listar relatórios da empresa */
export async function GET(
  req: Request,
  context: { params: Promise<{ [key: string]: any }> | { [key: string]: any } }
) {
  try {
    const resolvedParams = await context.params;
    const companyId = resolveCompanyIdFromResolvedParams(resolvedParams);
    if (Number.isNaN(companyId)) {
      return NextResponse.json({ message: 'companyId inválido' }, { status: 400 });
    }

    const rels = await prisma.empresaRelatorio.findMany({
      where: { idEmpresa: companyId, deleted: null },
      orderBy: { dataPublicacao: 'desc' },
      select: { id: true, titulo: true, dataPublicacao: true, ativo: true },
    });

    return NextResponse.json(rels);
  } catch (err) {
    console.error('API GET /api/companies/[id]/reports error:', err);
    return NextResponse.json({ message: 'Erro interno' }, { status: 500 });
  }
}
