// src/app/admin/trilhas/TrilhasPageClient.tsx
'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import TrilhasTable, {
  TrilhaRow,
} from '@/components/admin/trilhas/TrilhasTable';

const ITEMS_PER_PAGE = 5;

type Props = {
  initialData: TrilhaRow[];
};

export default function TrilhasPageClient({ initialData }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // filtra por nome - case insensitive
  const filtered = useMemo(() => {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return initialData;
    return initialData.filter((t) => (t.nome ?? '').toLowerCase().includes(q));
  }, [initialData, query]);

  // Reseta para página 1 quando a busca muda
  useMemo(() => {
    setCurrentPage(1);
  }, [query]);

  // Cálculos de paginação
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentItems = filtered.slice(startIndex, endIndex);

  // Números de página visíveis (máximo 3)
  const visiblePages = useMemo(() => {
    const pages: number[] = [];
    let start = Math.max(1, currentPage - 1);
    let end = Math.min(totalPages, start + 2);

    if (end - start < 2) {
      start = Math.max(1, end - 2);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }, [currentPage, totalPages]);

  function handleDetails(id: number) {
    router.push(`/admin/trilhas/${id}`);
  }

  function handleNew() {
    router.push('/admin/trilhas/new');
  }

  return (
    <div className="page-root">
      <main className="container">
        <header className="header-row">
          <div>
            <h1 className="page-title">Trilhas</h1>
            <p className="page-subtitle">
              Visualize e gerencie todas as trilhas cadastradas.
            </p>
          </div>
        </header>

        <div className="wrapper">
          <div className="controls-row">
            <div className="search-box" role="search" aria-label="Buscar trilha por nome">
              <div className="search-icon" aria-hidden>
                {/* lupa SVG */}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M21 21l-4.35-4.35"
                    stroke="#6B7280"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle
                    cx="11"
                    cy="11"
                    r="6"
                    stroke="#6B7280"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <input
                className="search-input"
                placeholder="Buscar trilha"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Buscar trilhas por nome"
              />
            </div>

            <div className="right-actions">
              <button className="btn-new" onClick={handleNew}>
                Nova Trilha
              </button>
            </div>
          </div>

          {/* Tabela de trilhas */}
          <TrilhasTable items={currentItems} onDetails={handleDetails} />

          {/* Paginação */}
          {totalItems > 0 && (
            <div className="pagination-wrapper">
              <div className="pagination-info">
                Mostrando {startIndex + 1}-{Math.min(endIndex, totalItems)} de{' '}
                {totalItems} {totalItems === 1 ? 'trilha' : 'trilhas'}
              </div>

              <div className="pagination-controls">
                {/* Botão Anterior */}
                <button
                  className="page-arrow"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  aria-label="Página anterior"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M15 18l-6-6 6-6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                {/* Números de página */}
                <div className="page-numbers">
                  {visiblePages.map((page) => (
                    <button
                      key={page}
                      className={`page-number ${
                        currentPage === page ? 'active' : ''
                      }`}
                      onClick={() => setCurrentPage(page)}
                      aria-label={`Página ${page}`}
                      aria-current={currentPage === page ? 'page' : undefined}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                {/* Botão Próximo */}
                <button
                  className="page-arrow"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  aria-label="Próxima página"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M9 18l6-6-6-6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <style jsx>{`
        .page-root {
          width: 100%;
        }

        .container {
          max-width: 1120px;
          margin: 0 auto;
          padding: 24px 16px 40px;
        }

        .header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
        }

        .page-title {
          font-size: 1.6rem;
          font-weight: 600;
          color: #111827;
          margin: 0 0 4px;
        }

        .page-subtitle {
          font-size: 14px;
          color: #6b7280;
          margin: 0;
        }

        .wrapper {
          display: block;
          gap: 12px;
        }

        .controls-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 18px;
          gap: 12px;
        }

        .search-box {
          display: flex;
          align-items: center;
          background: #fff;
          padding: 8px 12px;
          border-radius: 999px;
          box-shadow: 0 2px 8px rgba(11, 37, 39, 0.04);
          border: 1px solid rgba(11, 37, 39, 0.04);
          min-width: 220px;
          max-width: 520px;
          width: 100%;
          box-sizing: border-box;
        }

        .search-icon {
          display: inline-flex;
          margin-right: 10px;
          align-items: center;
          justify-content: center;
        }

        .search-input {
          border: none;
          outline: none;
          font-size: 14px;
          flex: 1;
          color: #111827;
          background: transparent;
        }
        .search-input::placeholder {
          color: #9ca3af;
        }

        .right-actions {
          display: flex;
          gap: 8px;
        }

        .btn-new {
          background: transparent;
          border: 1px solid #421E97;
          color: #421E97;
          padding: 8px 14px;
          border-radius: 999px;
          text-decoration: none;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-new:hover {
          background: #421E97;
          color: white;
        }

        /* Paginação */
        .pagination-wrapper {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 20px;
          padding: 0 4px;
        }

        .pagination-info {
          font-size: 14px;
          color: #6b7280;
          font-weight: 500;
        }

        .pagination-controls {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .page-arrow {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 8px;
          cursor: pointer;
          color: #6b7280;
          transition: all 0.2s ease;
          border: 1px solid transparent;
          background: transparent;
        }

        .page-arrow:hover:not(:disabled) {
          background: #f9fafb;
          border-color: #d1d5db;
        }

        .page-arrow:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .page-numbers {
          display: flex;
          gap: 6px;
        }

        .page-number {
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 36px;
          height: 36px;
          padding: 0 8px;
          border: 1px solid #e5e7eb;
          background: white;
          border-radius: 100%;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          transition: all 0.2s ease;
        }

        .page-number:hover {
          background: #f9fafb;
          border-color: #d1d5db;
        }

        .page-number.active {
          background: #421E97;
          color: white;
          border-color: #421E97;
        }

        /* Responsive */
        @media (max-width: 960px) {
          .controls-row {
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
          }
          .search-box {
            max-width: 100%;
          }
          .right-actions {
            justify-content: flex-end;
          }

          .pagination-wrapper {
            flex-direction: column;
            gap: 16px;
            align-items: center;
          }

          .pagination-info {
            order: 2;
          }

          .pagination-controls {
            order: 1;
          }
        }
      `}</style>
    </div>
  );
}
