'use client';

import React from 'react';
import EscalaBuilderForm from '@/components/admin/escalas/builder/EscalaBuilderForm';

export default function NewEscalaPageClient() {
  return (
    <div className="page-root" aria-label="Página de criação de nova escala">
      <main className="container">
        <header className="header-row">
          <div>
            <h1 className="page-title">Nova Escala</h1>
            <p className="page-subtitle">
              Crie uma nova escala definindo módulos, categorias, perguntas e respostas possíveis.
            </p>
          </div>
        </header>

        {/* 
          Modo "create" = SEM autosave.
          O EscalaBuilderForm enviará um único POST para /api/escalas/builder.
        */}
        <EscalaBuilderForm mode="create" />
      </main>

      <style jsx>{`
        .page-root {
          width: 100%;
          display: block;
        }

        .container {
          max-width: 1120px;
          margin: 0 auto;
          padding: 24px 16px 40px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }

        .page-title {
          font-size: 22px;
          font-weight: 700;
          color: #0B2527;
          margin: 0 0 6px;
        }

        .page-subtitle {
          font-size: 14px;
          line-height: 1.4;
          color: #6b7280;
          margin: 0;
          max-width: 620px;
        }

        @media (max-width: 768px) {
          .header-row {
            flex-direction: column;
            gap: 8px;
          }
          .page-title {
            font-size: 20px;
          }
        }
      `}</style>
    </div>
  );
}
