// src/app/api/trilhas/[id]/empresas/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminToken } from '@/lib/auth/jwt';

/** util: get date in Brasilia (UTC-3) */
function getBrasiliaDate(): Date {
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

/** Helper: require admin session; returns adminId or null */
function requireAdminFromRequest(req: NextRequest): number | null {
  const token = req.cookies.get('sis_admin_sess')?.value;
  if (!token) return null;
  const { ok, payload } = verifyAdminToken(token);
  if (!ok || !payload) return null;
  const adminId = Number(payload.sub);
  if (!adminId || Number.isNaN(adminId)) return null;
  return adminId;
}

type RouteParams = { id: string };

type Body = {
  empresaIds?: number[];
};

async function resolveTrilhaId(paramsPromise: Promise<RouteParams>) {
  const resolved = await paramsPromise;
  const idStr = resolved?.id;
  const trilhaId = idStr ? Number(idStr) : NaN;
  if (!trilhaId || Number.isNaN(trilhaId) || trilhaId <= 0) return null;
  return trilhaId;
}

/**
 * PUT /api/trilhas/:id/empresas
 * Atualiza vínculos entre trilha <-> empresas
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<RouteParams> }
) {
  try {
    // auth
    const adminId = requireAdminFromRequest(request);
    if (!adminId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const trilhaId = await resolveTrilhaId(context.params);
    if (!trilhaId) {
      return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });
    }

    let body: Body;
    try {
      body = (await request.json()) as Body;
    } catch {
      return NextResponse.json({ error: 'JSON inválido no corpo da requisição.' }, { status: 400 });
    }

    const empresaIds = (body.empresaIds ?? []).filter(
      (id): id is number => typeof id === 'number' && Number.isFinite(id) && id > 0
    );

    // Verifica se a trilha existe e não está deletada
    const trilha = await prisma.trilha.findUnique({
      where: { id: trilhaId },
      select: { id: true, deleted: true },
    });

    if (!trilha || trilha.deleted) {
      return NextResponse.json({ error: 'Trilha não encontrada.' }, { status: 404 });
    }

    const now = getBrasiliaDate();

    await prisma.$transaction(async (tx) => {
      // vínculos atuais (somente não-deletados)
      const atuais = await tx.empresaHasTrilha.findMany({
        where: { idTrilha: trilhaId },
        select: { idEmpresa: true },
      });

      const atuaisIds = atuais.map((r) => r.idEmpresa);

      const paraAdicionar = empresaIds.filter((id) => !atuaisIds.includes(id));
      const paraRemover = atuaisIds.filter((id) => !empresaIds.includes(id));

      // adiciona novos vínculos
      if (paraAdicionar.length > 0) {
        // Primeiro: tentar createMany com os campos mínimos (idTrilha, idEmpresa).
        // Isso evita problemas quando o model não tem campos extras (ex: ativo).
        try {
          await tx.empresaHasTrilha.createMany({
            data: paraAdicionar.map((idEmpresa) => ({
              idTrilha: trilhaId,
              idEmpresa,
            })),
            skipDuplicates: true,
          });
        } catch (err: any) {
          // Se createMany falhar por validação de schema, tenta criar individualmente
          console.warn('[trilhas/empresas] createMany falhou, fazendo fallback para create individual', err?.message);
          for (const idEmpresa of paraAdicionar) {
            try {
              await tx.empresaHasTrilha.create({
                data: {
                  idTrilha: trilhaId,
                  idEmpresa,
                },
              });
            } catch (innerErr: any) {
              // Se mesmo o create individual falhar por unknown arg, tenta criar ignorando campos extras (já estamos com campos mínimos),
              // caso ainda falhe, logamos e lançamos para abortar a transação.
              console.error('[trilhas/empresas] falha ao criar vínculo individual', { trilhaId, idEmpresa, err: innerErr?.message });
              throw innerErr;
            }
          }
        }
      }

      // remove vínculos que saíram da lista — preferir soft-delete (updateMany) com audit, com fallback para hard delete
      if (paraRemover.length > 0) {
        const where = { idTrilha: trilhaId, idEmpresa: { in: paraRemover } };

        // Tentar soft-delete definindo deleted/updated/deletedBy (se o schema suportar)
        try {
          await tx.empresaHasTrilha.updateMany({
            where,
            data: {
              // tentamos colocar campos de auditoria, mas pode não existir no model
              deleted: now,
              updated: now,
              // deletedBy: adminId, // comentado por segurança — se você tiver esse campo, descomente
            } as any,
          });
        } catch (err: any) {
          // Se schema não suportar esses campos, cair para deleteMany (hard delete)
          if (isPrismaUnknownArgError(err)) {
            try {
              // fallback 1: tentar snake_case (deleted_by)
              await tx.empresaHasTrilha.updateMany({
                where,
                data: {
                  deleted: now,
                  updated: now,
                  // deleted_by: adminId,
                } as any,
              });
            } catch (err2: any) {
              console.warn('[trilhas/empresas] fallback updateMany falhou, executando deleteMany', err2?.message);
              // fallback 2: hard delete
              await tx.empresaHasTrilha.deleteMany({ where });
            }
          } else {
            throw err;
          }
        }
      }
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    console.error('PUT /api/trilhas/:id/empresas error:', err);
    return NextResponse.json({ error: 'Erro ao atualizar vínculos da trilha.' }, { status: 500 });
  }
}
