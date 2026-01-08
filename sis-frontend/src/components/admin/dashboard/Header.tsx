'use client';
import React from 'react';

export default function Header() {
  return (
    <header className="page-header">
      <div className="page-header-title">
        <div>
          <h1>Dashboard</h1>
          <p className="page-header-subtitle">Visão geral das escalas, trilhas e agendamentos</p>
        </div>
      </div>

      <div className="page-header-actions" aria-hidden="true" />

      <style jsx>{`
        .page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 0;
          margin: 0 0 32px 0;
        }

        .page-header-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .page-header-title h1 {
            font-size: 1.6rem;
            font-weight: 600;
            color: #111827;
            margin: 0;
        }

        .page-header-subtitle {
          margin: 0;
          font-size: 14px;
          color: #666666;
          font-weight: 400;
          margin-top: 4px;
        }

        .page-header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        /* kept search-box styles in case you decide to re-enable input later */
        .search-box {
          display: inline-flex;
          align-items: center;
          background: #ffffff;
          border: 1px solid #e0e0e0;
          border-radius: 12px;
          padding: 8px 12px;
        }

        .page-header input[type="text"],
        .search-box input[type="text"] {
          border: none;
          outline: none;
          font-size: 14px;
          background: transparent;
          width: 220px;
        }

        @media (max-width: 1000px) {
          .page-header-title h1 {
            font-size: 26px;
          }
          .page-header-subtitle {
            font-size: 13px;
          }
        }

        @media (max-width: 640px) {
          .page-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
            margin-bottom: 24px;
          }

          .page-header-title h1 {
            font-size: 22px;
          }

          .page-header-subtitle {
            font-size: 12px;
          }
        }
      `}</style>
    </header>
  );
}
