// src/app/api/trilhas/[id]/empresas/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Next 13/14+ pode passar params como objeto ou Promise
type Context =
  | { params: { id: string } }
  | { params: Promise<{ id: string }> };

type Body = {
  empresaIds?: number[];
};

/**
 * PUT /api/trilhas/:id/empresas
 * Atualiza os vínculos da trilha com empresas:
 * - Recebe { empresaIds: number[] }
 * - Cria registros em EmpresaHasTrilha que faltam
 * - Remove registros que não estão mais na lista
 */
export async function PUT(req: Request, context: Context) {
  // resolve params (pode ser Promise)
  const resolvedParams = await context.params;
  const idStr = resolvedParams?.id;
  const trilhaId = idStr ? Number(idStr) : NaN;

  if (!trilhaId || Number.isNaN(trilhaId) || trilhaId <= 0) {
    return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json(
      { error: 'JSON inválido no corpo da requisição.' },
      { status: 400 }
    );
  }

  const empresaIds = (body.empresaIds ?? []).filter(
    (id): id is number => typeof id === 'number' && id > 0
  );

  // Verifica se a trilha existe
  const trilha = await prisma.trilha.findUnique({
    where: { id: trilhaId },
    select: { id: true, deleted: true },
  });

  if (!trilha || trilha.deleted) {
    return NextResponse.json(
      { error: 'Trilha não encontrada.' },
      { status: 404 }
    );
  }

  // Faz tudo em transação
  await prisma.$transaction(async (tx) => {
    // vínculos atuais
    const atuais = await tx.empresaHasTrilha.findMany({
      where: { idTrilha: trilhaId },
      select: { idEmpresa: true },
    });

    const atuaisIds = atuais.map((rel) => rel.idEmpresa);

    const paraAdicionar = empresaIds.filter((id) => !atuaisIds.includes(id));
    const paraRemover = atuaisIds.filter((id) => !empresaIds.includes(id));

    // adiciona novos vínculos
    if (paraAdicionar.length > 0) {
      await tx.empresaHasTrilha.createMany({
        data: paraAdicionar.map((idEmpresa) => ({
          idTrilha: trilhaId,
          idEmpresa,
        })),
        skipDuplicates: true,
      });
    }

    // remove vínculos que saíram da lista
    if (paraRemover.length > 0) {
      await tx.empresaHasTrilha.deleteMany({
        where: {
          idTrilha: trilhaId,
          idEmpresa: { in: paraRemover },
        },
      });
    }
  });

  return NextResponse.json({ ok: true });
}
