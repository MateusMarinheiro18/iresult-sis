import React from 'react';
import { prisma } from '@/lib/prisma';
import ReportViewCard from '@/components/admin/reports/ReportViewCard';
import PdfReportViewCard from '@/components/admin/reports/PdfReportViewCard';

type Props = {
  params:
    | Promise<{ companyId: string; reportId: string }>
    | { companyId: string; reportId: string };
};

export default async function ReportPage(props: Props) {
  const resolvedParams = await props.params;
  const companyIdStr = resolvedParams?.companyId;
  const reportIdStr = resolvedParams?.reportId;

  const companyId = companyIdStr ? Number(companyIdStr) : NaN;
  const reportId = reportIdStr ? Number(reportIdStr) : NaN;

  if (
    Number.isNaN(companyId) ||
    companyId <= 0 ||
    Number.isNaN(reportId) ||
    reportId <= 0
  ) {
    return (
      <div className="page-root">
        <main className="container">
          <p>Parâmetros inválidos.</p>
        </main>
      </div>
    );
  }

  const empresa = await prisma.empresa.findUnique({
    where: { id: companyId },
    select: { id: true, razaoSocial: true },
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

  const report = await prisma.empresaRelatorio.findUnique({
    where: { id: reportId },
    select: {
      id: true,
      idEmpresa: true,
      titulo: true,
      texto: true,
      dataPublicacao: true,
      created: true,
      updated: true,
      fileKey: true,
      deleted: true,
      ativo: true,
    },
  });

  if (
    !report ||
    report.idEmpresa !== empresa.id ||
    report.deleted !== null ||
    report.ativo === 0
  ) {
    return (
      <div className="page-root">
        <main className="container">
          <p>Relatório não encontrado.</p>
        </main>
      </div>
    );
  }

  const safeReport = {
    id: report.id,
    titulo: report.titulo,
    texto: report.texto,
    dataPublicacao: report.dataPublicacao
      ? report.dataPublicacao.toISOString()
      : null,
    created: report.created ? report.created.toISOString() : null,
    updated: report.updated ? report.updated.toISOString() : null,
  };

  // 🔍 Se tiver fileKey => é relatório com PDF -> mostra preview
  if (report.fileKey) {
    return (
      <PdfReportViewCard
        companyId={empresa.id}
        companyName={empresa.razaoSocial}
        reportId={report.id}
        titulo={report.titulo}
      />
    );
  }

  // Caso contrário, relatório manual em texto
  return (
    <ReportViewCard
      companyId={empresa.id}
      companyName={empresa.razaoSocial}
      initialReport={safeReport}
    />
  );
}
