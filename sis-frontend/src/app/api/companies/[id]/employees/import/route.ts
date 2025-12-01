// src/app/api/companies/[id]/employees/import/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type EmployeeRow = {
  nome?: string;
  email?: string;
  telefone?: string;
  data_nascimento?: string;
  cidade_nascimento?: string;
  gestor?: string;
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

// Função helper para parse de data
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

    const body = (await request.json()) as ImportBody;
    const rows = Array.isArray(body?.rows) ? body.rows : [];

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Nenhuma linha enviada para importação.' },
        { status: 400 }
      );
    }

    // 1) Apaga todos os funcionários da empresa (hard delete)
    await prisma.empresaFuncionario.deleteMany({
      where: { id_empresa: companyId },
    });

    // 2) Normaliza e filtra rows
    const normalized: Array<Record<string, any>> = [];
    for (const r of rows) {
      const nome = (r.nome ?? '').toString().trim();
      if (!nome || nome.length < 2) {
        continue;
      }

      const email = r.email ? r.email.toString().trim() : null;
      const telefone = r.telefone ? r.telefone.toString().trim() : null;
      const cidade_nascimento = r.cidade_nascimento
        ? r.cidade_nascimento.toString().trim()
        : null;
      const gestor = r.gestor ? r.gestor.toString().trim() : null;
      const ativo = r.ativo === undefined ? 1 : r.ativo ? 1 : 0;

      // Parse da data
      const d = parseDateStringMaybe(
        r.data_nascimento ? r.data_nascimento.toString() : undefined
      );
      const data_nascimento = d ? new Date(d + 'T12:00:00.000Z') : null;

      normalized.push({
        id_empresa: companyId,
        nome,
        email,
        telefone,
        data_nascimento,
        cidade_nascimento,
        gestor,
        ativo,
      });
    }

    if (normalized.length === 0) {
      return NextResponse.json(
        { error: 'Nenhuma linha válida para inserir (verifique "nome").' },
        { status: 400 }
      );
    }

    // 3) Inserir em batches
    const BATCH_SIZE = 500;
    const batches = chunkArray(normalized, BATCH_SIZE);
    let inserted = 0;

    for (const batch of batches) {
      await prisma.empresaFuncionario.createMany({
        data: batch,
      });
      inserted += batch.length;
    }

    const summary = {
      received: rows.length,
      toInsert: normalized.length,
      inserted,
    };

    return NextResponse.json({ summary }, { status: 200 });
  } catch (err) {
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
