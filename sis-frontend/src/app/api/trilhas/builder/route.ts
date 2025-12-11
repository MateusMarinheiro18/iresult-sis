// src/app/api/trilhas/builder/route.ts
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

/**
 * Tenta criar um registro usando três variações:
 *  A) camelCase audit fields (created, createdBy)
 *  B) snake_case audit fields (created, created_by)
 *  C) sem campos de audit
 *
 * Se `dataCamel` contiver nested `create` (ex: itens), esses nested objects
 * também devem estar preparados nas três variações.
 */
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

type ItemPayload = {
  nome: string;
  tipo?: string | null;
  data?: string | null; // yyyy-mm-dd or ISO
  detalhes?: string | null;
};

type TrilhaPayload = {
  nome: string;
  ativo?: number;
  itens: ItemPayload[];
};

export async function POST(request: NextRequest) {
  try {
    // auth: exigir cookie de sessão do admin
    const token = request.cookies.get('sis_admin_sess')?.value;
    if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { ok, payload } = verifyAdminToken(token);
    if (!ok || !payload) return NextResponse.json({ error: 'Token inválido ou expirado' }, { status: 401 });

    const adminId = Number(payload.sub);
    if (!adminId || Number.isNaN(adminId)) return NextResponse.json({ error: 'ID do administrador inválido' }, { status: 401 });

    const body = (await request.json().catch(() => null)) as TrilhaPayload | null;
    if (!body) return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });

    const nome = (body.nome ?? '').toString().trim();
    if (!nome) return NextResponse.json({ error: 'Nome da trilha é obrigatório.' }, { status: 400 });

    const itens = Array.isArray(body.itens) ? body.itens : [];
    if (itens.length === 0) return NextResponse.json({ error: 'Adicione ao menos um evento na trilha.' }, { status: 400 });

    const now = getBrasiliaDate();
    const ativo = typeof body.ativo === 'number' ? (body.ativo === 1 ? 1 : 0) : 1;

    // preparar variações dos itens (camelCase, snake_case, plain)
    const itemsCamel = itens.map((i) => {
      const parsedDate = i.data ? new Date(i.data) : null;
      return {
        nome: (i.nome ?? '').toString().trim(),
        tipo: i.tipo ? String(i.tipo).trim() : null,
        data: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null,
        detalhes: i.detalhes ? String(i.detalhes).trim() : null,
        ativo: 1,
        created: now,
        createdBy: adminId,
      };
    });

    const itemsSnake = itens.map((i) => {
      const parsedDate = i.data ? new Date(i.data) : null;
      return {
        nome: (i.nome ?? '').toString().trim(),
        tipo: i.tipo ? String(i.tipo).trim() : null,
        data: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null,
        detalhes: i.detalhes ? String(i.detalhes).trim() : null,
        ativo: 1,
        created: now,
        created_by: adminId,
      };
    });

    const itemsPlain = itens.map((i) => {
      const parsedDate = i.data ? new Date(i.data) : null;
      return {
        nome: (i.nome ?? '').toString().trim(),
        tipo: i.tipo ? String(i.tipo).trim() : null,
        data: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null,
        detalhes: i.detalhes ? String(i.detalhes).trim() : null,
        ativo: 1,
      };
    });

    // preparar objetos de trilha nas 3 variações (com nested create)
    const trilhaBase = {
      nome,
      dataCriacao: now,
      ativo,
    };

    const trilhaCamel = {
      ...trilhaBase,
      created: now,
      createdBy: adminId,
      itens: {
        create: itemsCamel,
      },
    };

    const trilhaSnake = {
      ...trilhaBase,
      created: now,
      created_by: adminId,
      itens: {
        create: itemsSnake,
      },
    };

    const trilhaPlain = {
      ...trilhaBase,
      itens: {
        create: itemsPlain,
      },
    };

    // tenta criar com audit fields; fallback se o schema não tiver esses campos
    const created = await attemptCreate(
      prisma.trilha,
      trilhaCamel,
      trilhaSnake,
      trilhaPlain,
      { id: true, nome: true, dataCriacao: true, ativo: true, itens: true }
    );

    // normalizar response (formatar datas ISO)
    const resp = {
      id: created.id,
      nome: created.nome,
      dataCriacao: created.dataCriacao ? new Date(created.dataCriacao).toISOString() : null,
      ativo: created.ativo ?? ativo,
      itens:
        Array.isArray((created as any).itens) && (created as any).itens.length > 0
          ? (created as any).itens.map((it: any) => ({
              id: it.id,
              nome: it.nome,
              tipo: it.tipo ?? null,
              data: it.data ? new Date(it.data).toISOString() : null,
              detalhes: it.detalhes ?? null,
              ativo: it.ativo ?? 1,
            }))
          : [],
    };

    return NextResponse.json({ trilha: resp }, { status: 201 });
  } catch (err: any) {
    console.error('Erro ao criar trilha:', err);
    // mensagem amigável, sem vazar stack
    return NextResponse.json({ error: err?.message ?? 'Erro ao criar trilha.' }, { status: 500 });
  }
}
