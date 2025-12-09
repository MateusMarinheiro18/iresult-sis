'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import AdminsForm from '@/components/admin/administradores/addForm/AdminsForm';
import Link from 'next/link';

export default function NewAdminPageClient() {
  const router = useRouter();

  return (
    <div className="page-root">
      <main className="container">
        {/* Header com título e botão voltar */}
        <div className="header-row">
          <h1 className="title">
            ADMINISTRADOR - NOVO
          </h1>
          <button
            className="back-btn"
            onClick={() => router.push(`/admin/administradores`)}
          >
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

        <section className="card">
          <div className="card-header">
            <h2>Dados</h2>
          </div>

          <div className="card-body">
            {/* AdminsForm é Client Component — sem companyId */}
            <AdminsForm />
          </div>
        </section>
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

        /* === HEADER COM TÍTULO E BOTÃO VOLTAR === */
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
          color: #0B2527;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          padding: 8px 14px;
          cursor: pointer;
          transition: all 0.2s ease;
          background: transparent;
        }

        .back-btn:hover {
          background: rgba(11, 37, 39, 0.06);
        }

        .back-btn svg {
          stroke: #0B2527;
        }

        /* === CARD DO FORMULÁRIO === */
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

        .card-body {
          padding: 24px;
        }

        /* === RESPONSIVO === */
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
