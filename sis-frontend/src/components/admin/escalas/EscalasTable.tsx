// src/app/admin/escalas/EscalasTable.tsx
'use client';

import React from 'react';

export type EscalaRow = {
  id: number;
  nome: string;
  dataVencimento?: string | Date | null;
};

type Props = {
  items: EscalaRow[];
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
};

function formatDate(d?: string | Date | null) {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return '—';

  const dia = String(date.getUTCDate()).padStart(2, '0');
  const mes = String(date.getUTCMonth() + 1).padStart(2, '0');
  const ano = date.getUTCFullYear();
  return `${dia}/${mes}/${ano}`;
}

export default function EscalasTable({ items, onEdit, onDelete }: Props) {
  return (
    <div className="table-scroll">
      <table className="escalas-table" cellPadding={0} cellSpacing={0}>
        <thead>
          <tr>
            <th className="col-id">ID</th>
            <th className="col-name">NOME</th>
            <th className="col-date">DATA DE VENCIMENTO</th>
            <th className="col-action">AÇÕES</th>
          </tr>
        </thead>

        <tbody>
          {items.map((e) => (
            <tr key={e.id}>
              <td className="cell id-cell">#{e.id}</td>

              <td className="cell name-cell">
                <span className="name-link">
                  {e.nome ?? '—'}
                </span>
              </td>

              <td className="cell date-cell">{formatDate(e.dataVencimento)}</td>

              <td className="cell action-cell">
                <button
                  className="icon-btn edit-btn"
                  onClick={() => onEdit(e.id)}
                  aria-label={`Editar escala ${e.nome}`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M18.5 2.5C18.8978 2.10218 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10218 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10218 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <button
                  className="icon-btn delete-btn"
                  onClick={() => onDelete(e.id)}
                  aria-label={`Excluir escala ${e.nome}`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 6H5H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </td>
            </tr>
          ))}

          {items.length === 0 && (
            <tr>
              <td colSpan={4} className="no-results">
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
          text-align: center;
          padding: 16px 24px;
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
          width: 80px;
        }

        .col-name {
          min-width: 220px;
        }

        .col-date {
          min-width: 150px;
        }

        .col-action {
          width: 140px;
        }

        tbody tr {
          border-bottom: 1px solid rgba(11, 37, 39, 0.04);
          transition: background 0.15s ease;
        }

        tbody tr:hover {
          background: rgba(11, 37, 39, 0.02);
        }

        .cell {
          padding: 18px 24px;
          vertical-align: middle;
          font-size: 14px;
          color: #333;
          text-align: center; /* centraliza tudo */
        }

        .id-cell {
          font-weight: 800;
          color: #111827;
        }

        .name-cell {
          max-width: 320px;
        }

        .name-text {
          color: #1f2a65;
          font-weight: 700;
          text-decoration: none;
        }

        .date-cell {
          color: #374151;
          white-space: nowrap;
        }

        .action-cell {
          white-space: nowrap;
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

        .icon-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 1px solid #d1d5db;
          background-color: #fff;
          cursor: pointer;
          transition: all 0.2s ease;
          margin: 0 4px;
        }

        .icon-btn:hover {
          background-color: #f9fafb;
          border-color: #9ca3af;
        }

        .edit-btn {
          color: #374151;
        }

        .delete-btn {
          color: #ef4444;
        }

        .delete-btn:hover {
          background-color: #fef2f2;
          border-color: #fca5a5;
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
