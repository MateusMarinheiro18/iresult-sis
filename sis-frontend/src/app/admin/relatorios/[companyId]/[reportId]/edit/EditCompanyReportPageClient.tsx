// src/app/admin/relatorios/[companyId]/[reportId]/EditCompanyReportPageClient.tsx
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import ReportEditForm from '@/components/admin/reports/ReportEditForm';

export default function EditCompanyReportPageClient({
  companyId,
  companyName,
  initialReport,
}: {
  companyId: number;
  companyName?: string | null;
  initialReport: { id: number; titulo: string; texto?: string | null; dataPublicacao?: string | null };
}) {
  const router = useRouter();

  return (
    <div className="page-root">
      <main className="container">
        <div className="header-row">
          <div>
            <h1 className="title">EDITAR RELATÓRIO{companyName ? ` - ${companyName}` : ''}</h1>
          </div>

          <button
            className="back-btn"
            onClick={() => router.push(`/admin/relatorios/${companyId}`)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span>Voltar</span>
          </button>
        </div>

        <div className="card">
          <div className="card-header">
            <h2>Editar relatório</h2>
          </div>
          <div className="card-body">
            <ReportEditForm
              companyId={companyId}
              reportId={initialReport.id}
              initial={initialReport}
            />
          </div>
        </div>
      </main>

      <style jsx>{`
        /* reutiliza estilos já vistos (igual New page) */
        .page-root { padding: 24px; background: #f3f4ff; min-height: 100vh; box-sizing: border-box; }
        .container { max-width: 1180px; margin: 0 auto; }
        .header-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; gap:12px; flex-wrap:wrap; }
        .title { font-size:20px; font-weight:700; color:#421E97; margin:0; }
        .subtitle { margin:4px 0 0; font-size:13px; color:#4b5563; }
        .back-btn { display:inline-flex; align-items:center; gap:6px; color:#421E97; border:none; border-radius:8px; font-size:14px; font-weight:600; padding:8px 14px; cursor:pointer; background:transparent; }
        .card { background:#fff; border-radius:14px; box-shadow:0 6px 18px rgba(11,37,39,0.06); overflow:hidden; }
        .card-header { background:#421E97; padding:18px 24px; }
        .card-header h2 { color:#fff; margin:0; font-size:16px; font-weight:700; }
        .card-body { padding:20px 24px 24px; }
        @media (max-width:640px) { .container{padding:8px;} .header-row{flex-direction:column; align-items:flex-start;} .back-btn{width:100%; justify-content:center;} .card-body{padding:16px;} }
      `}</style>
    </div>
  );
}
