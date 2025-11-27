// src/app/admin/relatorios/AdminReportsPageClient.tsx
'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type Company = {
  id: number;
  razaoSocial: string;
  cnpj?: string | null;
  email?: string | null;
  telefone?: string | null;
};

export default function AdminReportsPageClient({
  initialCompanies,
}: {
  initialCompanies?: Company[];
}) {
  const router = useRouter();

  const companies = Array.isArray(initialCompanies) ? initialCompanies : [];

  const [query, setQuery] = useState('');

  const filteredCompanies = useMemo(() => {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return companies;
    return companies.filter((c) =>
      (c.razaoSocial ?? '').toLowerCase().includes(q)
    );
  }, [companies, query]);

  function handleOpenCompany(companyId: number) {
    router.push(`/admin/relatorios/${companyId}`);
  }

  return (
    <div className="page-root">
      <main className="container">
        <div className="header-row">
          <h1 className="title">RELATÓRIOS POR EMPRESA</h1>
        </div>

        <div className="card-body">
          {companies.length === 0 ? (
            <div className="empty-state">
              <p className="empty-title">Nenhuma empresa ativa encontrada</p>
              <p className="empty-text">
                Cadastre empresas na área de Administração para começar a gerenciar relatórios.
              </p>
            </div>
          ) : (
            <>
              {/* Barra de busca */}
              <div className="search-row">
                <div
                  className="search-box"
                  role="search"
                  aria-label="Buscar empresa por nome"
                >
                  <div className="search-icon" aria-hidden>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M21 21l-4.35-4.35"
                        stroke="#6B7280"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle
                        cx="11"
                        cy="11"
                        r="6"
                        stroke="#6B7280"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>

                  <input
                    className="search-input"
                    placeholder="Buscar empresa"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    aria-label="Buscar empresas por nome"
                  />
                </div>
              </div>

              {filteredCompanies.length === 0 ? (
                <div className="empty-state">
                  <p className="empty-title">Nenhuma empresa encontrada</p>
                  <p className="empty-text">
                    Ajuste o termo de busca para localizar a empresa desejada.
                  </p>
                </div>
              ) : (
                <div className="companies-grid">
                  {filteredCompanies.map((empresa) => (
                    <div key={empresa.id} className="company-card">
                      <div className="company-content">
                        <h3 className="company-title">{empresa.razaoSocial}</h3>
                      </div>

                      <div className="company-footer">
                        <button
                          className="open-btn"
                          onClick={() => handleOpenCompany(empresa.id)}
                        >
                          Acessar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <style jsx>{`
        .page-root {
          padding: 24px;
          background: #f3f4ff;
          box-sizing: border-box;
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

        .card-body {
          margin-top: 8px;
        }

        .empty-state {
          background: #ffffff;
          border-radius: 14px;
          box-shadow: 0 6px 18px rgba(11, 37, 39, 0.06);
          padding: 24px;
          text-align: center;
        }

        .empty-title {
          margin: 0 0 4px;
          font-size: 15px;
          font-weight: 600;
          color: #0b2527;
        }

        .empty-text {
          margin: 0;
          font-size: 13px;
          color: #6b7280;
        }

        /* GRID: 1 col mobile, 2 cols tablet, 3 cols desktop */
        .companies-grid {
          display: grid;
          grid-template-columns: repeat(1, minmax(0, 1fr));
          gap: 16px;
        }

        @media (min-width: 640px) {
          .companies-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (min-width: 1024px) {
          .companies-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        .company-card {
          background: #062123;
          border-radius: 18px;
          padding: 18px 20px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 150px; /* altura fixa */
          overflow: hidden;
        }

        .company-title {
          margin: 0 0 4px;
          font-size: 20px;
          text-align: center;
          font-weight: 700;
          color: #f9fafb;
        }

        .company-subtitle {
          margin: 0;
          font-size: 12px;
          text-align: center;
          color: #e5e7eb;
        }

        .company-footer {
          margin-top: 16px;
          display: flex;
          justify-content: center;
        }

        .open-btn {
          border: none;
          border-radius: 999px;
          padding: 8px 32px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          background: #ffffff;
          color: #0b2527;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.18);
        }

        .search-row {
          display: flex;
          justify-content: flex-start;
          margin-bottom: 16px;
        }

        .search-box {
          display: flex;
          align-items: center;
          background: #fff;
          padding: 8px 12px;
          border-radius: 999px;
          box-shadow: 0 2px 8px rgba(11, 37, 39, 0.04);
          border: 1px solid rgba(11, 37, 39, 0.04);
          min-width: 220px;
          max-width: 420px;
          width: 100%;
          box-sizing: border-box;
        }

        .search-icon {
          display: inline-flex;
          margin-right: 10px;
          align-items: center;
          justify-content: center;
        }

        .search-input {
          border: none;
          outline: none;
          font-size: 14px;
          flex: 1;
          color: #111827;
          background: transparent;
        }

        .search-input::placeholder {
          color: #9ca3af;
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
          .search-row {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
