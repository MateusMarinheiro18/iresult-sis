// src/app/client/trilhas/[id]/TrilhaDetailPageClient.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type TrilhaItem = {
  id: number;
  nome: string;
  tipo?: string | null;
  data?: string | null; // ISO or yyyy-mm-dd
  detalhes?: string | null;
};

type EmpresaView = { id: number; razaoSocial: string };

type ApiResponse = {
  trilha?: {
    id: number;
    nome: string;
    ativo: number | boolean;
    dataCriacao?: string | null;
    itens: TrilhaItem[];
  } | null;
  empresas?: EmpresaView[];
  error?: string;
};

function formatDateToBR(dateStr?: string | null) {
  if (!dateStr) return '';
  const datePart = String(dateStr).split('T')[0];
  const m = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return '';
  const [, yyyy, mm, dd] = m;
  return `${dd}/${mm}/${yyyy}`;
}

export default function TrilhaDetailPageClient({ trilhaId }: { trilhaId: number }) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trilha, setTrilha] = useState<ApiResponse['trilha'] | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);
      setError(null);

      try {
        const resMe = await fetch('/api/rh/me', { credentials: 'include' });
        if (!resMe.ok) {
          if (!mounted) return;
          setError('Não foi possível identificar sua empresa (sessão).');
          setLoading(false);
          return;
        }
        const meJson = await resMe.json();
        const empresaIdRaw = meJson?.data?.empresaId ?? meJson?.empresaId ?? null;
        if (!empresaIdRaw) {
          if (!mounted) return;
          setError('Sua conta não está vinculada a uma empresa.');
          setLoading(false);
          return;
        }
        const empresaIdNum = Number(empresaIdRaw);

        const res = await fetch(`/api/client/trilhas/${trilhaId}?empresaId=${empresaIdNum}`, { credentials: 'include' });
        if (!res.ok) {
          const txt = await res.text().catch(() => '');
          throw new Error(txt || `${res.status} ${res.statusText}`);
        }

        const json: ApiResponse = await res.json();
        if (json?.error) throw new Error(json.error);
        if (!mounted) return;
        setTrilha(json.trilha ?? null);
      } catch (err: any) {
        console.error('Erro carregando detalhe da trilha (client):', err);
        if (!mounted) return;
        setError(err?.message ?? 'Erro ao carregar trilha');
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [trilhaId]);

  const itensOrdenados = useMemo(() => {
    if (!trilha?.itens) return [];
    const arr = [...trilha.itens];
    arr.sort((a, b) => {
      const ad = a.data ? new Date(a.data).getTime() : 0;
      const bd = b.data ? new Date(b.data).getTime() : 0;
      return ad - bd;
    });
    return arr;
  }, [trilha]);

  if (loading) {
    return (
      <div style={{ minHeight: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#666' }}>Carregando trilha...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Erro</h2>
        <p style={{ color: '#a00' }}>{error}</p>
      </div>
    );
  }

  if (!trilha) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Trilha não encontrada</h2>
      </div>
    );
  }

  return (
    <div className="page-root">
      <main className="container">
        {/* Header no estilo solicitado */}
        <div className="header-row">
          <h1 className="title">{trilha.nome.toUpperCase()}</h1>

          <button
            className="back-btn"
            onClick={() => router.push('/client/trilhas')}
            aria-label="Voltar"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span>Voltar</span>
          </button>
        </div>

        {/* Subtítulo / meta */}
        <div style={{ marginBottom: 18 }}>
          <div className="meta">Criada em {formatDateToBR(trilha.dataCriacao) || '—'}</div>
        </div>

        {/* Eventos em tabela */}
        <section className="card">
          <div className="card-header">
            <h2>Eventos da trilha</h2>
            <p className="card-sub">Cadastre os eventos (workshops, encontros, comunicações) que fazem parte desta trilha.</p>
          </div>

          <div className="card-body">
            <div className="table-scroll">
              <table className="events-table" cellPadding={0} cellSpacing={0}>
                <thead>
                  <tr>
                    <th>Nome do evento</th>
                    <th>Tipo</th>
                    <th>Data</th>
                    <th>Detalhes</th>
                  </tr>
                </thead>
                <tbody>
                  {itensOrdenados.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="no-results">Nenhum evento cadastrado.</td>
                    </tr>
                  ) : (
                    itensOrdenados.map((it) => (
                      <tr key={it.id}>
                        <td className="cell name-cell">{it.nome ?? '—'}</td>
                        <td className="cell type-cell">{it.tipo ?? '—'}</td>
                        <td className="cell date-cell">{formatDateToBR(it.data) || '—'}</td>
                        <td className="cell details-cell">{it.detalhes ?? '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>

      <style jsx>{`
        .page-root {
          padding: 24px;
          background: #f3f4ff;
          box-sizing: border-box;
          min-height: 100vh;
        }

        .container {
          max-width: 1180px;
          margin: 0 auto;
        }

        /* HEADER */
        .header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .title {
          font-size: 1.6rem;
          font-weight: 600;
          color: #111827;
          margin: 0;
        }

        .back-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #421E97;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          padding: 8px 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          background: transparent;
        }

        .back-btn svg {
          stroke: #421E97;
        }

        .meta {
          font-size: 13px;
          color: #6b7280;
        }

        /* CARD */
        .card {
          background: #fff;
          border-radius: 14px;
          box-shadow: 0 6px 18px rgba(11, 37, 39, 0.06);
          overflow: hidden;
        }

        .card-header {
          background: #421E97;
          padding: 18px 24px;
        }

        .card-header h2 {
          color: #fff;
          margin: 0;
          font-size: 16px;
          font-weight: 700;
        }

        .card-sub {
          color: rgba(255,255,255,0.85);
          margin: 8px 0 0;
          font-size: 13px;
          opacity: 0.95;
        }

        .card-body {
          padding: 16px;
        }

        .table-scroll { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; border-radius: 8px; }
        table.events-table { width: 100%; border-collapse: collapse; min-width: 700px; }
        thead th { text-align: left; padding: 14px 16px; font-size: 13px; font-weight: 700; color: #374151; background: #fafafa; border-bottom: 1px solid rgba(11,37,39,0.06); text-transform: uppercase; }
        tbody tr { border-bottom: 1px solid rgba(11,37,39,0.04); }
        .cell { padding: 14px 16px; vertical-align: middle; font-size: 14px; color: #333; }
        .name-cell { font-weight: 700; color: #111827; }
        .type-cell { color: #374151; }
        .date-cell { color: #374151; white-space: nowrap; }
        .details-cell { color: #374151; }
        .no-results { text-align:center; padding: 20px; color: #6b7280; }

        @media (max-width: 640px) {
          .container { padding: 8px; }
          .back-btn { width: 100%; justify-content: center; }
          .card-body { padding: 12px; }
          table.events-table { min-width: 600px; }
        }
      `}</style>
    </div>
  );
}
