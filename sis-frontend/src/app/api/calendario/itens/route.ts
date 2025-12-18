// src/app/api/calendario/itens/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const companyParam = url.searchParams.get('company');
    const companyId = companyParam ? Number(companyParam) : null;

    const itens = await prisma.trilhaItem.findMany({
      where: {
        data: {
          not: null,
        },
        ativo: 1,
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

    // Se companyId foi informado, filtra os itens para somente aqueles
    // cuja trilha contenha a empresa indicada.
    const filtered = companyId
      ? mapped.filter((it) => (it.empresas || []).some((e) => Number(e.id) === companyId))
      : mapped;

    return NextResponse.json({ items: filtered });
  } catch (error) {
    console.error('[GET /api/calendario/itens]', error);
    return NextResponse.json(
      { error: 'Erro ao carregar itens de trilha para o calendário.' },
      { status: 500 }
    );
  }
}
