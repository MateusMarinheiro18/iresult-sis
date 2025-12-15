'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import CompanyReportsHeader from '@/components/client/reports/CompanyReportsHeader';
import SearchBoxClient from '@/components/client/reports/SearchBoxClient';
import ReportsGridClient from '@/components/client/reports/ReportsGridClient';
import EmptyStateClient from '@/components/client/reports/EmptyStateClient';

type Report = {
  id: number;
  titulo: string;
  dataPublicacao?: string | null;
};

export default function CompanyReportsPageClient() {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/client/reports', { credentials: 'include' });
        if (!res.ok) {
          const payload = await res.json().catch(() => null);
          throw new Error(payload?.error || payload?.message || `${res.status} ${res.statusText}`);
        }
        const data = await res.json();
        // expect array of reports
        const arr = Array.isArray(data) ? data : data?.items ?? [];
        if (mounted) setReports(arr);
      } catch (err: any) {
        console.error('Erro ao carregar relatórios (client):', err);
        if (mounted) setError(err?.message ?? 'Erro ao carregar relatórios');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const filteredReports = useMemo(() => {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return reports;
    return reports.filter((r) => (r.titulo ?? '').toLowerCase().includes(q));
  }, [reports, query]);

  function handleOpen(reportId: number) {
    router.push(`/client/relatorios/${reportId}`);
  }

  if (loading) {
    return (
      <div className="page-root">
        <main className="container">
          <div style={{ padding: 24, textAlign: 'center' }}>Carregando relatórios...</div>
        </main>
        <style jsx>{`
          .page-root { padding: 24px; background: #f3f4ff; min-height: 100vh; box-sizing: border-box; }
          .container { max-width: 1180px; margin: 0 auto; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="page-root">
      <main className="container">
        <CompanyReportsHeader title="RELATÓRIOS" onBack={() => router.push('/client')} />

        <div className="card-body">
          {reports.length === 0 ? (
            <EmptyStateClient />
          ) : (
            <>
              <div className="controls-row">
                <SearchBoxClient value={query} onChange={(v) => setQuery(v)} placeholder="Buscar relatório" />
                <div className="right-actions" />
              </div>

              <ReportsGridClient reports={filteredReports} onOpen={handleOpen} />
            </>
          )}
        </div>
      </main>

      <style jsx>{`
        .page-root { padding: 24px; background: #f3f4ff; box-sizing: border-box; min-height: 100vh; }
        .container { max-width: 1180px; margin: 0 auto; }

        .card-body { margin-top: 8px; }

        .controls-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; gap:12px; flex-wrap:wrap; }
        .right-actions { display:flex; align-items:center; justify-content:flex-end; }

        @media (max-width: 640px) {
          .container { padding: 8px; }
          .controls-row { flex-direction: column; align-items: stretch; }
        }
      `}</style>
    </div>
  );
}
