// src/app/api/companies/[id]/employees/import/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseDateStringMaybe, EmployeeRow } from '@/lib/employeeValidators';
import { chunkArray } from '@/lib/utils';

/**
 * Fluxo simples:
 * 1) Recebe body { rows: EmployeeRow[] }
 * 2) deleteMany onde id_empresa = companyId
 * 3) inserir todos os rows (após mapear/normalizar) em batches com createMany
 *
 * Observações:
 * - NÃO faz backup
 * - NÃO verifica permissão (assumido que o admin tem acesso)
 * - Validação mínima: ignora linhas sem nome (nome obrigatório)
 */

type ImportBody = {
  rows: EmployeeRow[];
};

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const companyId = Number(params.id);
    if (Number.isNaN(companyId) || companyId <= 0) {
      return NextResponse.json({ error: 'companyId inválido' }, { status: 400 });
    }

    const body = (await req.json()) as ImportBody;
    const rows = Array.isArray(body?.rows) ? body.rows : [];

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Nenhuma linha enviada para importação.' }, { status: 400 });
    }

    // 1) Apaga todos os funcionários da empresa (hard delete)
    await prisma.empresaFuncionario.deleteMany({
      where: { id_empresa: companyId },
    });

    // 2) Normaliza e filtra rows: exige nome mínimo (2 chars)
    const normalized: Array<Record<string, any>> = [];
    for (const r of rows) {
      const nome = (r.nome ?? '').toString().trim();
      if (!nome || nome.length < 2) {
        // ignora linha sem nome válido
        continue;
      }
      const email = r.email ? r.email.toString().trim() : null;
      const telefone = r.telefone ? r.telefone.toString().trim() : null;
      const d = parseDateStringMaybe(r.data_nascimento ? r.data_nascimento.toString() : undefined);
      const data_nascimento = d ? d : null;
      const cidade_nascimento = r.cidade_nascimento ? r.cidade_nascimento.toString().trim() : null;
      const gestor = r.gestor ? r.gestor.toString().trim() : null;
      const ativo = r.ativo === undefined ? 1 : (r.ativo ? 1 : 0);

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
      return NextResponse.json({ error: 'Nenhuma linha válida para inserir (verifique "nome").' }, { status: 400 });
    }

    // 3) Inserir em batches usando createMany para performance
    // createMany não retorna IDs; se você precisar de IDs, eu troco para create() em transaction por item.
    const BATCH_SIZE = 500;
    const batches = chunkArray(normalized, BATCH_SIZE);
    let inserted = 0;

    for (const batch of batches) {
      // createMany com skipDuplicates não é garantido em todas as bases; aqui não usamos skipDuplicates.
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
    console.error('ERROR import (simple hard replace):', err);
    return NextResponse.json({ error: 'Erro interno ao importar funcionários.' }, { status: 500 });
  }
}
