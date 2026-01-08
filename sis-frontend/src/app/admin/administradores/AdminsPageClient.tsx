'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import AdminsTableClient from '@/components/admin/administradores/table/AdminsTableClient';

export default function AdminsPageClient({
  initialData,
}: {
  initialData?: any[];
}) {
  const router = useRouter();

  const safeInitial = Array.isArray(initialData) ? initialData : [];

  return (
    <div className="page-root">
      <main className="container">
        {/* HEADER COM TÍTULO E BOTÃO VOLTAR */}
        <div className="header-row">
          <h1 className="title">Administradores</h1>
        </div>

        <div className="card-body">
          <AdminsTableClient initialData={safeInitial} />
        </div>
      </main>

      <style jsx>{`
        .page-root {
          padding: 24px;
          background: #f3f4ff;
          box-sizing: border-box;
          min-height: 100vh;
        }

        .container {
          max-width: 1180px;
          margin: 0 auto;
        }

        .header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .title {
          font-size: 1.6rem;
          font-weight: 600;
          color: #111827;
          margin: 0;
        }

        .back-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #421E97;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          padding: 8px 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          background: transparent;
        }

        .back-btn svg {
          stroke: #421E97;
        }

        .card {
          background: #fff;
          border-radius: 14px;
          box-shadow: 0 6px 18px rgba(11, 37, 39, 0.06);
          overflow: hidden;
        }

        .card-header {
          background: #421E97;
          padding: 18px 24px;
        }
        .card-header h2 {
          color: #fff;
          margin: 0;
          font-size: 16px;
          font-weight: 700;
        }

        @media (max-width: 640px) {
          .container {
            padding: 8px;
          }
          .header-row {
            flex-direction: column;
            align-items: flex-start;
          }
          .back-btn {
            width: 100%;
            justify-content: center;
          }
          .card-body {
            padding: 16px;
          }
        }
      `}</style>
    </div>
  );
}
