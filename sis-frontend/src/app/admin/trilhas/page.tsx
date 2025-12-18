// src/app/admin/trilhas/page.tsx
import React from 'react';
import { prisma } from '@/lib/prisma';
import TrilhasPageClient from './TrilhasPageClient';
import type { TrilhaRow } from '@/components/admin/trilhas/TrilhasTable';

interface Props {
  searchParams?: { [key: string]: any };
}

export default async function TrilhasPage(props: Props) {
  // Resolve searchParams caso seja Promise
  const searchParams =
    props.searchParams && typeof (props.searchParams as any).then === 'function'
      ? await (props.searchParams as Promise<{ [k: string]: any }>)
      : (props.searchParams as { [k: string]: any } | undefined);

  const companyParam = Array.isArray(searchParams?.company)
    ? searchParams?.company[0]
    : searchParams?.company;

  const companyId = companyParam ? Number(companyParam) : null;

  try {
    let trilhasDb: any[] = [];

    if (companyId && !Number.isNaN(companyId) && companyId > 0) {
      // busca as ligações na tabela de vínculo (EmpresaHasTrilha)
      const links = await prisma.empresaHasTrilha.findMany({
        where: { idEmpresa: companyId },
        select: { idTrilha: true },
      });

      const trilhaIds = links.map((l) => l.idTrilha).filter(Boolean) as number[];

      // se não houver vínculos, trilhasDb permanece []
      if (trilhaIds.length > 0) {
        trilhasDb = await prisma.trilha.findMany({
          where: { id: { in: trilhaIds }, ativo: 1, deleted: null },
          orderBy: { id: 'desc' },
        });
      }
    } else {
      // sem company filter -> retorna todas trilhas ativas
      trilhasDb = await prisma.trilha.findMany({
        where: { ativo: 1, deleted: null },
        orderBy: { id: 'desc' },
      });
    }

    const initialData: TrilhaRow[] = trilhasDb.map((t) => ({
      id: t.id,
      nome: t.nome,
      dataCriacao: t.dataCriacao ? t.dataCriacao.toISOString().slice(0, 10) : null,
    }));

    return <TrilhasPageClient initialData={initialData} />;
  } catch (err) {
    console.error('Erro ao carregar trilhas (page):', err);
    return <TrilhasPageClient initialData={[]} />;
  }
}
