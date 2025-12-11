// src/app/api/trilhas/[id]/route.ts
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

/** Attempt create with camelCase -> snake_case -> plain */
async function attemptCreate(delegate: any, dataCamel: any, dataSnake: any, dataPlain: any, select?: any) {
  try {
    return await delegate.create({ data: dataCamel, ...(select ? { select } : {}) });
  } catch (err: any) {
    if (isPrismaUnknownArgError(err)) {
      try {
        return await delegate.create({ data: dataSnake, ...(select ? { select } : {}) });
      } catch (err2: any) {
        if (isPrismaUnknownArgError(err2)) {
          return await delegate.create({ data: dataPlain, ...(select ? { select } : {}) });
        }
        throw err2;
      }
    }
    throw err;
  }
}

/** Attempt update with camelCase -> snake_case -> plain */
async function attemptUpdate(delegate: any, where: any, dataCamel: any, dataSnake: any, dataPlain: any) {
  try {
    return await delegate.update({ where, data: dataCamel });
  } catch (err: any) {
    if (isPrismaUnknownArgError(err)) {
      try {
        return await delegate.update({ where, data: dataSnake });
      } catch (err2: any) {
        if (isPrismaUnknownArgError(err2)) {
          return await delegate.update({ where, data: dataPlain });
        }
        throw err2;
      }
    }
    throw err;
  }
}

type ItemPayload = {
  id?: number;
  nome: string;
  tipo?: string | null;
  data?: string | null; // yyyy-mm-dd or ISO
  detalhes?: string | null;
};

type TrilhaPayload = {
  nome: string;
  ativo?: number;
  itens?: ItemPayload[];
};

type RouteParams = { id: string };

async function resolveTrilhaId(paramsPromise: Promise<RouteParams>) {
  const resolved = await paramsPromise;
  const idStr = resolved?.id;
  const trilhaId = idStr ? Number(idStr) : NaN;
  if (!trilhaId || Number.isNaN(trilhaId) || trilhaId <= 0) return null;
  return trilhaId;
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

/* ---------------- GET /api/trilhas/:id ---------------- */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<RouteParams> }
) {
  try {
    const trilhaId = await resolveTrilhaId(context.params);
    if (!trilhaId) {
      return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });
    }

    const trilha = await prisma.trilha.findUnique({
      where: { id: trilhaId },
      include: {
        itens: true,
        empresas: {
          include: {
            empresa: true,
          },
        },
        // traz metadados de auditoria se existirem
      },
    });

    if (!trilha || trilha.deleted) {
      return NextResponse.json({ error: 'Trilha não encontrada.' }, { status: 404 });
    }

    // normaliza datas para ISO e evita Date objects no JSON
    const safe = {
      ...trilha,
      dataCriacao: trilha.dataCriacao ? trilha.dataCriacao.toISOString() : null,
      created: trilha.created ? trilha.created.toISOString() : null,
      updated: trilha.updated ? trilha.updated.toISOString() : null,
      itens: (trilha.itens ?? []).map((it: any) => ({
        ...it,
        data: it.data ? (it.data instanceof Date ? it.data.toISOString() : new Date(it.data).toISOString()) : null,
        created: it.created ? it.created.toISOString() : null,
        updated: it.updated ? it.updated.toISOString() : null,
      })),
      empresas: (trilha.empresas ?? []).map((e: any) => ({
        ...e,
        empresa: e.empresa
          ? {
              id: e.empresa.id,
              razaoSocial: e.empresa.razaoSocial,
              email: e.empresa.email ?? null,
              ativo: e.empresa.ativo ?? 1,
            }
          : null,
      })),
    };

    return NextResponse.json({ trilha: safe }, { status: 200 });
  } catch (err) {
    console.error('GET /api/trilhas/:id error:', err);
    return NextResponse.json({ error: 'Erro ao buscar trilha.' }, { status: 500 });
  }
}

