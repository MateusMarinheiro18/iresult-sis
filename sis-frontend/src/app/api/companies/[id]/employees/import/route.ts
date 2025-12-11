// src/app/api/companies/[id]/employees/import/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminToken } from '@/lib/auth/jwt';

type EmployeeRow = {
  nome?: string;
  email?: string;
  telefone?: string;
  data_nascimento?: string;
  cidade_nascimento?: string;
  gestor?: string;
  grupo?: string; // ADICIONADO
  ativo?: number | boolean;
};

type ImportBody = {
  rows: EmployeeRow[];
};

// Função helper para dividir array em chunks
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Função helper para parse de data (mantive sua lógica)
function parseDateStringMaybe(dateStr: string | undefined): string | null {
  if (!dateStr) return null;

  // Formato ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  // Formato brasileiro DD/MM/YYYY
  const brMatch = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (brMatch) {
    return `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
  }

  // Tenta parse genérico
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const year = d.getUTCFullYear();
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  } catch {}

  return null;
}

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

type RouteParams = { id: string };

export async function POST(
  request: NextRequest,
  context: { params: Promise<RouteParams> }
) {
  try {
    const resolvedParams = await context.params;
    const companyId = Number(resolvedParams.id);

    if (Number.isNaN(companyId) || companyId <= 0) {
      return NextResponse.json({ error: 'companyId inválido' }, { status: 400 });
    }

    // auth: exigir token no cookie
    const token = request.cookies.get('sis_admin_sess')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    const { ok, payload } = verifyAdminToken(token);
    if (!ok || !payload) {
      return NextResponse.json({ error: 'Token inválido ou expirado' }, { status: 401 });
    }
    const adminId = Number(payload.sub);
    if (!adminId || Number.isNaN(adminId)) {
      return NextResponse.json({ error: 'ID do administrador inválido' }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as ImportBody;
    const rows = Array.isArray(body?.rows) ? body.rows : [];

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Nenhuma linha enviada para importação.' }, { status: 400 });
    }

    // CORRIGIDO: Buscar grupos usando o modelo correto EmpresaGrupo
    let grupos: Array<{ id: number; nome: string }> = [];
    
    try {
      grupos = await prisma.empresaGrupo.findMany({
        where: { 
          idEmpresa: companyId,
          ativo: 1
        },
        select: { id: true, nome: true },
      });
    } catch (err) {
      console.error('Erro ao buscar grupos:', err);
      return NextResponse.json(
        { 
          error: 'Erro ao buscar grupos da empresa.',
          details: err instanceof Error ? err.message : String(err)
        },
        { status: 500 }
      );
    }

    const grupoMap = new Map<string, number>();
    grupos.forEach((g) => {
      grupoMap.set(g.nome.toLowerCase(), g.id);
    });

    // 0) marca existentes como deletados (soft-delete)
    const now = getBrasiliaDate();
    let preExistingHandled = false;
    try {
      await prisma.empresaFuncionario.updateMany({
        where: { id_empresa: companyId },
        data: {
          deleted: now,
          deleted_by: adminId,
          updated: now,
          updated_by: adminId,
          ativo: 0,
        },
      });
      preExistingHandled = true;
    } catch (err: any) {
      if (isPrismaUnknownArgError(err)) {
        await prisma.empresaFuncionario.deleteMany({ where: { id_empresa: companyId } });
        preExistingHandled = true;
      } else {
        throw err;
      }
    }

    // 1) Normaliza e filtra rows
    const normalized: Array<Record<string, any>> = [];
    for (const r of rows) {
      const nome = (r.nome ?? '').toString().trim();
      if (!nome || nome.length < 2) {
        continue;
      }

      const email = r.email ? r.email.toString().trim() : null;
      const telefone = r.telefone ? r.telefone.toString().trim() : null;
      const cidade_nascimento = r.cidade_nascimento ? r.cidade_nascimento.toString().trim() : null;
      const gestor = r.gestor ? r.gestor.toString().trim() : null;
      const ativo = r.ativo === undefined ? 1 : r.ativo ? 1 : 0;

      // Parse da data
      const d = parseDateStringMaybe(r.data_nascimento ? r.data_nascimento.toString() : undefined);
      const data_nascimento = d ? new Date(d + 'T12:00:00.000Z') : null;

      // Mapear grupo para id_grupo
      let id_grupo: number | null = null;
      if (r.grupo) {
        const grupoNome = r.grupo.toString().trim().toLowerCase();
        id_grupo = grupoMap.get(grupoNome) ?? null;
      }

      normalized.push({
        id_empresa: companyId,
        nome,
        email,
        telefone,
        data_nascimento,
        cidade_nascimento,
        gestor,
        id_grupo,
        ativo,
      });
    }

    if (normalized.length === 0) {
      return NextResponse.json({ error: 'Nenhuma linha válida para inserir (verifique "nome").' }, { status: 400 });
    }

    // 2) Inserir em batches (usa snake_case conforme schema)
    const BATCH_SIZE = 500;
    const batches = chunkArray(normalized, BATCH_SIZE);
    let inserted = 0;

    const createdAt = now;
    const createdBy = adminId;

    try {
      for (const batch of batches) {
        const withAudit = batch.map((row) => ({
          ...row,
          created: createdAt,
          created_by: createdBy,
          updated: createdAt,
          updated_by: createdBy,
        }));
        await prisma.empresaFuncionario.createMany({
          data: withAudit,
          skipDuplicates: true,
        });
        inserted += batch.length;
      }
    } catch (err: any) {
      if (isPrismaUnknownArgError(err)) {
        // Fallback sem audit
        inserted = 0;
        for (const batch of batches) {
          await prisma.empresaFuncionario.createMany({
            data: batch,
            skipDuplicates: true,
          });
          inserted += batch.length;
        }
      } else {
        throw err;
      }
    }

    const summary = {
      received: rows.length,
      toInsert: normalized.length,
      inserted,
      gruposEncontrados: grupos.length,
      preExistingHandled: !!preExistingHandled,
      timestamp: createdAt.toISOString(),
      byAdminId: createdBy,
    };

    return NextResponse.json({ summary }, { status: 200 });
  } catch (err: any) {
    console.error('ERROR import:', err);
    return NextResponse.json(
      {
        error: 'Erro interno ao importar funcionários.',
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
