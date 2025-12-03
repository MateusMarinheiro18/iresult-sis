// src/app/api/companies/[id]/employees/import/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type EmployeeRow = {
  origem_linha?: number | null;
  nome?: string | null;
  email?: string | null;
  telefone?: string | null;
  data_nascimento?: string | null;
  cidade_nascimento?: string | null;
  gestor?: string | null;
  grupo?: string | null;
  ativo?: number | boolean | null;
  [k: string]: any;
};

type ImportBody = {
  rows: EmployeeRow[];
};

// helper pra dividir em batches
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

function isValidEmail(email?: string | null) {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// parse de datas (DD/MM/YYYY, YYYY-MM-DD, serial Excel etc.) -> Date
function parseDateStringMaybe(dateStr?: string | null): Date | null {
  if (!dateStr) return null;
  const s = dateStr.toString().trim();
  if (!s) return null;

  // YYYY-MM-DD
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const y = Number(isoMatch[1]);
    const m = Number(isoMatch[2]) - 1;
    const d = Number(isoMatch[3]);
    const dt = new Date(y, m, d, 12, 0, 0);
    if (!Number.isNaN(dt.getTime())) return dt;
  }

  // DD/MM/YYYY ou DD-MM-YYYY
  const brMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (brMatch) {
    const d = Number(brMatch[1]);
    const m = Number(brMatch[2]) - 1;
    const y = Number(brMatch[3]);
    const dt = new Date(y, m, d, 12, 0, 0);
    if (!Number.isNaN(dt.getTime())) return dt;
  }

  // serial Excel
  const num = Number(s);
  if (!isNaN(num) && num > 0 && num < 100000) {
    const excelEpoch = new Date(1900, 0, 1);
    return new Date(excelEpoch.getTime() + (num - 2) * 86400000);
  }

  // fallback genérico
  const dt = new Date(s);
  if (!Number.isNaN(dt.getTime())) return dt;

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

    // Carrega grupos da empresa (ativos e não deletados)
    const grupos = await prisma.empresaGrupo.findMany({
      where: {
        idEmpresa: companyId,
        deleted: null,
        OR: [{ ativo: null }, { ativo: 1 }],
      },
    });

    if (grupos.length === 0) {
      return NextResponse.json(
        {
          error:
            'A empresa não possui grupos ativos cadastrados. Crie grupos antes de importar funcionários.',
        },
        { status: 400 }
      );
    }

    const groupMap = new Map<string, number>();
    for (const g of grupos) {
      groupMap.set(g.nome.toLowerCase(), g.id);
    }

    type RowError = { index: number; origem_linha: number; erros: string[] };
    const errors: RowError[] = [];
    const normalized: Array<{
      id_empresa: number;
      id_grupo: number;
      nome: string;
      email: string | null;
      telefone: string | null;
      data_nascimento: Date | null;
      cidade_nascimento: string | null;
      gestor: string | null;
      ativo: number;
    }> = [];

    const emailsSeenInFile = new Set<string>();

    rows.forEach((r, idx) => {
      const origem_linha = r?.origem_linha ?? idx + 2; // assumindo cabeçalho na linha 1
      const rowErrors: string[] = [];

      // nome obrigatório
      const nome = (r.nome ?? '').toString().trim();
      if (!nome || nome.length < 2) {
        rowErrors.push('nome obrigatório (mínimo 2 caracteres)');
      }

      // grupo obrigatório e deve existir na empresa
      const grupoNomeRaw = (r.grupo ?? '').toString().trim();
      let id_grupo: number | null = null;
      if (!grupoNomeRaw) {
        rowErrors.push('grupo é obrigatório');
      } else {
        const gId = groupMap.get(grupoNomeRaw.toLowerCase());
        if (!gId) {
          rowErrors.push('grupo não encontrado para esta empresa');
        } else {
          id_grupo = gId;
        }
      }

      // email (opcional) + validação + duplicado no arquivo
      let email: string | null = null;
      if (r.email) {
        const e = r.email.toString().trim();
        if (e) {
          if (!isValidEmail(e)) {
            rowErrors.push('email inválido');
          } else {
            const lower = e.toLowerCase();
            if (emailsSeenInFile.has(lower)) {
              rowErrors.push('email duplicado no arquivo');
            } else {
              emailsSeenInFile.add(lower);
              email = e;
            }
          }
        }
      }

      // telefone -> só dígitos
      let telefone: string | null = null;
      if (r.telefone) {
        const t = r.telefone.toString().replace(/\D/g, '');
        telefone = t || null;
      }

      // data_nascimento
      let data_nascimento: Date | null = null;
      if (r.data_nascimento) {
        const d = parseDateStringMaybe(r.data_nascimento);
        if (!d) {
          rowErrors.push('data_nascimento inválida');
        } else if (d.getTime() > Date.now()) {
          rowErrors.push('data_nascimento não pode ser no futuro');
        } else {
          data_nascimento = d;
        }
      }

      const cidade_nascimento = r.cidade_nascimento
        ? r.cidade_nascimento.toString().trim() || null
        : null;

      const gestor = r.gestor ? r.gestor.toString().trim() || null : null;

      // ativo -> normaliza para 0/1
      let ativo = 1;
      if (r.ativo !== undefined && r.ativo !== null) {
        const a = r.ativo;
        if (typeof a === 'boolean') ativo = a ? 1 : 0;
        else if (typeof a === 'number') ativo = a === 0 ? 0 : 1;
        else if (typeof a === 'string') ativo = a === '0' ? 0 : 1;
      }

      if (rowErrors.length > 0 || !id_grupo || !nome) {
        errors.push({ index: idx, origem_linha, erros: rowErrors });
        return;
      }

      normalized.push({
        id_empresa: companyId,
        id_grupo: id_grupo!,
        nome,
        email,
        telefone,
        data_nascimento,
        cidade_nascimento,
        gestor,
        ativo,
      });
    });

    if (errors.length > 0) {
      return NextResponse.json(
        {
          error: 'Erros de validação em uma ou mais linhas.',
          details: errors,
        },
        { status: 400 }
      );
    }

    if (normalized.length === 0) {
      return NextResponse.json(
        { error: 'Nenhuma linha válida para inserir.' },
        { status: 400 }
      );
    }

    // A PARTIR DAQUI: temos linhas válidas
    // Estratégia mantida: substitui todos os funcionários da empresa pela planilha

    // 1) Apaga todos os funcionários da empresa (hard delete)
    await prisma.empresaFuncionario.deleteMany({
      where: { id_empresa: companyId },
    });

    // 2) Insere em batches
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
      valid: normalized.length,
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
