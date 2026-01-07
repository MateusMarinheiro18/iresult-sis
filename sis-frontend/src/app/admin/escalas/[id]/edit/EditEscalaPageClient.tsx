// src/app/admin/escalas/[id]/edit/EditEscalaPageClient.tsx
'use client';

import React from 'react';
import EscalaBuilderForm from '@/components/admin/escalas/builder/EscalaBuilderForm';
import type { EscalaFormState } from '@/components/admin/escalas/builder/types';

export default function EditEscalaPageClient({
  initialData,
}: {
  initialData: EscalaFormState & { id?: number };
}) {
  const escalaNome = initialData?.nome || '';

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

        <EscalaBuilderForm mode="edit" initialData={initialData} />
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
