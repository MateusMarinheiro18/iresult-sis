// src/app/admin/escalas/new/NewEscalaPageClient.tsx
'use client';

import React from 'react';
import EscalaBuilderForm from '@/components/admin/escalas/EscalaBuilderForm';

export default function NewEscalaPageClient() {
  return (
    <div className="page-root">
      <main className="container">
        <header className="header-row">
          <div>
            <h1 className="page-title">Nova Escala</h1>
            <p className="page-subtitle">
              Crie uma nova escala definindo perguntas, faixas e respostas
              possíveis.
            </p>
          </div>
        </header>

        <EscalaBuilderForm mode="create" />
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
          color: #0B2527;
          margin: 0 0 4px;
        }

        .page-subtitle {
          font-size: 14px;
          color: #6b7280;
          margin: 0;
        }
      `}</style>
    </div>
  );
}
