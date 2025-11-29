// src/app/admin/trilhas/new/page.tsx
'use client';

import React from 'react';
import TrilhaBuilderForm from '@/components/admin/trilhas/TrilhaBuilderForm';

export default function NewTrilhaPage() {
  return (
    <div className="page-root">
      <main className="container">
        <header className="header-row">
          <div>
            <h1 className="page-title">Nova Trilha</h1>
            <p className="page-subtitle">
              Crie uma trilha e cadastre os eventos que farão parte dela.
            </p>
          </div>
        </header>

        <TrilhaBuilderForm mode="create" />
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
      `}</style>
    </div>
  );
}
