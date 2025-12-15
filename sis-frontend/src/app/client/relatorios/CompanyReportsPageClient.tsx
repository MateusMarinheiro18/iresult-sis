'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type Report = {
  id: number;
  titulo: string;
  dataPublicacao?: string | null;
};

function formatDateToBR(iso?: string | null) {
  if (!iso) return '';
  const datePart = String(iso).split('T')[0];
  const m = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return '';
  return `${m[3]}/${m[2]}/${m[1]}`;
}

export default function CompanyReportsPageClient() {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('/api/client/reports', { credentials: 'include' });
        if (!res.ok) {
          const txt = await res.text().catch(() => '');
          throw new Error(txt || `${res.status} ${res.statusText}`);
        }
        const json = await res.json();
        if (!mounted) return;
        // Expect an array of reports
        if (Array.isArray(json)) {
          setReports(json);
        } else if (Array.isArray(json.items)) {
          setReports(json.items);
        } else {
          setReports([]);
        }
      } catch (err: any) {
        console.error('Erro carregando relatórios (client):', err);
        if (!mounted) return;
        setError(err?.message ?? 'Erro ao carregar relatórios');
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return reports;
    return reports.filter((r) => (r.titulo ?? '').toLowerCase().includes(q));
  }, [reports, query]);

  function handleOpenReport(id: number) {
    // Cliente: abrir página de relatório — você pode ajustar a rota conforme necessário
    router.push(`/client/relatorios/${id}`);
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

  if (error) {
    return (
      <div className="page-root">
        <main className="container">
          <div style={{ padding: 24, background: '#fff', borderRadius: 12 }}>
            <h2>Erro</h2>
            <p style={{ color: '#a00' }}>{error}</p>
          </div>
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
        <div className="header-row">
          <h1 className="title">RELATÓRIOS</h1>
        </div>

        <div className="card-body">
          {filtered.length === 0 ? (
            <div className="empty">
              <p>Nenhum relatório disponível.</p>
            </div>
          ) : (
            <>
              <div className="controls-row">
                <div className="search-box" role="search" aria-label="Buscar relatório">
                  <input className="search-input" placeholder="Buscar relatório" value={query} onChange={(e) => setQuery(e.target.value)} />
                </div>
              </div>

              <div className="reports-grid">
                {filtered.map((r) => (
                  <div key={r.id} className="report-card">
                    <div className="report-title">{r.titulo}</div>
                    <div className="report-meta">{formatDateToBR(r.dataPublicacao)}</div>
                    <div className="report-actions">
                      <button className="btn-view" onClick={() => handleOpenReport(r.id)}>Abrir</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      <style jsx>{`
        .page-root { padding: 24px; background: #f3f4ff; box-sizing: border-box; min-height: 100vh; }
        .container { max-width: 1180px; margin: 0 auto; }

        .header-row { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom: 12px; }
        .title { font-size:20px; font-weight:700; color:#0b2527; margin:0; }

        .card-body { margin-top: 8px; }

        .controls-row { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; gap:12px; flex-wrap:wrap; }
        .search-box { max-width: 520px; width: 100%; background: #fff; padding: 8px 12px; border-radius: 999px; box-shadow: 0 2px 8px rgba(11,37,39,0.04); border: 1px solid rgba(11,37,39,0.04); }
        .search-input { border: none; outline: none; font-size: 14px; width: 100%; background: transparent; }

        .reports-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; margin-top: 8px; }
        .report-card { background: #fff; border-radius: 12px; padding: 16px; box-shadow: 0 6px 18px rgba(11,37,39,0.06); display:flex; flex-direction:column; gap:8px; }
        .report-title { font-weight:700; color:#111827; }
        .report-meta { color:#6b7280; font-size:13px; }
        .report-actions { margin-top:auto; display:flex; justify-content:flex-end; }
        .btn-view { background: transparent; border: 1px solid #0b2527; color: #0b2527; padding: 6px 12px; border-radius: 999px; font-weight:700; cursor:pointer; }
        .btn-view:hover { background:#0b2527; color:#fff; }

        .empty { background:#fff; padding:24px; border-radius:12px; box-shadow:0 6px 18px rgba(11,37,39,0.06); text-align:center; color:#6b7280; }

        @media (max-width: 640px) {
          .container { padding: 8px; }
          .reports-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
