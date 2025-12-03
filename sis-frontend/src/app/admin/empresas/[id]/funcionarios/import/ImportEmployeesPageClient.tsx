// src/app/admin/empresas/[id]/funcionarios/import/ImportEmployeesPageClient.tsx
'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import ImportEmployeesClient from '@/components/admin/employee/import/ImportEmployeesClient';

type CompanyGroup = {
  id: number;
  nome: string;
};

type Props = {
  companyId?: number;
  companyName?: string | null;
  error?: string;
  companyGroups?: CompanyGroup[]; // pode continuar existindo, só não usamos
};

export default function ImportEmployeesPageClient({
  companyId,
  companyName,
  error,
  companyGroups = [],
}: Props) {
  const router = useRouter();

  if (error || !companyId) {
    return (
      <div className="page-root">
        <main className="container">
          <div className="header-row">
            <h1 className="title">IMPORTAR FUNCIONÁRIOS</h1>
            <button
              className="back-btn"
              onClick={() => router.push('/admin/empresas')}
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
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              <span>Voltar</span>
            </button>
          </div>

          <section className="card">
            <div className="card-header">
              <h2>Erro: companyId não encontrado</h2>
            </div>
            <div className="card-body">
              <p style={{ color: '#b91c1c', marginBottom: 16 }}>
                {error || 'Não foi possível identificar a empresa (companyId).'}
              </p>
              <div style={{ color: '#6b7280', fontSize: 14 }}>
                <p>
                  <strong>Possíveis causas:</strong>
                </p>
                <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                  <li>
                    Você abriu a URL sem o id: confirme que a rota é{' '}
                    <code>/admin/empresas/123/funcionarios/import</code>.
                  </li>
                  <li>
                    O arquivo da página deve estar em{' '}
                    <code>
                      src/app/admin/empresas/[id]/funcionarios/import/page.tsx
                    </code>
                    .
                  </li>
                </ul>
              </div>
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

          .back-btn:hover {
            background: rgba(11, 37, 39, 0.06);
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

          .card-body {
            padding: 24px;
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

  return (
    <div className="page-root">
      <main className="container">
        {/* Header com título e botão voltar */}
        <div className="header-row">
          <h1 className="title">
            IMPORTAR FUNCIONÁRIOS
            {companyName ? ` — ${companyName}` : ''}
          </h1>
          <button
            className="back-btn"
            onClick={() =>
              router.push(`/admin/empresas/${companyId}/funcionarios`)
            }
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
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            <span>Voltar</span>
          </button>
        </div>

        <section className="card">
          <div className="card-header">
            <h2>Importação de Dados</h2>
          </div>

          <div className="card-body">
            <p className="description">
              Faça upload de um arquivo CSV ou Excel (.xls/.xlsx). Você poderá
              pré-visualizar e remover linhas antes de salvar.
            </p>

            {/* Componente de importação */}
            <ImportEmployeesClient companyId={companyId} />
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

        .back-btn:hover {
          background: rgba(11, 37, 39, 0.06);
        }

        .back-btn svg {
          stroke: #0b2527;
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

        .description {
          color: #374151;
          font-size: 14px;
          margin-bottom: 20px;
          line-height: 1.6;
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
