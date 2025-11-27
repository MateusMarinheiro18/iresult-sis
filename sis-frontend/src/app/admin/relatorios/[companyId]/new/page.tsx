// src/app/admin/relatorios/[companyId]/new/page.tsx
import React from 'react';
import { prisma } from '@/lib/prisma';
import NewCompanyReportPageClient from './NewCompanyReportPageClient';

type Props = {
  params: Promise<{ companyId: string }> | { companyId: string };
};

export default async function NewCompanyReportPage(props: Props) {
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

  return (
    <NewCompanyReportPageClient
      companyId={empresa.id}
      companyName={empresa.razaoSocial}
    />
  );
}
