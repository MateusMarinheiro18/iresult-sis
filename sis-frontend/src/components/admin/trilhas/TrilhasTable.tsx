// src/components/admin/trilhas/TrilhasTable.tsx
'use client';

import React from 'react';
import Link from 'next/link';

export type TrilhaRow = {
  id: number;
  nome: string;
  // string "yyyy-mm-dd" ou null
  dataCriacao?: string | null;
};

type Props = {
  items: TrilhaRow[];
  onDetails: (id: number) => void;
};

// Formata "yyyy-mm-dd" -> "dd/mm/yyyy" sem mexer com Date/UTC
function formatDate(dateStr?: string | null) {
  if (!dateStr) return '—';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return '—';
  const [yyyy, mm, dd] = parts;
  if (!yyyy || !mm || !dd) return '—';
  return `${dd}/${mm}/${yyyy}`;
}

export default function TrilhasTable({ items, onDetails }: Props) {
  return (
    <div className="table-scroll">
      <table className="trilhas-table" cellPadding={0} cellSpacing={0}>
        <thead>
          <tr>
            <th className="col-id">ID</th>
            <th className="col-name">Nome</th>
            <th className="col-date">Data de criação</th>
            <th className="col-action">Detalhes</th>
          </tr>
        </thead>

        <tbody>
          {items.map((t) => (
            <tr key={t.id}>
              <td className="cell id-cell">#{t.id}</td>

              <td className="cell name-cell">
                <Link href={`/admin/trilhas/${t.id}`} className="name-link">
                  {t.nome ?? '—'}
                </Link>
              </td>

              <td className="cell date-cell">{formatDate(t.dataCriacao)}</td>

              <td className="cell action-cell">
                <button
                  className="pill-btn pill-secondary"
                  onClick={() => onDetails(t.id)}
                >
                  Detalhes
                </button>
              </td>
            </tr>
          ))}

          {items.length === 0 && (
            <tr>
              <td colSpan={4} className="no-results">
                Nenhuma trilha encontrada.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <style jsx>{`
        .table-scroll {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          border-radius: 12px;
          background: #fff;
          box-shadow: 0 6px 18px rgba(11, 37, 39, 0.06);
          margin-bottom: 20px;
        }

        table.trilhas-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 700px;
        }

        thead th {
          text-align: left;
          padding: 16px 20px;
          font-size: 13px;
          font-weight: 700;
          color: #374151;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          border-bottom: 1px solid rgba(11, 37, 39, 0.08);
          white-space: nowrap;
          background: #fafafa;
        }

        .col-id {
          padding-left: 24px;
        }
        .col-action {
          padding-right: 24px;
          text-align: center;
        }
        .col-date {
          min-width: 150px;
        }

        tbody tr {
          border-bottom: 1px solid rgba(11, 37, 39, 0.04);
          transition: background 0.15s ease;
        }
        tbody tr:hover {
          background: rgba(11, 37, 39, 0.02);
        }

        .cell {
          padding: 18px 20px;
          vertical-align: middle;
          font-size: 14px;
          color: #333;
        }

        .id-cell {
          font-weight: 800;
          color: #111827;
          width: 80px;
          padding-left: 24px;
        }

        .name-cell {
          max-width: 320px;
        }

        .name-link {
          color: #1f2a65;
          font-weight: 700;
          text-decoration: none;
        }

        .name-link:hover {
          text-decoration: underline;
        }

        .date-cell {
          color: #374151;
          white-space: nowrap;
        }

        .action-cell {
          width: 140px;
          text-align: center;
          padding-right: 24px;
        }

        .pill-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 7px 16px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 600;
          border: 1px solid transparent;
          cursor: pointer;
          white-space: nowrap;
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .pill-secondary {
          background: white;
          color: #421E97;
          border-color: #421E97;
        }

        .pill-secondary:hover {
          background: #f3f4ff;
        }

        .no-results {
          text-align: center;
          padding: 28px;
          color: #6b7280;
        }

        @media (max-width: 960px) {
          table.trilhas-table {
            min-width: 650px;
          }
        }
      `}</style>
    </div>
  );
}
