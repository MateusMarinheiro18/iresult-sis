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
  initialData: EscalaFormState & { id?: number };
  escalaNome?: string | null;
  escalaId?: number | null;
}) {
  return (
    <div className="page-root">
      <main className="container">
        <header className="header-row">
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
          color: #0b2527;
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
