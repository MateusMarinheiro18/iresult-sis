// src/app/api/escalas/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Stub de autorização para ADMIN.
 * Depois você pode integrar com sessão/token.
 */
async function checkAdmin(req: NextRequest) {
  // TODO: integrar com autenticação real
  return true;
}

/**
 * GET /api/escalas
 * - Lista todas as escalas ATIVAS, ordenadas por id desc.
 * - Usada pela tabela de /admin/escalas.
 */
export async function GET(req: NextRequest) {
  const isAdmin = await checkAdmin(req);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const escalas = await prisma.escala.findMany({
      where: { ativo: 1 },
      orderBy: { id: 'desc' },
    });

    return NextResponse.json({ items: escalas }, { status: 200 });
  } catch (err) {
    console.error('GET /api/escalas erro:', err);
    return NextResponse.json(
      { error: 'Erro ao listar escalas.' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/escalas
 * - Cria uma nova escala.
 * - Body esperado (JSON):
 *   {
 *     "nome": "Escala de Clima 2025",
 *     "dataVencimento": "2025-12-31", // opcional (ISO ou yyyy-mm-dd)
 *     "ativo": 1                      // opcional (default 1)
 *   }
 */
export async function POST(req: NextRequest) {
  const isAdmin = await checkAdmin(req);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Body JSON inválido.' },
      { status: 400 },
    );
  }

  const rawNome = body?.nome;
  const rawDataVencimento = body?.dataVencimento;
  const rawAtivo = body?.ativo;

  // valida nome
  if (!rawNome || typeof rawNome !== 'string' || !rawNome.trim()) {
    return NextResponse.json(
      { error: 'Campo "nome" é obrigatório.' },
      { status: 400 },
    );
  }

  // valida / parse dataVencimento (opcional)
  let dataVencimento: Date | null = null;
  if (typeof rawDataVencimento === 'string' && rawDataVencimento.trim()) {
    const parsed = new Date(rawDataVencimento);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json(
        { error: 'Campo "dataVencimento" deve ser uma data válida (ISO ou yyyy-mm-dd).' },
        { status: 400 },
      );
    }
    dataVencimento = parsed;
  }

  const ativo: number = typeof rawAtivo === 'number' ? rawAtivo : 1;
  const now = new Date();

  try {
    const escala = await prisma.escala.create({
      data: {
        nome: rawNome.trim(),
        dataVencimento,
        ativo,
        created: now,
        // TODO: pegar id do admin logado
        createdBy: null,
      },
    });

    return NextResponse.json(escala, { status: 201 });
  } catch (err) {
    console.error('POST /api/escalas erro:', err);
    return NextResponse.json(
      { error: 'Erro ao criar escala.' },
      { status: 500 },
    );
  }
}
