// src/components/admin/escalas/EscalaEmpresasTable.tsx
'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';

export type EmpresaForEscala = {
  id: number;
  razaoSocial?: string | null;
  cnpj?: string | null;
  telefone?: string | null;
};

type Props = {
  // NOVO: id da escala atual, para montar o link do formulário
  escalaId: number;
  items: EmpresaForEscala[];
  selectedIds: Set<number>;
  onToggle: (id: number) => void;
};

const ITEMS_PER_PAGE = 5;

export default function EscalaEmpresasTable({
  escalaId,
  items,
  selectedIds,
  onToggle,
}: Props) {
  const [query, setQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((e) => {
      const nome = (e.razaoSocial ?? '').toLowerCase();
      const cnpj = (e.cnpj ?? '').toLowerCase();
      return nome.includes(q) || cnpj.includes(q);
    });
  }, [items, query]);

  // reset page quando muda filtro
  useMemo(() => {
    setCurrentPage(1);
  }, [query]);

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentItems = filtered.slice(startIndex, endIndex);

  const visiblePages = useMemo(() => {
    const pages: number[] = [];
    let start = Math.max(1, currentPage - 1);
    let end = Math.min(totalPages, start + 2);
    if (end - start < 2) {
      start = Math.max(1, end - 2);
    }
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }, [currentPage, totalPages]);

  return (
    <div className="wrapper">
      <div className="controls-row">
        <div className="search-box" role="search" aria-label="Buscar empresa">
          <div className="search-icon" aria-hidden>
            {/* lupa */}
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
            placeholder="Buscar por nome ou CNPJ"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="table-scroll">
        <table className="empresas-table" cellPadding={0} cellSpacing={0}>
          <thead>
            <tr>
              <th className="col-check" />
              <th className="col-name">Empresa</th>
              <th className="col-cnpj">CNPJ</th>
              <th className="col-phone">Telefone</th>
              {/* NOVO: coluna para abrir o formulário */}
              <th className="col-form">Formulário</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.map((c) => (
              <tr key={c.id}>
                <td className="cell check-cell">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(c.id)}
                    onChange={() => onToggle(c.id)}
                    aria-label={`Vincular empresa ${c.razaoSocial ?? ''}`}
                  />
                </td>
                <td className="cell name-cell">{c.razaoSocial ?? '—'}</td>
                <td className="cell cnpj-cell">{formatCnpj(c.cnpj)}</td>
                <td className="cell phone-cell">{formatPhone(c.telefone)}</td>

                {/* NOVO: link de teste para o formulário */}
                <td className="cell form-cell">
                  <Link
                    href={`/web/escala?escala=${escalaId}&empresa=${c.id}`}
                    target="_blank"
                    className="form-link"
                  >
                    Abrir formulário
                  </Link>
                </td>
              </tr>
            ))}

            {currentItems.length === 0 && (
              <tr>
                {/* +1 na contagem de colunas por causa da nova coluna Formulário */}
                <td colSpan={5} className="no-results">
                  Nenhuma empresa encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalItems > 0 && (
        <div className="pagination-wrapper">
          <div className="pagination-info">
            Mostrando {startIndex + 1}-{Math.min(endIndex, totalItems)} de{' '}
            {totalItems} {totalItems === 1 ? 'empresa' : 'empresas'}
          </div>

          <div className="pagination-controls">
            <button
              className="page-arrow"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
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

            <div className="page-numbers">
              {visiblePages.map((page) => (
                <button
                  key={page}
                  className={`page-number ${
                    currentPage === page ? 'active' : ''
                  }`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              className="page-arrow"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
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

      <style jsx>{`
        .wrapper {
          display: block;
        }

        .controls-row {
          display: flex;
          justify-content: flex-start;
          align-items: center;
          margin-bottom: 12px;
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
          max-width: 420px;
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

        .table-scroll {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          border-radius: 12px;
          background: #fff;
          box-shadow: 0 6px 18px rgba(11, 37, 39, 0.06);
          margin-bottom: 16px;
        }

        table.empresas-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 720px;
        }

        thead th {
          text-align: left;
          padding: 14px 18px;
          font-size: 12px;
          font-weight: 700;
          color: #374151;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          border-bottom: 1px solid rgba(11, 37, 39, 0.08);
          white-space: nowrap;
          background: #fafafa;
        }

        .col-check {
          width: 40px;
          padding-left: 24px;
        }
        .col-name {
          min-width: 220px;
        }
        .col-form {
          width: 130px;
          text-align: center;
        }

        tbody tr {
          border-bottom: 1px solid rgba(11, 37, 39, 0.04);
          transition: background 0.15s ease;
        }

        tbody tr:hover {
          background: rgba(11, 37, 39, 0.02);
        }

        .cell {
          padding: 14px 18px;
          vertical-align: middle;
          font-size: 14px;
          color: #333;
        }

        .check-cell {
          padding-left: 24px;
        }

        .name-cell {
          font-weight: 600;
          color: #111827;
        }

        .cnpj-cell {
          color: #6b7280;
          font-family: monospace;
        }

        .phone-cell {
          white-space: nowrap;
        }

        .form-cell {
          text-align: center;
        }

        .form-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 6px 12px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
          text-decoration: none;
          color: #0b2527;
          border: 1px solid #0b2527;
          transition: all 0.2s ease;
        }

        .form-link:hover {
          background: #0b2527;
          color: #ffffff;
        }

        .no-results {
          text-align: center;
          padding: 24px;
          color: #6b7280;
        }

        .pagination-wrapper {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 4px;
          padding: 0 4px;
        }

        .pagination-info {
          font-size: 13px;
          color: #6b7280;
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
          width: 32px;
          height: 32px;
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
          min-width: 32px;
          height: 32px;
          padding: 0 8px;
          border: 1px solid #e5e7eb;
          background: white;
          border-radius: 999px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 600;
          color: #374151;
          transition: all 0.2s ease;
        }

        .page-number:hover {
          background: #f9fafb;
          border-color: #d1d5db;
        }

        .page-number.active {
          background: #0b2527;
          color: white;
          border-color: #0b2527;
        }

        @media (max-width: 960px) {
          table.empresas-table {
            min-width: 680px;
          }

          .pagination-wrapper {
            flex-direction: column;
            gap: 10px;
            align-items: center;
          }
        }
      `}</style>
    </div>
  );
}

/* helpers iguais aos que você já usa em CompaniesTable */
function formatCnpj(c?: string | null) {
  if (!c) return '—';
  const digits = String(c).replace(/\D/g, '');
  if (digits.length !== 14) return c;
  return digits.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5'
  );
}

function formatPhone(p?: string | null) {
  if (!p) return '—';
  const digits = String(p).replace(/\D/g, '');
  if (digits.length < 8) return p;

  let country = '';
  let rest = digits;

  if (digits.length > 11) {
    const countryLen = digits.length - 11;
    country = digits.slice(0, countryLen);
    rest = digits.slice(countryLen);
  }

  if (rest.length < 8) return p;

  const area = rest.slice(0, 2);
  const number = rest.slice(2);

  let formattedNumber: string;
  if (number.length === 9) {
    formattedNumber = `${number.slice(0, 5)}-${number.slice(5)}`;
  } else if (number.length === 8) {
    formattedNumber = `${number.slice(0, 4)}-${number.slice(4)}`;
  } else {
    const half = Math.ceil(number.length / 2);
    formattedNumber = `${number.slice(0, half)}-${number.slice(half)}`;
  }

  const countryPrefix = country ? `+${country} ` : '';
  return `${countryPrefix}(${area}) ${formattedNumber}`;
}
