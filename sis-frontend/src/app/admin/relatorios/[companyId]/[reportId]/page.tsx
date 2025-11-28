// src/app/admin/relatorios/[companyId]/[reportId]/page.tsx
import React from 'react';
import { prisma } from '@/lib/prisma';
import ReportViewCard from '@/components/admin/reports/ReportViewCard';

type Props = {
  params: Promise<{ companyId: string; reportId: string }> | { companyId: string; reportId: string };
};

export default async function ReportViewPage(props: Props) {
  const resolved = await props.params;
  const companyId = Number(resolved.companyId);
  const reportId = Number(resolved.reportId);

  if (Number.isNaN(companyId) || Number.isNaN(reportId)) {
    return <div style={{ padding: 24 }}>Parâmetros inválidos.</div>;
  }

  const empresa = await prisma.empresa.findUnique({
    where: { id: companyId },
    select: { id: true, razaoSocial: true },
  });

  if (!empresa) {
    return <div style={{ padding: 24 }}>Empresa não encontrada.</div>;
  }

  const rel = await prisma.empresaRelatorio.findFirst({
    where: { id: reportId, idEmpresa: companyId, deleted: null, ativo: 1 },
    select: { id: true, titulo: true, texto: true, dataPublicacao: true, created: true, updated: true },
  });

  if (!rel) {
    return <div style={{ padding: 24 }}>Relatório não encontrado.</div>;
  }

  const initialReport = {
    ...rel,
    dataPublicacao: rel.dataPublicacao ? rel.dataPublicacao.toISOString() : null,
    created: rel.created ? rel.created.toISOString() : null,
    updated: rel.updated ? rel.updated.toISOString() : null,
  };

  return (
    <ReportViewCard
      companyId={empresa.id}
      companyName={empresa.razaoSocial}
      initialReport={initialReport}
    />
  );
}
