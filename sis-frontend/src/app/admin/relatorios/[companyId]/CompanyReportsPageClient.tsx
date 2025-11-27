// src/app/admin/relatorios/[companyId]/CompanyReportsPageClient.tsx
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type Report = {
  id: number;
  titulo: string;
  dataPublicacao?: string | null;
};

export default function CompanyReportsPageClient({
  companyId,
  companyName,
  initialReports,
}: {
  companyId: number;
  companyName?: string | null;
  initialReports?: Report[];
}) {
  const router = useRouter();

  const [reports, setReports] = useState<Report[]>(
    Array.isArray(initialReports) ? initialReports : []
  );

  const [query, setQuery] = useState('');
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  const menuRef = useRef<HTMLDivElement | null>(null);

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    }

    if (openMenuId !== null) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenuId]);

  const filteredReports = useMemo(() => {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return reports;
    return reports.filter(r =>
      (r.titulo ?? '').toLowerCase().includes(q)
    );
  }, [reports, query]);

  function formatDate(dateStr?: string | null) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    try {
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(d);
    } catch {
      return d.toLocaleDateString('pt-BR');
    }
  }

  function handleOpenReport(reportId: number) {
    router.push(`/admin/relatorios/${companyId}/${reportId}`);
  }

  function handleNewReport() {
    router.push(`/admin/relatorios/${companyId}/new`);
  }

  function handleEditReport(reportId: number) {
    router.push(`/admin/relatorios/${companyId}/${reportId}/edit`);
  }

  async function handleDeleteReport(reportId: number) {
    const ok = window.confirm('Tem certeza que deseja excluir este relatório?');
    if (!ok) return;

    try {
      const res = await fetch(
        `/api/companies/${companyId}/reports/${reportId}`,
        { method: 'DELETE' }
      );
      if (!res.ok) {
        throw new Error('Erro ao excluir relatório');
      }
      setReports(prev => prev.filter(r => r.id !== reportId));
      setOpenMenuId(null);
    } catch (err) {
      console.error(err);
      alert('Não foi possível excluir o relatório. Tente novamente.');
    }
  }

  return (
    <div className="page-root">
      <main className="container">
        {/* HEADER COM TÍTULO E BOTÃO VOLTAR */}
        <div className="header-row">
          <div>
            <h1 className="title">RELATÓRIOS</h1>
          </div>
          <button className="back-btn" onClick={() => router.push('/admin/relatorios')}>
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
          {reports.length === 0 ? (
            <div className="empty-state">
              <p className="empty-title">Nenhum relatório cadastrado</p>
              <p className="empty-text">
                Clique em &quot;Novo Relatório&quot; para cadastrar o primeiro relatório desta empresa.
              </p>

              <button className="btn-new-report" onClick={handleNewReport}>
                Novo Relatório
              </button>
            </div>
          ) : (
            <>
              {/* SUB-HEADER: busca + botão novo relatório */}
              <div className="controls-row">
                <div
                  className="search-box"
                  role="search"
                  aria-label="Buscar relatório por título"
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
                    placeholder="Buscar relatório"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    aria-label="Buscar relatórios por título"
                  />
                </div>

                <div className="right-actions">
                  <button className="btn-new-report" onClick={handleNewReport}>
                    Novo Relatório
                  </button>
                </div>
              </div>

              {filteredReports.length === 0 ? (
                <div className="empty-state">
                  <p className="empty-title">Nenhum relatório encontrado</p>
                  <p className="empty-text">
                    Ajuste o termo de busca ou cadastre um novo relatório.
                  </p>
                </div>
              ) : (
                <div className="reports-grid" ref={menuRef}>
                  {filteredReports.map((report) => (
                    <div key={report.id} className="report-card">
                      <div className="report-header">
                        <div className="report-texts">
                          <h3 className="report-title">{report.titulo}</h3>
                          {report.dataPublicacao && (
                            <p className="report-date">
                              Publicado em {formatDate(report.dataPublicacao)}
                            </p>
                          )}
                        </div>

                        <div className="menu-wrapper">
                          <button
                            className="menu-btn"
                            onClick={() =>
                              setOpenMenuId(prev =>
                                prev === report.id ? null : report.id
                              )
                            }
                            aria-label="Mais ações do relatório"
                          >
                            <span />
                            <span />
                            <span />
                          </button>

                          {openMenuId === report.id && (
                            <div className="menu-dropdown">
                              <button
                                className="menu-item"
                                onClick={() => handleEditReport(report.id)}
                              >
                                Editar
                              </button>
                              <button
                                className="menu-item delete"
                                onClick={() => handleDeleteReport(report.id)}
                              >
                                Excluir
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="report-footer">
                        <button
                          className="open-btn"
                          onClick={() => handleOpenReport(report.id)}
                        >
                          Abrir
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

        .btn-new-report {
          background: #0b2527;
          color: #ffffff;
          border-radius: 999px;
          margin-top: 10px;
          border: none;
          padding: 8px 18px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .controls-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          gap: 12px;
          flex-wrap: wrap;
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

        .right-actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }

        /* GRID: 1 col mobile, 2 cols tablet, 3 cols desktop */
        .reports-grid {
          display: grid;
          grid-template-columns: repeat(1, minmax(0, 1fr));
          gap: 16px;
        }

        @media (min-width: 640px) {
          .reports-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (min-width: 1024px) {
          .reports-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        .report-card {
          background: #062123;
          border-radius: 18px;
          padding: 18px 20px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          height: 150px;
          overflow: hidden;
        }

        .report-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 8px;
        }

        .report-texts {
          flex: 1;
          min-width: 0;
        }

        .report-title {
          margin: 0 0 4px;
          font-size: 16px;
          font-weight: 700;
          color: #f9fafb;
          word-break: break-word;
        }

        .report-date {
          margin: 0;
          font-size: 12px;
          color: #e5e7eb;
        }

        .report-footer {
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

        .open-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        }

        /* Menu 3 pontos */
        .menu-wrapper {
          position: relative;
          flex-shrink: 0;
        }

        .menu-btn {
          width: 28px;
          height: 28px;
          border-radius: 999px;
          border: none;
          background: transparent;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          gap: 2px;
        }

        .menu-btn span {
          width: 3px;
          height: 3px;
          border-radius: 999px;
          background: #e5e7eb;
          display: block;
        }

        .menu-btn:hover {
          background: rgba(255, 255, 255, 0.06);
        }

        .menu-dropdown {
          position: absolute;
          top: 32px;
          right: 0;
          background: #ffffff;
          border-radius: 10px;
          box-shadow: 0 10px 30px rgba(15, 23, 42, 0.4);
          padding: 6px 0;
          min-width: 140px;
          z-index: 20;
        }

        .menu-item {
          width: 100%;
          border: none;
          background: transparent;
          padding: 8px 14px;
          text-align: left;
          font-size: 13px;
          color: #111827;
          cursor: pointer;
          white-space: nowrap;
        }

        .menu-item:hover {
          background: #f3f4ff;
        }

        .menu-item.delete {
          color: #b91c1c;
        }

        .menu-item.delete:hover {
          background: #fef2f2;
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
          .controls-row {
            flex-direction: column;
            align-items: stretch;
          }
          .right-actions {
            justify-content: flex-start;
          }
        }
      `}</style>
    </div>
  );
}
