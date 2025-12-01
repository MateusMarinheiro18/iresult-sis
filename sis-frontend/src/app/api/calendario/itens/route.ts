// src/app/api/calendario/itens/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_request: NextRequest) {
  try {
    const itens = await prisma.trilhaItem.findMany({
      where: {
        data: {
          not: null, // só eventos com data
        },
        ativo: 1, // APENAS eventos ativos
      },
      include: {
        trilha: {
          include: {
            empresas: {
              include: {
                empresa: true,
              },
            },
          },
        },
      },
      orderBy: {
        data: 'asc',
      },
    });

    const mapped = itens
      .map((item) => ({
        id: item.id,
        nome: item.nome,
        tipo: item.tipo,
        detalhes: item.detalhes,
        data: item.data?.toISOString() ?? null,
        trilha: item.trilha
          ? {
              id: item.trilha.id,
              nome: item.trilha.nome,
            }
          : null,
        empresas:
          item.trilha?.empresas?.map((link) => ({
            id: link.empresa.id,
            razaoSocial: link.empresa.razaoSocial,
          })) ?? [],
      }))
      .filter((i) => i.data !== null);

    return NextResponse.json({ items: mapped });
  } catch (error) {
    console.error('[GET /api/calendario/itens]', error);
    return NextResponse.json(
      { error: 'Erro ao carregar itens de trilha para o calendário.' },
      { status: 500 }
    );
  }
}
