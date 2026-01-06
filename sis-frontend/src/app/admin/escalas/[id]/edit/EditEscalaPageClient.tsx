// src/app/admin/escalas/[id]/edit/EditEscalaPageClient.tsx
'use client';

import React from 'react';
import EscalaBuilderForm from '@/components/admin/escalas/builder/EscalaBuilderForm';
import type { EscalaFormState } from '@/components/admin/escalas/builder/types';

export default function EditEscalaPageClient({
  initialData,
  escalaNome,
  escalaId,
}: {
  initialData?: EscalaFormState & { id?: number };
  escalaNome?: string | null;
  escalaId?: number | null;
}) {
  return (
    <div className="page-root" aria-label="Página de edição de escala">
      <main className="container">
        <header className="header-row" role="banner">
          <div>
            <h1 className="page-title">
              Editar Escala{escalaNome ? ` — ${escalaNome}` : ''}
            </h1>
            <p className="page-subtitle">
              Altere os dados, módulos, perguntas e respostas da escala.
            </p>
          </div>
        </header>

        {/* Mantemos apenas as props esperadas pelo EscalaBuilderForm */}
        <EscalaBuilderForm mode="edit" initialData={initialData ?? undefined} />
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
          font-size: 20px;
          font-weight: 700;
          color: #0b2527;
          margin: 0 0 4px;
        }

        .page-subtitle {
          font-size: 14px;
          color: #6b7280;
          margin: 0;
        }

        @media (max-width: 768px) {
          .header-row {
            flex-direction: column;
            gap: 8px;
          }
          .page-title {
            font-size: 18px;
          }
        }
      `}</style>
    </div>
  );
}
