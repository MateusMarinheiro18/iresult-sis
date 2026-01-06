import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminToken } from '@/lib/auth/jwt';
import type { Escala } from '@prisma/client';

/** util: get date in Brasilia (UTC-3) */
function getBrasiliaDate(): Date {
  const now = new Date();
  const utcMs = now.getTime();
  const brasiliaOffsetInMs = -3 * 3600000;
  return new Date(utcMs + brasiliaOffsetInMs);
}

/** formata uma Date para dd/mm/yyyy usando getters UTC (evita deslocamento por timezone) */
function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}
function formatDateToDDMMYYYY(d: Date | null): string | null {
  if (!d) return null;
  const dt = new Date(d);
  const day = dt.getUTCDate();
  const month = dt.getUTCMonth() + 1;
  const year = dt.getUTCFullYear();
  return `${pad2(day)}/${pad2(month)}/${year}`;
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

/** ---------------- GET /api/escalas ----------------
 * Lista escalas ativas ordenadas por id desc (uso admin)
 * Aceita query ?company=ID para retornar apenas escalas vinculadas àquela empresa
 */
export async function GET(request: NextRequest) {
  // auth
  const token = request.cookies.get('sis_admin_sess')?.value;
  if (!token) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { ok, payload } = verifyAdminToken(token);
  if (!ok || !payload) return NextResponse.json({ error: 'Token inválido ou expirado' }, { status: 401 });

  try {
    const url = new URL(request.url);
    const companyParam = url.searchParams.get('company');
    const companyId = companyParam ? Number(companyParam) : null;

    let escalas: any[] = [];

    if (companyId && !Number.isNaN(companyId) && companyId > 0) {
      // busca ids de escala vinculadas à empresa na tabela de vínculo
      const links = await prisma.escalaHasEmpresa.findMany({
        where: { idEmpresa: companyId },
        select: { idEscala: true },
      });

      const escalaIds = links.map((l) => l.idEscala).filter(Boolean) as number[];

      if (escalaIds.length > 0) {
        escalas = await prisma.escala.findMany({
          where: { id: { in: escalaIds }, ativo: 1, deleted: null },
          orderBy: { id: 'desc' },
          select: {
            id: true,
            nome: true,
            dataVencimento: true,
            ativo: true,
            created: true,
            createdBy: true,
            updated: true,
          },
        });
      }
      // se escalaIds vazio, escalas permanece []
    } else {
      // sem filtro por empresa -> retorna todas escalas ativas
      escalas = await prisma.escala.findMany({
        where: { ativo: 1, deleted: null },
        orderBy: { id: 'desc' },
        select: {
          id: true,
          nome: true,
          dataVencimento: true,
          ativo: true,
          created: true,
          createdBy: true,
          updated: true,
        },
      });
    }

    // format dates to ISO - exatamente como na API de trilhas
    const items = (escalas || []).map((e: any) => ({
      ...e,
      dataVencimento: e.dataVencimento ? e.dataVencimento.toISOString() : null,
      created: e.created ? e.created.toISOString() : null,
      updated: e.updated ? e.updated.toISOString() : null,
    }));

    return NextResponse.json({ items }, { status: 200 });
  } catch (err) {
    console.error('GET /api/escalas erro:', err);
    return NextResponse.json({ error: 'Erro ao listar escalas.' }, { status: 500 });
  }
}

/** ---------------- POST /api/escalas ----------------
 * Cria nova escala — auditoria é preenchida pelo servidor
 */
export async function POST(request: NextRequest) {
  // auth
  const token = request.cookies.get('sis_admin_sess')?.value;
  if (!token) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { ok, payload } = verifyAdminToken(token);
  if (!ok || !payload) return NextResponse.json({ error: 'Token inválido ou expirado' }, { status: 401 });

  const adminId = Number(payload.sub);
  if (!adminId || Number.isNaN(adminId)) return NextResponse.json({ error: 'ID do administrador inválido' }, { status: 401 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido.' }, { status: 400 });
  }

  const rawNome = body?.nome;
  const rawDataVencimento = body?.dataVencimento;
  const rawAtivo = body?.ativo;

  if (!rawNome || typeof rawNome !== 'string' || !rawNome.trim()) {
    return NextResponse.json({ error: 'Campo "nome" é obrigatório.' }, { status: 400 });
  }

  // parse dataVencimento (opcional)
  let dataVencimento: Date | null = null;
  if (typeof rawDataVencimento === 'string' && rawDataVencimento.trim()) {
    const parsed = new Date(rawDataVencimento);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json({
        error: 'Campo "dataVencimento" deve ser uma data válida (ISO ou yyyy-mm-dd).',
      }, { status: 400 });
    }
    dataVencimento = parsed;
  }

  const ativo: number = typeof rawAtivo === 'number' ? (rawAtivo === 1 ? 1 : 0) : 1;
  const now = getBrasiliaDate();

  try {
    // tenta criar com auditoria controlada pelo servidor (camelCase -> snake_case -> plain)
    const base = {
      nome: String(rawNome).trim(),
      dataVencimento,
      ativo,
    };

    const created = await attemptCreate(
      prisma.escala,
      { ...base, created: now, createdBy: adminId },
      { ...base, created: now, created_by: adminId },
      base,
      { id: true, nome: true, dataVencimento: true, ativo: true }
    );

    const resp = {
      id: created.id,
      nome: created.nome,
      dataVencimento: created.dataVencimento ? created.dataVencimento.toISOString() : null,
      ativo: created.ativo,
    };

    return NextResponse.json(resp, { status: 201 });
  } catch (err) {
    console.error('POST /api/escalas erro:', err);
    return NextResponse.json({ error: 'Erro ao criar escala.' }, { status: 500 });
  }
}
