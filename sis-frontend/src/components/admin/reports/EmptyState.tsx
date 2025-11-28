'use client';

import React, { useState } from 'react';

export default function EmptyState({
  onCreate,
  onImport,
}: {
  onCreate: () => void;
  onImport: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="empty-state">
      <p className="empty-title">Nenhum relatório cadastrado</p>
      <p className="empty-text">
        Clique em &quot;Novo Relatório&quot; para cadastrar o primeiro relatório desta empresa.
      </p>

      <div className="new-report-wrapper">
        <button
          className="btn-new-report"
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
        >
          Novo Relatório
        </button>

        {menuOpen && (
          <div className="new-report-menu">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onCreate();
              }}
            >
              Criar Relatório
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onImport();
              }}
            >
              Importar Relatório
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .empty-state {
          background: #fff;
          border-radius: 14px;
          box-shadow: 0 6px 18px rgba(11, 37, 39, 0.06);
          padding: 24px;
          text-align: center;
          position: relative;
          display: inline-block;
          min-width: 100%;
        }
        .empty-title {
          margin: 0 0 4px;
          font-size: 15px;
          font-weight: 600;
          color: #0b2527;
        }
        .empty-text {
          margin: 0 0 12px;
          font-size: 13px;
          color: #6b7280;
        }
        .btn-new-report {
          background: #0b2527;
          color: #fff;
          border-radius: 999px;
          border: none;
          padding: 8px 18px;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
        }

        .new-report-wrapper {
          position: relative;
          display: inline-block;
        }

        .new-report-menu {
          position: absolute;
          left: 50%;
          transform: translateX(-50%);
          margin-top: 6px;
          background: #fff;
          border-radius: 10px;
          box-shadow: 0 6px 18px rgba(11, 37, 39, 0.12);
          padding: 4px 0;
          min-width: 200px;
          text-align: left;
          z-index: 10;
        }

        .new-report-menu button {
          width: 100%;
          padding: 8px 12px;
          background: transparent;
          border: none;
          text-align: left;
          font-size: 13px;
          cursor: pointer;
          color: #0b2527;
          font-weight: 500;
        }

        .new-report-menu button:hover {
          background: #f3f4ff;
        }

      `}</style>
    </div>
  );
}
