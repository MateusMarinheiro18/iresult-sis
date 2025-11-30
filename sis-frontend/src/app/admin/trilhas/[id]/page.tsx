// src/app/admin/trilhas/[id]/page.tsx
import React from 'react';
import { prisma } from '@/lib/prisma';
import TrilhaDetailPageClient from './TrilhaDetailPageClient';
import type { TrilhaFormState } from '@/components/admin/trilhas/types';

type Props = {
  params: Promise<{ id: string }> | { id: string };
};

type EmpresaOption = {
  id: number;
  razaoSocial: string;
  checked: boolean;
};

export default async function TrilhaDetailPage(props: Props) {
  const resolvedParams = await props.params;
  const idStr = resolvedParams?.id;
  const trilhaId = idStr ? Number(idStr) : NaN;

  if (!trilhaId || Number.isNaN(trilhaId) || trilhaId <= 0) {
    return (
      <div className="page-root">
        <main className="container">
          <h1 className="page-title">Trilha não encontrada</h1>
        </main>
      </div>
    );
  }

  const trilha = await prisma.trilha.findUnique({
    where: { id: trilhaId },
    include: {
      itens: true,
      empresas: {
        include: {
          empresa: true,
        },
      },
    },
  });

  if (!trilha || trilha.deleted) {
    return (
      <div className="page-root">
        <main className="container">
          <h1 className="page-title">Trilha não encontrada</h1>
        </main>
      </div>
    );
  }

  const allEmpresas = await prisma.empresa.findMany({
    where: {
      ativo: 1,
      deleted: null,
    },
    orderBy: { razaoSocial: 'asc' },
  });

  const linkedIds = new Set(trilha.empresas.map((rel) => rel.idEmpresa));

  const empresasOptions: EmpresaOption[] = allEmpresas.map((e) => ({
    id: e.id,
    razaoSocial: e.razaoSocial,
    checked: linkedIds.has(e.id),
  }));

  const itensSorted = [...trilha.itens].sort((a, b) => {
    const ad = a.data ? a.data.getTime() : 0;
    const bd = b.data ? b.data.getTime() : 0;
    return ad - bd;
  });

  const initialForm: TrilhaFormState = {
    id: trilha.id,
    nome: trilha.nome,
    ativo: trilha.ativo === 1,
    itens: itensSorted
      .filter((i) => !i.deleted)
      .map((i) => ({
        tempId: `item-${i.id}`,
        id: i.id,
        nome: i.nome,
        tipo: i.tipo ?? '',
        data: i.data ? i.data.toISOString().slice(0, 10) : '',
        detalhes: i.detalhes ?? '',
      })),
  };

  const createdAtLabel = trilha.dataCriacao
    ? trilha.dataCriacao.toLocaleDateString('pt-BR')
    : undefined;

  return (
    <TrilhaDetailPageClient
      trilhaId={trilhaId}
      initialForm={initialForm}
      empresas={empresasOptions}
      createdAtLabel={createdAtLabel}
    />
  );
}