/* ---------------- PUT /api/trilhas/:id ----------------
   Atualiza trilha: nome, ativo, itens (cria/atualiza/remove)
*/
export async function PUT(
  request: NextRequest,
  context: { params: Promise<RouteParams> }
) {
  try {
    // require admin
    const adminId = requireAdminFromRequest(request);
    if (!adminId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const trilhaId = await resolveTrilhaId(context.params);
    if (!trilhaId) {
      return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });
    }

    const body = (await request.json().catch(() => null)) as TrilhaPayload | null;
    if (!body) return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });

    const nome = (body.nome || '').trim();
    if (!nome) {
      return NextResponse.json({ error: 'Nome da trilha é obrigatório.' }, { status: 400 });
    }

    // verifica existência
    const trilhaExists = await prisma.trilha.findUnique({ where: { id: trilhaId }, select: { id: true } });
    if (!trilhaExists) return NextResponse.json({ error: 'Trilha não encontrada.' }, { status: 404 });

    const now = getBrasiliaDate();
    const itensPayload = Array.isArray(body.itens) ? body.itens : [];

    await prisma.$transaction(async (tx) => {
      // 1) Atualiza dados básicos da trilha (com auditoria via attemptUpdate)
      const trilhaUpdateBase = {
        nome,
        ativo: typeof body.ativo === 'number' ? (body.ativo === 1 ? 1 : 0) : 1,
      };

      await attemptUpdate(
        tx.trilha,
        { id: trilhaId },
        { ...trilhaUpdateBase, updated: now, updatedBy: adminId, deleted: null },
        { ...trilhaUpdateBase, updated: now, updated_by: adminId, deleted: null },
        { ...trilhaUpdateBase, deleted: null }
      );

      // 2) Itens atuais
      const existingItems = await tx.trilhaItem.findMany({
        where: { idTrilha: trilhaId },
        select: { id: true },
      });
      const existingIds = existingItems.map((i) => i.id);

      const payloadIds = itensPayload
        .map((i) => i.id)
        .filter((id): id is number => typeof id === 'number');

      // 3) Cria / atualiza itens
      for (const item of itensPayload) {
        const itemNome = (item.nome || '').trim();
        if (!itemNome) continue;

        const parsedDate = item.data ? new Date(item.data) : null;
        const dataValue = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null;

        const baseData = {
          nome: itemNome,
          tipo: item.tipo?.trim() || null,
          data: dataValue,
          detalhes: item.detalhes?.trim() || null,
          ativo: 1,
          deleted: null,
          updated: now,
          updatedBy: adminId,
        };

        const baseSnake = {
          nome: itemNome,
          tipo: item.tipo?.trim() || null,
          data: dataValue,
          detalhes: item.detalhes?.trim() || null,
          ativo: 1,
          deleted: null,
          updated: now,
          updated_by: adminId,
        };

        const basePlain = {
          nome: itemNome,
          tipo: item.tipo?.trim() || null,
          data: dataValue,
          detalhes: item.detalhes?.trim() || null,
          ativo: 1,
          deleted: null,
        };

        if (item.id) {
          // update
          await attemptUpdate(
            tx.trilhaItem,
            { id: item.id },
            baseData,
            baseSnake,
            basePlain
          );
        } else {
          // create (with created audit attempts)
          const createCamel = { ...basePlain, idTrilha: trilhaId, created: now, createdBy: adminId };
          const createSnake = { ...basePlain, idTrilha: trilhaId, created: now, created_by: adminId };
          await attemptCreate(tx.trilhaItem, createCamel, createSnake, { ...basePlain, idTrilha: trilhaId });
        }
      }

      // 4) Remove itens que saíram do payload (soft delete if possible)
      const idsToDelete = existingIds.filter((id) => !payloadIds.includes(id));
      if (idsToDelete.length > 0) {
        // Try soft-delete (updated, deleted, deletedBy, ativo=0) respecting schema variations
        try {
          await tx.trilhaItem.updateMany({
            where: { idTrilha: trilhaId, id: { in: idsToDelete } },
            data: { ativo: 0, deleted: now, updated: now, deletedBy: adminId },
          });
        } catch (err: any) {
          // fallback: snake_case
          try {
            await tx.trilhaItem.updateMany({
              where: { idTrilha: trilhaId, id: { in: idsToDelete } },
              data: { ativo: 0, deleted: now, updated: now, deletedBy: adminId },
            });
          } catch (_) {
            // last fallback: hard delete
            await tx.trilhaItem.deleteMany({
              where: { idTrilha: trilhaId, id: { in: idsToDelete } },
            });
          }
        }
      }
    });

    // re-fetch and return normalized trilha
    const trilha = await prisma.trilha.findUnique({
      where: { id: trilhaId },
      include: {
        itens: true,
        empresas: { include: { empresa: true } },
      },
    });

    if (!trilha) return NextResponse.json({ error: 'Erro ao recuperar trilha após atualização.' }, { status: 500 });

    const safe = {
      ...trilha,
      dataCriacao: trilha.dataCriacao ? trilha.dataCriacao.toISOString() : null,
      created: trilha.created ? trilha.created.toISOString() : null,
      updated: trilha.updated ? trilha.updated.toISOString() : null,
      itens: (trilha.itens ?? []).map((it: any) => ({
        ...it,
        data: it.data ? (it.data instanceof Date ? it.data.toISOString() : new Date(it.data).toISOString()) : null,
        created: it.created ? it.created.toISOString() : null,
        updated: it.updated ? it.updated.toISOString() : null,
      })),
      empresas: (trilha.empresas ?? []).map((e: any) => ({
        ...e,
        empresa: e.empresa
          ? {
              id: e.empresa.id,
              razaoSocial: e.empresa.razaoSocial,
              email: e.empresa.email ?? null,
              ativo: e.empresa.ativo ?? 1,
            }
          : null,
      })),
    };

    return NextResponse.json({ trilha: safe }, { status: 200 });
  } catch (err) {
    console.error('PUT /api/trilhas/:id error:', err);
    return NextResponse.json({ error: 'Erro ao atualizar trilha.' }, { status: 500 });
  }
}

