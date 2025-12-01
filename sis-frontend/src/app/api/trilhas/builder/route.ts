// src/app/api/trilhas/builder/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type ItemPayload = {
  nome: string;
  tipo?: string | null;
  data?: string | null; // yyyy-mm-dd
  detalhes?: string | null;
};

type TrilhaPayload = {
  nome: string;
  ativo?: number;
  itens: ItemPayload[];
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as TrilhaPayload;

    const nome = (body.nome || '').trim();
    if (!nome) {
      return NextResponse.json(
        { error: 'Nome da trilha é obrigatório.' },
        { status: 400 }
      );
    }

    if (!body.itens || body.itens.length === 0) {
      return NextResponse.json(
        { error: 'Adicione ao menos um evento na trilha.' },
        { status: 400 }
      );
    }

    const now = new Date();

    const trilha = await prisma.trilha.create({
      data: {
        nome,
        dataCriacao: now, // sempre definida no momento da criação
        ativo: body.ativo ?? 1,
        created: now,
        itens: {
          create: body.itens.map((i) => ({
            nome: (i.nome || '').trim(),
            tipo: i.tipo?.trim() || null,
            data: i.data ? new Date(i.data) : null,
            detalhes: i.detalhes?.trim() || null,
            ativo: 1,
            created: now,
          })),
        },
      },
      include: {
        itens: true,
      },
    });

    return NextResponse.json({ trilha });
  } catch (error) {
    console.error('Erro ao criar trilha:', error);
    return NextResponse.json(
      { error: 'Erro ao criar trilha.' },
      { status: 500 }
    );
  }
}
