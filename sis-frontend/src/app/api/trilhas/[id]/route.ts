// src/app/api/trilhas/[id]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type ItemPayload = {
  id?: number;
  nome: string;
  tipo?: string | null;
  data?: string | null; // yyyy-mm-dd
  detalhes?: string | null;
};

type TrilhaPayload = {
  nome: string;
  ativo?: number;
  itens?: ItemPayload[];
};

type Context =
  | { params: { id: string } }
  | { params: Promise<{ id: string }> };

// GET /api/trilhas/:id
export async function GET(_req: Request, context: Context) {
  const resolvedParams = await context.params;
  const idStr = resolvedParams?.id;
  const trilhaId = idStr ? Number(idStr) : NaN;

  if (!trilhaId || Number.isNaN(trilhaId) || trilhaId <= 0) {
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
    },
  });

  if (!trilha || trilha.deleted) {
    return NextResponse.json(
      { error: 'Trilha não encontrada.' },
      { status: 404 }
    );
  }

  return NextResponse.json({ trilha });
}

// PUT /api/trilhas/:id
export async function PUT(req: Request, context: Context) {
  const resolvedParams = await context.params;
  const idStr = resolvedParams?.id;
  const trilhaId = idStr ? Number(idStr) : NaN;

  if (!trilhaId || Number.isNaN(trilhaId) || trilhaId <= 0) {
    return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });
  }

  const body = (await req.json()) as TrilhaPayload;

  const nome = (body.nome || '').trim();
  if (!nome) {
    return NextResponse.json(
      { error: 'Nome da trilha é obrigatório.' },
      { status: 400 }
    );
  }

  const trilhaExists = await prisma.trilha.findUnique({
    where: { id: trilhaId },
    select: { id: true },
  });

  if (!trilhaExists) {
    return NextResponse.json(
      { error: 'Trilha não encontrada.' },
      { status: 404 }
    );
  }

  const now = new Date();
  const itensPayload = body.itens ?? [];

  await prisma.$transaction(async (tx) => {
    // Atualiza dados básicos da trilha (SEM mexer em dataCriacao)
    await tx.trilha.update({
      where: { id: trilhaId },
      data: {
        nome,
        ativo: body.ativo ?? 1,
        updated: now,
        deleted: null,
      },
    });

    // Itens atuais
    const existingItems = await tx.trilhaItem.findMany({
      where: { idTrilha: trilhaId },
      select: { id: true },
    });
    const existingIds = existingItems.map((i) => i.id);

    const payloadIds = itensPayload
      .map((i) => i.id)
      .filter((id): id is number => typeof id === 'number');

    // Cria / atualiza itens
    for (const item of itensPayload) {
      const itemNome = (item.nome || '').trim();
      if (!itemNome) continue;

      const data = item.data ? new Date(item.data) : null;

      const baseData = {
        nome: itemNome,
        tipo: item.tipo?.trim() || null,
        data,
        detalhes: item.detalhes?.trim() || null,
        ativo: 1,
        deleted: null,
        updated: now,
      };

      if (item.id) {
        await tx.trilhaItem.update({
          where: { id: item.id },
          data: baseData,
        });
      } else {
        await tx.trilhaItem.create({
          data: {
            ...baseData,
            idTrilha: trilhaId,
            created: now,
          },
        });
      }
    }

    // Remove itens que saíram do payload
    const idsToDelete = existingIds.filter((id) => !payloadIds.includes(id));
    if (idsToDelete.length > 0) {
      await tx.trilhaItem.deleteMany({
        where: {
          idTrilha: trilhaId,
          id: { in: idsToDelete },
        },
      });
    }
  });

  const trilha = await prisma.trilha.findUnique({
    where: { id: trilhaId },
    include: {
      itens: true,
      empresas: { include: { empresa: true } },
    },
  });

  return NextResponse.json({ trilha });
}

// DELETE /api/trilhas/:id
export async function DELETE(_req: Request, context: Context) {
  const resolvedParams = await context.params;
  const idStr = resolvedParams?.id;
  const trilhaId = idStr ? Number(idStr) : NaN;

  if (!trilhaId || Number.isNaN(trilhaId) || trilhaId <= 0) {
    return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });
  }

  const trilha = await prisma.trilha.findUnique({
    where: { id: trilhaId },
    select: { id: true },
  });

  if (!trilha) {
    return NextResponse.json(
      { error: 'Trilha não encontrada.' },
      { status: 404 }
    );
  }

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.trilhaItem.updateMany({
      where: { idTrilha: trilhaId },
      data: {
        ativo: 0,
        deleted: now,
        updated: now,
      },
    });

    await tx.trilha.update({
      where: { id: trilhaId },
      data: {
        ativo: 0,
        deleted: now,
        updated: now,
      },
    });
  });

  return NextResponse.json({ ok: true });
}
