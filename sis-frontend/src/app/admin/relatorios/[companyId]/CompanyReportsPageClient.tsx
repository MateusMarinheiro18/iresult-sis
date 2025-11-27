'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

import CompanyReportsHeader from '@/components/admin/reports/CompanyReportsHeader';
import SearchBox from '@/components/admin/reports/SearchBox';
import ReportsGrid from '@/components/admin/reports/ReportsGrid';
import EmptyState from '@/components/admin/reports/EmptyState';

type Report = {
  id: number;
  titulo: string;
  dataPublicacao?: string | null;
};

export default function CompanyReportsPageClient({
  companyId,
  companyName,
  initialReports,
}: {
  companyId: number;
  companyName?: string | null;
  initialReports?: Report[];
}) {
  const router = useRouter();

  const [reports, setReports] = useState<Report[]>(
    Array.isArray(initialReports) ? initialReports : []
  );
  const [query, setQuery] = useState('');

  const filteredReports = useMemo(() => {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return reports;
    return reports.filter((r) => (r.titulo ?? '').toLowerCase().includes(q));
  }, [reports, query]);

  function handleOpenReport(reportId: number) {
    router.push(`/admin/relatorios/${companyId}/${reportId}`);
  }

  function handleNewReport() {
    router.push(`/admin/relatorios/${companyId}/new`);
  }

  function handleEditReport(reportId: number) {
    router.push(`/admin/relatorios/${companyId}/${reportId}/edit`);
  }

  // delete handler: used by ReportCard (optimistic local update + toast)
  async function handleDeleteReport(reportId: number) {
    const loadingId = toast.loading('Excluindo relatório…');
    try {
      const res = await fetch(`/api/companies/${companyId}/reports/${reportId}`, {
        method: 'DELETE',
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || 'Erro ao excluir relatório');
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      toast.success(body?.message || 'Relatório excluído com sucesso', { id: loadingId });
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Erro ao excluir relatório', { id: loadingId });
    }
  }

  return (
    <div className="page-root">
      <main className="container">
        <CompanyReportsHeader
          title="RELATÓRIOS"
          onBack={() => router.push('/admin/relatorios')}
        />

        <div className="card-body">
          {reports.length === 0 ? (
            <EmptyState onNew={handleNewReport} />
          ) : (
            <>
              <div className="controls-row">
                <SearchBox value={query} onChange={(v) => setQuery(v)} placeholder="Buscar relatório" />
                <div className="right-actions">
                  <button className="btn-new-report" onClick={handleNewReport}>
                    Novo Relatório
                  </button>
                </div>
              </div>

              <ReportsGrid
                reports={filteredReports}
                onOpen={handleOpenReport}
                onEdit={handleEditReport}
                onDelete={handleDeleteReport}
              />
            </>
          )}
        </div>
      </main>

      <style jsx>{`
        .page-root { padding: 24px; background: #f3f4ff; box-sizing: border-box; min-height: 100vh; }
        .container { max-width: 1180px; margin: 0 auto; }

        .card-body { margin-top: 8px; }

        .controls-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          gap: 12px;
          flex-wrap: wrap;
        }

        .btn-new-report {
          background: #0b2527;
          color: #fff;
          border-radius: 999px;
          border: none;
          padding: 8px 18px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
        }

        @media (max-width: 640px) {
          .container { padding: 8px; }
          .controls-row { flex-direction: column; align-items: stretch; }
          .right-actions { justify-content: flex-start; }
        }
      `}</style>
    </div>
  );
}