/* ---------------- DELETE /api/trilhas/:id ----------------
   Soft-delete trilha e seus itens (marcar deleted + ativo=0), com auditoria
*/
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<RouteParams> }
) {
  try {
    const adminId = requireAdminFromRequest(request);
    if (!adminId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const trilhaId = await resolveTrilhaId(context.params);
    if (!trilhaId) return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });

    const trilha = await prisma.trilha.findUnique({ where: { id: trilhaId }, select: { id: true } });
    if (!trilha) return NextResponse.json({ error: 'Trilha não encontrada.' }, { status: 404 });

    const now = getBrasiliaDate();

    await prisma.$transaction(async (tx) => {
      // Try soft-delete for itens
      try {
        await tx.trilhaItem.updateMany({
          where: { idTrilha: trilhaId },
          data: { ativo: 0, deleted: now, updated: now, deletedBy: adminId },
        });
      } catch (err: any) {
        // fallback snake_case
        try {
          await tx.trilhaItem.updateMany({
            where: { idTrilha: trilhaId },
            data: { ativo: 0, deleted: now, updated: now, deletedBy: adminId },
          });
        } catch (_) {
          // last fallback: hard delete
          await tx.trilhaItem.deleteMany({ where: { idTrilha: trilhaId } });
        }
      }

      // Soft-delete trilha
      try {
        await tx.trilha.update({
          where: { id: trilhaId },
          data: { ativo: 0, deleted: now, updated: now, deletedBy: adminId },
        });
      } catch (err: any) {
        // fallback snake_case
        try {
          await tx.trilha.update({
            where: { id: trilhaId },
            data: { ativo: 0, deleted: now, updated: now, deletedBy: adminId },
          });
        } catch (_) {
          // last fallback: hard delete
          await tx.trilha.delete({ where: { id: trilhaId } });
        }
      }
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error('DELETE /api/trilhas/:id error:', err);
    return NextResponse.json({ error: 'Erro ao deletar trilha.' }, { status: 500 });
  }
}
