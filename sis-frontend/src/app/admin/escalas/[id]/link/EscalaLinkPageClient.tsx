// src/app/admin/escalas/[id]/link/EscalaLinkPageClient.tsx
'use client';

import React from 'react';
import EscalaEmpresasSection from '@/components/admin/escalas/EscalaEmpresasSection';

type Props = {
  escalaId: number;
  escalaNome: string;
};

export default function EscalaLinkPageClient({ escalaId, escalaNome }: Props) {
  return (
    <div className="page-root">
      <main className="container">
        <header className="header-row">
          <div>
            <h1 className="page-title">Empresas da escala</h1>
            <p className="page-subtitle">
              Selecione as empresas que participarão da escala{' '}
              <strong>{escalaNome}</strong>.
            </p>
          </div>
        </header>

        <EscalaEmpresasSection escalaId={escalaId} />

        {/* Bloco final com botão de enviar */}
        <section className="send-section">
          <div className="send-text">
            <p>
              Após definir as empresas vinculadas, você poderá enviar o link do
              formulário para todos os funcionários dessas empresas.
            </p>
          </div>
          <div className="send-actions">
            <button
              type="button"
              className="btn-send"
              // futuramente aqui entra a lógica de disparo dos links
            >
              Enviar links para funcionários
            </button>
          </div>
        </section>
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
          margin-bottom: 20px;
        }

        .page-title {
          font-size: 20px;
          font-weight: 700;
          color: #111827;
          margin: 0 0 4px;
        }

        .page-subtitle {
          font-size: 14px;
          color: #6b7280;
          margin: 0;
        }

        .send-section {
          margin-top: 20px;
          padding: 16px 18px;
          border-radius: 12px;
          border: 1px dashed #d1d5db;
          background: #f9fafb;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .send-text p {
          margin: 0;
          font-size: 13px;
          color: #4b5563;
        }

        .send-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
        }

        .btn-send {
          border-radius: 999px;
          padding: 8px 18px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          border: 1px solid #0b2527;
          background: #0b2527;
          color: #ffffff;
          white-space: nowrap;
          transition: all 0.15s ease;
        }

        .btn-send:hover {
          background: #134148;
          border-color: #134148;
        }

        @media (max-width: 960px) {
          .header-row {
            flex-direction: column;
            align-items: flex-start;
          }

          .send-section {
            flex-direction: column;
            align-items: flex-start;
          }

          .send-actions {
            width: 100%;
            justify-content: flex-start;
          }
        }
      `}</style>
    </div>
  );
}
