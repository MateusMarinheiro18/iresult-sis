// src/app/admin/escalas/[id]/link/page.tsx
import React from 'react';
import { prisma } from '@/lib/prisma';
import EscalaLinkPageClient from './EscalaLinkPageClient';

type ParamsType = { id: string };
type SearchParamsType = { msg?: string };

type Props = {
  params: ParamsType | Promise<ParamsType>;
  searchParams?: SearchParamsType | Promise<SearchParamsType>;
};

export default async function EscalaLinkPage(props: Props) {
  const resolvedParams = await props.params;
  const idStr = resolvedParams?.id;
  const escalaId = idStr ? Number(idStr) : NaN;

  const resolvedSearch =
    props.searchParams ? await props.searchParams : undefined;
  const initialMessage = resolvedSearch?.msg
    ? String(resolvedSearch.msg)
    : '';

  if (!escalaId || Number.isNaN(escalaId) || escalaId <= 0) {
    return (
      <div className="page-root">
        <main className="container">
          <p>ID de escala inválido.</p>
        </main>
      </div>
    );
  }

  const escala = await prisma.escala.findUnique({
    where: { id: escalaId },
    select: {
      id: true,
      nome: true,
    },
  });

  if (!escala) {
    return (
      <div className="page-root">
        <main className="container">
          <p>Escala não encontrada.</p>
        </main>
      </div>
    );
  }

  return (
    <EscalaLinkPageClient
      escalaId={escala.id}
      escalaNome={escala.nome}
      initialMessage={initialMessage}
    />
  );
}
