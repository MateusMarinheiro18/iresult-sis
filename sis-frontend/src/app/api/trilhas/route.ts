// src/app/api/trilhas/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAdminToken } from '@/lib/auth/jwt';

/** util: get date in Brasilia (UTC-3) — usado para consistência caso precise */
function getBrasiliaDate(): Date {
  const now = new Date();
  const utcMs = now.getTime();
  const brasiliaOffsetInMs = -3 * 3600000;
  return new Date(utcMs + brasiliaOffsetInMs);
}

export async function GET(request: NextRequest) {
  try {
    // exigir sessão admin
    const token = request.cookies.get('sis_admin_sess')?.value;
    if (!token) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { ok, payload } = verifyAdminToken(token);
    if (!ok || !payload) return NextResponse.json({ error: 'Token inválido ou expirado' }, { status: 401 });

    const url = new URL(request.url);
    const companyParam = url.searchParams.get('company');
    const companyId = companyParam ? Number(companyParam) : null;

    let trilhasDb: any[] = [];

    if (companyId && !Number.isNaN(companyId) && companyId > 0) {
      // busca ids de trilhas vinculadas à empresa na tabela de vínculo
      const links = await prisma.empresaHasTrilha.findMany({
        where: { idEmpresa: companyId },
        select: { idTrilha: true },
      });

      const trilhaIds = links.map((l) => l.idTrilha).filter(Boolean) as number[];

      if (trilhaIds.length > 0) {
        trilhasDb = await prisma.trilha.findMany({
          where: { id: { in: trilhaIds }, ativo: 1, deleted: null },
          orderBy: { id: 'desc' },
          select: {
            id: true,
            nome: true,
            dataCriacao: true,
            ativo: true,
            created: true,
            createdBy: true,
            updated: true,
          },
        });
      }
      // se trilhaIds vazio, trilhasDb permanece []
    } else {
      // sem filtro por empresa -> retorna todas trilhas ativas
      trilhasDb = await prisma.trilha.findMany({
        where: { ativo: 1, deleted: null },
        orderBy: { id: 'desc' },
        select: {
          id: true,
          nome: true,
          dataCriacao: true,
          ativo: true,
          created: true,
          createdBy: true,
          updated: true,
        },
      });
    }

    const items = trilhasDb.map((t) => ({
      id: t.id,
      nome: t.nome,
      dataCriacao: t.dataCriacao ? t.dataCriacao.toISOString() : null,
      ativo: t.ativo,
      created: t.created ? t.created.toISOString() : null,
      updated: t.updated ? t.updated.toISOString() : null,
      createdBy: t.createdBy ?? null,
    }));

    return NextResponse.json({ items }, { status: 200 });
  } catch (error) {
    console.error('Erro ao listar trilhas:', error);
    return NextResponse.json({ error: 'Erro ao listar trilhas' }, { status: 500 });
  }
}
