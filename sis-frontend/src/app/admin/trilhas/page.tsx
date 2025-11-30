// src/app/admin/trilhas/page.tsx
import React from 'react';
import { prisma } from '@/lib/prisma';
import TrilhasPageClient from './TrilhasPageClient';
import type { TrilhaRow } from '@/components/admin/trilhas/TrilhasTable';

export default async function TrilhasPage() {
  const trilhasDb = await prisma.trilha.findMany({
    where: { ativo: 1, deleted: null },
    orderBy: { id: 'desc' },
  });

  const initialData: TrilhaRow[] = trilhasDb.map((t) => ({
    id: t.id,
    nome: t.nome,
    // Mandamos só "yyyy-mm-dd"
    dataCriacao: t.dataCriacao
      ? t.dataCriacao.toISOString().slice(0, 10)
      : null,
  }));

  return <TrilhasPageClient initialData={initialData} />;
}
