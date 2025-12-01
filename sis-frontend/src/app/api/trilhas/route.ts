// src/app/api/trilhas/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_request: NextRequest) {
  try {
    const trilhasDb = await prisma.trilha.findMany({
      where: {
        ativo: 1,
        deleted: null,
      },
      orderBy: {
        id: 'desc',
      },
    });

    const items = trilhasDb.map((t) => ({
      id: t.id,
      nome: t.nome,
      dataCriacao: t.dataCriacao ? t.dataCriacao.toISOString() : null,
    }));

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Erro ao listar trilhas:', error);
    return NextResponse.json(
      { error: 'Erro ao listar trilhas' },
      { status: 500 }
    );
  }
}
