// src/app/admin/escalas/EscalasTable.tsx
'use client';

import React from 'react';
import Link from 'next/link';

export type EscalaRow = {
  id: number;
  nome: string;
  dataVencimento?: string | Date | null;
};

type Props = {
  items: EscalaRow[];
  onSendLink: (id: number) => void;
  onEdit: (id: number) => void;
};

function formatDate(d?: string | Date | null) {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return '—';

  const dia = String(date.getDate()).padStart(2, '0');
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  const ano = date.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

export default function EscalasTable({ items, onSendLink, onEdit }: Props) {
  return (
    <div className="table-scroll">
      <table className="escalas-table" cellPadding={0} cellSpacing={0}>
        <thead>
          <tr>
            <th className="col-id">ID</th>
            <th className="col-name">Nome</th>
            <th className="col-date">Data de vencimento</th>
            <th className="col-action">Enviar link</th>
            <th className="col-action">Editar</th>
          </tr>
        </thead>

        <tbody>
          {items.map((e) => (
            <tr key={e.id}>
              <td className="cell id-cell">#{e.id}</td>

              <td className="cell name-cell">
                <Link href={`/admin/escalas/${e.id}`} className="name-link">
                  {e.nome ?? '—'}
                </Link>
              </td>

              <td className="cell date-cell">{formatDate(e.dataVencimento)}</td>

              <td className="cell action-cell">
                <button
                  className="pill-btn pill-primary"
                  onClick={() => onSendLink(e.id)}
                >
                  Enviar link
                </button>
              </td>

              <td className="cell action-cell">
                <button
                  className="pill-btn pill-secondary"
                  onClick={() => onEdit(e.id)}
                >
                  Editar
                </button>
              </td>
            </tr>
          ))}

          {items.length === 0 && (
            <tr>
              <td colSpan={5} className="no-results">
                Nenhuma escala encontrada.
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

        table.escalas-table {
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

        .pill-primary {
          background: #0b2527;
          color: white;
          border-color: #0b2527;
        }

        .pill-primary:hover {
          background: #134148;
          border-color: #134148;
        }

        .pill-secondary {
          background: white;
          color: #0b2527;
          border-color: #0b2527;
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
          table.escalas-table {
            min-width: 650px;
          }
        }
      `}</style>
    </div>
  );
}
