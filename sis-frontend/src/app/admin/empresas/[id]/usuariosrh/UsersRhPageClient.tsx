'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import UsersRhTableClient from '@/components/admin/usersrh/table/UsersRhTableClient';

export default function UsersRhPageClient({
  companyId,
  companyName,
  initialData,
}: {
  companyId: number;
  companyName?: string | null;
  initialData?: any[];
}) {
  const router = useRouter();

  // Garante que o array esteja definido
  const safeInitial = Array.isArray(initialData) ? initialData : [];

  return (
    <div className="page-root">
      <main className="container">
        {/* HEADER COM TÍTULO E BOTÃO VOLTAR */}
        <div className="header-row">
          <h1 className="title">USUÁRIOS RH{companyName ? ` - ${companyName}` : ''}</h1>
          <button className="back-btn" onClick={() => router.push('/admin/empresas')}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span>Voltar</span>
          </button>
        </div>

        <div className="card-body">
          <UsersRhTableClient companyId={companyId} initialData={safeInitial} />
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
          font-size: 20px;
          font-weight: 700;
          color: #0b2527;
          margin: 0;
        }

        .back-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #0b2527;
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
          stroke: #0b2527;
        }

        .card {
          background: #fff;
          border-radius: 14px;
          box-shadow: 0 6px 18px rgba(11, 37, 39, 0.06);
          overflow: hidden;
        }

        .card-header {
          background: #0b2527;
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
