// src/app/admin/escalas/page.tsx
import React from 'react';
import { prisma } from '@/lib/prisma';
import EscalasPageClient from './EscalasPageClient';
import type { EscalaRow } from '@/components/admin/escalas/EscalasTable';

export default async function EscalasPage() {
  const escalasDb = await prisma.escala.findMany({
    where: { ativo: 1 },
    orderBy: { id: 'desc' },
  });

  const initialData: EscalaRow[] = escalasDb.map((e) => ({
    id: e.id,
    nome: e.nome,
    dataVencimento: e.dataVencimento ? e.dataVencimento.toISOString() : null,
  }));

  return <EscalasPageClient initialData={initialData} />;
}
