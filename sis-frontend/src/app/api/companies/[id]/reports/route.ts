// src/app/api/companies/[id]/reports/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminToken } from '@/lib/auth/jwt';

/** stub de autorização — substitua pela sua lógica real quando integrar auth */
async function checkAdminForCompany(_req: NextRequest, _companyId: number) {
  // se quiser validação por company específica, substitua chamando DB/permissões aqui
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

function resolveCompanyIdFromResolvedParams(
  resolvedParams: { [key: string]: any } | null | undefined
) {
  if (!resolvedParams) return NaN;
  const maybe =
    resolvedParams.companyId ??
    resolvedParams.id ??
    resolvedParams.company ??
    null;
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

type RouteParams = { id: string };

/** POST — criar novo relatório (ou atualizar se for enviado reportId por engano) */
export async function POST(
  request: NextRequest,
  context: { params: Promise<RouteParams> }
) {
  try {
    const resolvedParams = await context.params;
    const companyId = resolveCompanyIdFromResolvedParams(resolvedParams);
    if (Number.isNaN(companyId)) {
      return NextResponse.json({ message: 'companyId inválido' }, { status: 400 });
    }

    // auth: require admin token (cookie)
    const token = request.cookies.get('sis_admin_sess')?.value;
    if (!token) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 });

    const { ok, payload } = verifyAdminToken(token);
    if (!ok || !payload) return NextResponse.json({ message: 'Token inválido ou expirado' }, { status: 401 });

    const adminId = Number(payload.sub);
    if (!adminId || Number.isNaN(adminId)) return NextResponse.json({ message: 'ID do administrador inválido' }, { status: 401 });

    // optional company-level permission check (keeps stub for now)
    const allowed = await checkAdminForCompany(request, companyId);
    if (!allowed) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const tituloRaw = (body?.titulo ?? '').toString().trim();
    const textoRaw = body?.texto ?? null;
    const maybeReportId = body?.reportId ?? null;

    if (!tituloRaw) {
      return NextResponse.json({ message: 'Título do relatório é obrigatório.' }, { status: 400 });
    }
    if (tituloRaw.length > 300) {
      return NextResponse.json({ message: 'Título muito longo (máx 300).' }, { status: 400 });
    }
    if (textoRaw && String(textoRaw).length > 100000) {
      return NextResponse.json({ message: 'Texto muito grande.' }, { status: 400 });
    }

    // Se veio um reportId (provavelmente por engano do front), tenta atualizar em vez de criar
    if (maybeReportId) {
      const rid = Number(maybeReportId);
      if (!Number.isFinite(rid) || rid <= 0) {
        return NextResponse.json({ message: 'reportId inválido' }, { status: 400 });
      }

      const existing = await prisma.empresaRelatorio.findUnique({
        where: { id: rid },
        select: { idEmpresa: true },
      });
      if (!existing || existing.idEmpresa !== companyId) {
        return NextResponse.json({ message: 'Relatório para atualizar não encontrado.' }, { status: 404 });
      }

      const now = getBrasiliaDate();

      // tentativa de update incluindo audit fields (camelCase → snake_case → sem audit)
      const updateWithCamel: any = {
        titulo: tituloRaw,
        texto: textoRaw == null ? null : String(textoRaw).trim(),
        updated: now,
        updatedBy: adminId,
      };
      const updateWithSnake: any = {
        titulo: tituloRaw,
        texto: textoRaw == null ? null : String(textoRaw).trim(),
        updated: now,
        updated_by: adminId,
      };

      let updated: any;
      try {
        updated = await prisma.empresaRelatorio.update({
          where: { id: rid },
          data: updateWithCamel,
          select: { id: true, titulo: true, texto: true, dataPublicacao: true, ativo: true },
        });
      } catch (err: any) {
        if (isPrismaUnknownArgError(err)) {
          try {
            updated = await prisma.empresaRelatorio.update({
              where: { id: rid },
              data: updateWithSnake,
              select: { id: true, titulo: true, texto: true, dataPublicacao: true, ativo: true },
            });
          } catch (err2: any) {
            if (isPrismaUnknownArgError(err2)) {
              updated = await prisma.empresaRelatorio.update({
                where: { id: rid },
                data: {
                  titulo: tituloRaw,
                  texto: textoRaw == null ? null : String(textoRaw).trim(),
                },
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

      return NextResponse.json(updated, { status: 200 });
    }

    // fluxo normal de criação
    const empresa = await prisma.empresa.findUnique({
      where: { id: companyId },
      select: { id: true, ativo: true },
    });
    if (!empresa) {
      return NextResponse.json({ message: 'Empresa não encontrada.' }, { status: 404 });
    }
    if (empresa.ativo !== 1) {
      return NextResponse.json({ message: 'Empresa inativa.' }, { status: 400 });
    }

    const now = getBrasiliaDate();

    // criar relatório tentando adicionar audit fields; se modelo não aceitar, faz fallback
    const baseData: any = {
      titulo: tituloRaw,
      texto: textoRaw == null ? null : String(textoRaw).trim(),
      idEmpresa: companyId,
      ativo: 1,
      dataPublicacao: now,
    };

    const withAuditCamel = { ...baseData, created: now, createdBy: adminId, updated: now, updatedBy: adminId };
    const withAuditSnake = { ...baseData, created: now, created_by: adminId, updated: now, updated_by: adminId };

    let created: any;
    try {
      created = await prisma.empresaRelatorio.create({
        data: withAuditCamel,
        select: { id: true, titulo: true, dataPublicacao: true, ativo: true },
      });
    } catch (err: any) {
      if (isPrismaUnknownArgError(err)) {
        try {
          created = await prisma.empresaRelatorio.create({
            data: withAuditSnake,
            select: { id: true, titulo: true, dataPublicacao: true, ativo: true },
          });
        } catch (err2: any) {
          if (isPrismaUnknownArgError(err2)) {
            created = await prisma.empresaRelatorio.create({
              data: baseData,
              select: { id: true, titulo: true, dataPublicacao: true, ativo: true },
            });
          } else {
            throw err2;
          }
        }
      } else {
        throw err;
      }
    }

    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    console.error('API POST /reports error:', err);
    const msg = extractBodyText(err) ?? 'Erro interno ao criar/atualizar relatório.';
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}

/** GET — listar relatórios da empresa (apenas ativos e não-deletados) */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<RouteParams> }
) {
  try {
    const resolvedParams = await context.params;
    const companyId = resolveCompanyIdFromResolvedParams(resolvedParams);
    if (Number.isNaN(companyId)) {
      return NextResponse.json({ message: 'companyId inválido' }, { status: 400 });
    }

    // auth for read - keep permission stub but also check token
    const token = _request.cookies.get('sis_admin_sess')?.value;
    if (!token) return NextResponse.json({ message: 'Não autenticado' }, { status: 401 });
    const { ok, payload } = verifyAdminToken(token);
    if (!ok || !payload) return NextResponse.json({ message: 'Token inválido ou expirado' }, { status: 401 });

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
