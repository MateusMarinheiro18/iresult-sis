// src/app/admin/escalas/[id]/link/page.tsx
import React from 'react';
import { prisma } from '@/lib/prisma';
import EscalaLinkPageClient from './EscalaLinkPageClient';

type Props = {
  params: Promise<{ id: string }> | { id: string };
};

export default async function EscalaLinkPage(props: Props) {
  const resolvedParams = await props.params;
  const idStr = resolvedParams?.id;
  const escalaId = idStr ? Number(idStr) : NaN;

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
    <EscalaLinkPageClient escalaId={escala.id} escalaNome={escala.nome} />
  );
}
