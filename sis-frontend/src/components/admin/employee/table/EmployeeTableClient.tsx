'use client';
import React, { useMemo, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import EmployeeRowActions from './EmployeeRowActions';

type Employee = {
  id_funcionario: number;
  nome?: string | null;
  email?: string | null;
  telefone?: string | null;
  data_nascimento?: string | Date | null;
  cidade_nascimento?: string | null;
  gestor?: string | null;
  created?: string | Date | null;
  deleted?: string | Date | null;
  updated?: string | Date | null;
};

const ITEMS_PER_PAGE = 5;

export default function EmployeesTableClient({ companyId, initialData }: { companyId: number; initialData: Employee[] }) {
  const [query, setQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const router = useRouter();

  // Dropdown state
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // fecha o menu quando clicar fora
  useEffect(() => {
    if (!menuOpen) return;
    const onOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [menuOpen]);

  // filtro por nome ou email (case-insensitive)
  const filtered = useMemo(() => {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return initialData;
    return initialData.filter((e) =>
      ((e.nome ?? '').toLowerCase().includes(q) || (e.email ?? '').toLowerCase().includes(q))
    );
  }, [initialData, query]);

  // reset página ao mudar busca
  useEffect(() => {
    setCurrentPage(1);
  }, [query]);

  // paginação
  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentItems = filtered.slice(startIndex, endIndex);

  // páginas visíveis (máximo 3)
  const getVisiblePages = () => {
    const pages: number[] = [];
    let start = Math.max(1, currentPage - 1);
    let end = Math.min(totalPages, start + 2);
    if (end - start < 2) start = Math.max(1, end - 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };
  const visiblePages = getVisiblePages();

  function formatDate(value?: string | Date | null) {
    if (!value) return '—';
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString();
  }

  // handlers do dropdown
  function goToImport() {
    setMenuOpen(false);
    router.push(`/admin/empresas/${companyId}/funcionarios/import`);
  }
  function goToCreate() {
    setMenuOpen(false);
    router.push(`/admin/empresas/${companyId}/funcionarios/new`);
  }

  return (
    <div className="wrapper">
      <div className="controls-row">
        <div className="search-box" role="search" aria-label="Buscar funcionário por nome ou email">
          <div className="search-icon" aria-hidden>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21 21l-4.35-4.35" stroke="#6B7280" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="11" cy="11" r="6" stroke="#6B7280" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <input
            className="search-input"
            placeholder="Buscar"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Buscar funcionários por nome ou email"
          />
        </div>

        <div className="right-actions" ref={menuRef}>
          {/* Dropdown main button */}
          <div className="dropdown-root">
            <button
              className="btn-new"
              onClick={() => setMenuOpen((s) => !s)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Novo funcionário opções"
              title="Novo funcionário"
            >
              Novo Funcionário
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none" style={{ marginLeft: 8 }} xmlns="http://www.w3.org/2000/svg">
                <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {menuOpen && (
              <div className="menu" role="menu" aria-label="Opções novo funcionário">
                <button className="menu-item" role="menuitem" onClick={goToImport}>
                  {/* ícone documento */}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ marginRight: 10 }} xmlns="http://www.w3.org/2000/svg">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Importar
                </button>

                <button className="menu-item" role="menuitem" onClick={goToCreate}>
                  {/* ícone plus */}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ marginRight: 10 }} xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Criar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="table-scroll">
        <table className="companies-table" cellPadding={0} cellSpacing={0}>
          <thead>
            <tr>
              <th className="col-id">ID</th>
              <th className="col-name">Nome</th>
              <th className="col-created">Data Nasc.</th>
              <th className="col-gestor">Gestor</th>
              <th className="col-cidade">Cidade Nasc.</th>
              <th className="col-email">Email</th>
              <th className="col-action">Ação</th>
            </tr>
          </thead>

          <tbody>
            {currentItems.map((e) => (
              <tr key={e.id_funcionario}>
                <td className="cell id-cell">#{e.id_funcionario}</td>

                <td className="cell name-cell">
                  <Link href={`/admin/empresas/${companyId}/funcionarios/${e.id_funcionario}`} className="name-link">
                    {e.nome ?? '—'}
                  </Link>
                </td>

                <td className="cell created-cell">{formatDate(e.created ?? e.updated ?? e.data_nascimento)}</td>

                <td className="cell gestor-cell">{e.gestor ?? '—'}</td>

                <td className="cell cidade-cell">{e.cidade_nascimento ?? '—'}</td>

                <td className="cell email-cell">
                  {e.email ? (
                    <a href={`mailto:${e.email}`} className="email-link">{e.email}</a>
                  ) : '—'}
                </td>

                <td className="cell action-cell">
                  <EmployeeRowActions companyId={companyId} employeeId={e.id_funcionario} />
                </td>
              </tr>
            ))}

            {currentItems.length === 0 && (
              <tr>
                <td colSpan={7} className="no-results">Nenhum funcionário encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {totalItems > 0 && (
        <div className="pagination-wrapper">
          <div className="pagination-info">
            Mostrando {startIndex + 1}-{Math.min(endIndex, totalItems)} de {totalItems} {totalItems === 1 ? 'funcionário' : 'funcionários'}
          </div>

          <div className="pagination-controls">
            <button
              className="page-arrow"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              aria-label="Página anterior"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            <div className="page-numbers">
              {visiblePages.map((page) => (
                <button
                  key={page}
                  className={`page-number ${currentPage === page ? 'active' : ''}`}
                  onClick={() => setCurrentPage(page)}
                  aria-label={`Página ${page}`}
                  aria-current={currentPage === page ? 'page' : undefined}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              className="page-arrow"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              aria-label="Próxima página"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .wrapper { display: block; gap: 12px; }

        .controls-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 18px;
          gap: 12px;
        }

        .search-box {
          display: flex;
          align-items: center;
          background: #fff;
          padding: 8px 12px;
          border-radius: 999px;
          box-shadow: 0 2px 8px rgba(11,37,39,0.04);
          border: 1px solid rgba(11,37,39,0.04);
          min-width: 220px;
          max-width: 520px;
          width: 100%;
          box-sizing: border-box;
        }

        .search-icon { display: inline-flex; margin-right: 10px; align-items: center; justify-content: center; }
        .search-input {
          border: none;
          outline: none;
          font-size: 14px;
          flex: 1;
          color: #111827;
          background: transparent;
        }
        .search-input::placeholder { color: #9ca3af; }

        .right-actions { display: flex; gap: 8px; position: relative; }
        /* dropdown root */
        .dropdown-root { position: relative; display: inline-flex; align-items: center; }

        .btn-new {
          background: transparent;
          border: 1px solid #0b2527;
          color: #0b2527;
          padding: 8px 14px;
          border-radius: 999px;
          text-decoration: none;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .btn-new:hover { background: #0b2527; color: white; }

        .menu {
          position: absolute;
          right: 0;
          top: calc(100% + 8px);
          min-width: 180px;
          background: #fff;
          border: 1px solid rgba(11,37,39,0.08);
          box-shadow: 0 12px 30px rgba(11,37,39,0.12);
          border-radius: 10px;
          overflow: hidden;
          z-index: 40;
          display: flex;
          flex-direction: column;
          padding: 6px;
        }

        .menu-item {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          background: transparent;
          border: none;
          cursor: pointer;
          font-weight: 600;
          color: #0b2527;
          text-align: left;
          width: 100%;
          border-radius: 8px;
        }
        .menu-item:hover { 
          background:rgb(11, 37, 39);
          color: white;
        }

        .table-scroll {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          border-radius: 12px;
          background: #fff;
          box-shadow: 0 6px 18px rgba(11,37,39,0.06);
          margin-bottom: 20px;
        }

        table.companies-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 900px;
        }

        thead th {
          text-align: left;
          padding: 16px 20px;
          font-size: 13px;
          font-weight: 700;
          color: #374151;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          border-bottom: 1px solid rgba(11,37,39,0.08);
          white-space: nowrap;
          background: #fafafa;
        }

        .col-id { padding-left: 24px; width: 80px; }
        .col-action { padding-right: 24px; text-align: center; width: 90px; }

        tbody tr {
          border-bottom: 1px solid rgba(11,37,39,0.04);
          transition: background 0.15s ease;
        }
        tbody tr:hover { background: rgba(11,37,39,0.02); }

        .cell { padding: 18px 20px; vertical-align: middle; font-size: 14px; color: #333; }
        .id-cell { font-weight: 800; color: #111827; padding-left: 24px; }
        .name-cell { max-width: 300px; }
        .name-link { color: #1f2a65; font-weight: 700; text-decoration: none; }
        .name-link:hover { text-decoration: underline; }
        .created-cell { color: #6b7280; font-size: 13px; }
        .gestor-cell { color: #374151; }
        .cidade-cell { color: #374151; }
        .email-cell { color: #111827; font-size: 13px; }
        .email-link { color: #0b66a6; text-decoration: none; }
        .email-link:hover { text-decoration: underline; }

        .action-cell { text-align: center; padding-right: 24px; position: relative; }

        .no-results { text-align: center; padding: 28px; color: #6b7280; }

        .pagination-wrapper {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 20px;
          padding: 0 4px;
        }
        .pagination-info { font-size: 14px; color: #6b7280; font-weight: 500; }
        .pagination-controls { display: flex; align-items: center; gap: 8px; }

        .page-arrow {
          display: flex; align-items: center; justify-content: center;
          width: 36px; height: 36px; border-radius: 8px; cursor: pointer; color: #6B7280;
        }
        .page-arrow:hover:not(:disabled) { background: #f9fafb; border-color: #d1d5db; }
        .page-arrow:disabled { opacity: 0.4; cursor: not-allowed; }

        .page-numbers { display: flex; gap: 6px; }
        .page-number {
          display: flex; align-items: center; justify-content: center;
          min-width: 36px; height: 36px; padding: 0 8px;
          border: 1px solid #e5e7eb; background: white; border-radius: 100%; cursor: pointer;
          font-size: 14px; font-weight: 600; color: #374151;
        }
        .page-number:hover { background: #f9fafb; border-color: #d1d5db; }
        .page-number.active { background: #0b2527; color: white; border-color: #0b2527; }

        @media (max-width: 960px) {
          .controls-row { flex-direction: column; align-items: stretch; gap: 12px; }
          .search-box { max-width: 100%; }
          .right-actions { justify-content: flex-end; }
          table.companies-table { min-width: 700px; }
          .action-cell { padding-right: 12px; }
          .pagination-wrapper { flex-direction: column; gap: 16px; align-items: center; }
          .pagination-info { order: 2; }
          .pagination-controls { order: 1; }
        }
      `}</style>
    </div>
  );
}
