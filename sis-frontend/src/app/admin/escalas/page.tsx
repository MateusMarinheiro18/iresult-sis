// src/app/admin/escalas/page.tsx
import React from 'react';
import { prisma } from '@/lib/prisma';
import EscalasPageClient from './EscalasPageClient';
import type { EscalaRow } from '@/components/admin/escalas/EscalasTable';
import type { Escala } from '@prisma/client';

type Props = {
  searchParams?: { [key: string]: string | string[] | undefined } | Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function EscalasPage(props: Props) {
  // compatibilidade: searchParams pode ser Promise em alguns runtimes
  const searchParams =
    props.searchParams && typeof (props.searchParams as any).then === 'function'
      ? await (props.searchParams as Promise<{ [k: string]: any }>)
      : (props.searchParams as { [k: string]: any } | undefined);

  const companyParam = Array.isArray(searchParams?.company) ? searchParams?.company[0] : searchParams?.company;
  const companyId = companyParam ? Number(companyParam) : null;

  try {
    // se companyId informado, primeiro busca os vínculos para obter ids das escalas vinculadas
    let escalasDb: Escala[] = [];

    if (companyId && !Number.isNaN(companyId) && companyId > 0) {
      // busca as ligações na tabela de vínculo (EscalaHasEmpresa)
      const links = await prisma.escalaHasEmpresa.findMany({
        where: { idEmpresa: companyId },
        select: { idEscala: true },
      });

      const escalaIds = links.map((l) => l.idEscala).filter(Boolean) as number[];

      // se não houver vínculos, escalasDb permanece []
      if (escalaIds.length > 0) {
        escalasDb = await prisma.escala.findMany({
          where: { id: { in: escalaIds }, ativo: 1, deleted: null },
          orderBy: { id: 'desc' },
        });
      }
    } else {
      // sem company filter -> retorna todas escalas ativas
      escalasDb = await prisma.escala.findMany({
        where: { ativo: 1, deleted: null },
        orderBy: { id: 'desc' },
      });
    }

    const initialData: EscalaRow[] = (escalasDb || []).map((e) => ({
      id: e.id,
      nome: e.nome,
      dataVencimento: e.dataVencimento ? e.dataVencimento.toISOString() : null,
    }));

    return <EscalasPageClient initialData={initialData} />;
  } catch (err) {
    console.error('Erro ao carregar escalas (page):', err);
    // em caso de erro, retorne lista vazia (evita quebrar a página)
    return <EscalasPageClient initialData={[]} />;
  }
}
