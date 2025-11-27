// src/app/admin/relatorios/[companyId]/[reportId]/edit/page.tsx
import React from 'react';
import { prisma } from '@/lib/prisma';
import EditCompanyReportPageClient from './EditCompanyReportPageClient';

type Props = {
  params: Promise<{ companyId: string; reportId: string }> | { companyId: string; reportId: string };
};

export default async function EditCompanyReportPage(props: Props) {
  const resolved = await props.params;
  const companyId = resolved ? Number(resolved.companyId) : NaN;
  const reportId = resolved ? Number(resolved.reportId) : NaN;

  if (Number.isNaN(companyId) || Number.isNaN(reportId)) {
    return <div className="page-root"><main className="container"><p>Parâmetros inválidos.</p></main></div>;
  }

  const empresa = await prisma.empresa.findUnique({
    where: { id: companyId },
    select: { id: true, razaoSocial: true },
  });

  if (!empresa) {
    return <div className="page-root"><main className="container"><p>Empresa não encontrada.</p></main></div>;
  }

  const rel = await prisma.empresaRelatorio.findFirst({
    where: { id: reportId, idEmpresa: companyId, deleted: null },
    select: { id: true, titulo: true, texto: true, dataPublicacao: true },
  });

  if (!rel) {
    return <div className="page-root"><main className="container"><p>Relatório não encontrado.</p></main></div>;
  }

  const safeReport = { ...rel, dataPublicacao: rel.dataPublicacao ? rel.dataPublicacao.toISOString() : null };

  return (
    <EditCompanyReportPageClient
      companyId={empresa.id}
      companyName={empresa.razaoSocial}
      initialReport={safeReport}
    />
  );
}
