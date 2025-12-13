// src/app/api/trilhas/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/trilhas?empresaId=#
 *
 * Retorna trilhas vinculadas à empresa (ativo=1 e deleted=null).
 * Formato de resposta (mesma estrutura do admin):
 * { items: [{ id, nome, dataCriacao, ativo, created, updated, createdBy }] }
 *
 * - exige query param empresaId (número). Retorna 400 se inválido/missing.
 * - trata erros e retorna 500 em falha.
 */

function toIsoOrNull(d: Date | null | undefined) {
  if (!d) return null;
  try { return d.toISOString(); } catch { return null; }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const empresaIdStr = url.searchParams.get('empresaId');

    if (!empresaIdStr) {
      return NextResponse.json({ error: 'empresaId é obrigatório (ex: ?empresaId=1)' }, { status: 400 });
    }

    const empresaId = Number(empresaIdStr);
    if (Number.isNaN(empresaId) || empresaId <= 0) {
      return NextResponse.json({ error: 'empresaId inválido' }, { status: 400 });
    }

    // Buscar trilhas vinculadas à empresa
    const trilhasDb = await prisma.trilha.findMany({
      where: {
        ativo: 1,
        deleted: null,
        empresas: {
          some: { idEmpresa: empresaId }
        }
      },
      orderBy: { id: 'desc' },
      select: {
        id: true,
        nome: true,
        dataCriacao: true,
        ativo: true,
        created: true,
        createdBy: true,
        updated: true
      }
    });

    const items = trilhasDb.map((t) => ({
      id: t.id,
      nome: t.nome,
      dataCriacao: t.dataCriacao ? t.dataCriacao.toISOString() : null,
      ativo: t.ativo,
      created: toIsoOrNull(t.created),
      updated: toIsoOrNull(t.updated),
      createdBy: t.createdBy ?? null,
    }));

    return NextResponse.json({ items }, { status: 200 });
  } catch (error) {
    console.error('Erro ao listar trilhas (filtradas por empresa):', error);
    return NextResponse.json({ error: 'Erro ao listar trilhas' }, { status: 500 });
  }
}
