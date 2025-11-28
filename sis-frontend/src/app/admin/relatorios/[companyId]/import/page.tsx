import React from 'react';
import { prisma } from '@/lib/prisma';
import ImportReportPageClient from './ImportReportPageClient';

type Props = {
  params: Promise<{ companyId: string }> | { companyId: string };
};

export default async function ImportReportPage(props: Props) {
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
    <ImportReportPageClient
      companyId={empresa.id}
      companyName={empresa.razaoSocial}
    />
  );
}
