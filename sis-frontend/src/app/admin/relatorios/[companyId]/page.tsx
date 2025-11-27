// src/app/admin/relatorios/[companyId]/page.tsx
import React from 'react';
import { prisma } from '@/lib/prisma';
import CompanyReportsPageClient from './CompanyReportsPageClient';

type Props = {
  params: Promise<{ companyId: string }> | { companyId: string };
};

export default async function CompanyReportsPage(props: Props) {
  const resolvedParams = await props.params;
  const idStr = resolvedParams?.companyId;
  const companyId = idStr ? Number(idStr) : NaN;

  if (Number.isNaN(companyId) || companyId <= 0) {
    return (
      <div className="page-root">
        <main className="container">
          <p>Empresa inválida.</p>
        </main>
      </div>
    );
  }

  const empresa = await prisma.empresa.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      razaoSocial: true,
    },
  });

  if (!empresa) {
    return (
      <div className="page-root">
        <main className="container">
          <p>Empresa não encontrada.</p>
        </main>
      </div>
    );
  }

  const relatorios = await prisma.empresaRelatorio.findMany({
    where: {
      idEmpresa: companyId,
      deleted: null,
      ativo: 1,
    },
    orderBy: {
      dataPublicacao: 'desc',
    },
    select: {
      id: true,
      titulo: true,
      dataPublicacao: true,
    },
  });

  // Normaliza datas para string (opcional)
  const safeReports = relatorios.map(r => ({
    id: r.id,
    titulo: r.titulo,
    dataPublicacao: r.dataPublicacao ? r.dataPublicacao.toISOString() : null,
  }));

  return (
    <CompanyReportsPageClient
      companyId={empresa.id}
      companyName={empresa.razaoSocial}
      initialReports={safeReports}
    />
  );
}
