'use client';
import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import UsersRhRowActions from './UsersRhRowActions';

type UserRh = {
  id_usuario_rh: number;
  nome?: string | null;
  email?: string | null;
  telefone?: string | null;
  data_nascimento?: string | Date | null;
  cidade?: string | null;
  gestor?: string | null;
  created?: string | Date | null;
  deleted?: string | Date | null;
  updated?: string | Date | null;
  ativo?: number | boolean | null;
};

const ITEMS_PER_PAGE = 5;

export default function UsersRhTableClient({
  companyId,
  initialData,
}: {
  companyId: number;
  initialData: UserRh[];
}) {
  const [query, setQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const router = useRouter();

  // filtro por nome ou email (case-insensitive)
  const filtered = useMemo(() => {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return initialData;
    return initialData.filter((e) =>
      ((e.nome ?? '').toLowerCase().includes(q) || (e.email ?? '').toLowerCase().includes(q))
    );
  }, [initialData, query]);

  // reset página ao mudar busca
  React.useEffect(() => {
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

  // Função para formatar data no formato brasileiro
  function formatDateBR(date: string | Date | null | undefined): string {
    if (!date) return '—';

    try {
      const d = typeof date === 'string' ? new Date(date) : date;

      // Usa UTC para evitar problemas de timezone
      const day = String(d.getUTCDate()).padStart(2, '0');
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const year = d.getUTCFullYear();

      return `${day}/${month}/${year}`;
    } catch {
      return '—';
    }
  }

  function goToCreate() {
    router.push(`/admin/empresas/${companyId}/usuariosrh/new`);
  }

  return (
    <div className="wrapper">
      <div className="controls-row">
        <div className="search-box" role="search" aria-label="Buscar usuário RH por nome ou email">
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
            aria-label="Buscar usuários RH por nome ou email"
          />
        </div>

        <div className="right-actions">
          <button
            className="btn-new"
            onClick={goToCreate}
            aria-label="Criar novo usuário RH"
            title="Novo usuário RH"
          >
            Novo Usuário RH
          </button>
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
              <th className="col-cidade">Cidade</th>
              <th className="col-email">Email</th>
              <th className="col-action">Ação</th>
            </tr>
          </thead>

          <tbody>
            {currentItems.map((e) => (
              <tr key={e.id_usuario_rh}>
                <td className="cell id-cell">#{e.id_usuario_rh}</td>

                <td className="cell name-cell">
                  <Link href={`/admin/empresas/${companyId}/usuariosrh/${e.id_usuario_rh}`} className="name-link">
                    {e.nome ?? '—'}
                  </Link>
                </td>

                <td className="cell created-cell">{formatDateBR(e.created ?? e.updated ?? e.data_nascimento)}</td>

                <td className="cell gestor-cell">{e.gestor ?? '—'}</td>

                <td className="cell cidade-cell">{e.cidade ?? '—'}</td>

                <td className="cell email-cell">
                  {e.email ? (
                    <a href={`mailto:${e.email}`} className="email-link">{e.email}</a>
                  ) : '—'}
                </td>

                <td className="cell action-cell">
                  <UsersRhRowActions companyId={companyId} userId={e.id_usuario_rh} />
                </td>
              </tr>
            ))}

            {currentItems.length === 0 && (
              <tr>
                <td colSpan={7} className="no-results">Nenhum usuário RH encontrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {totalItems > 0 && (
        <div className="pagination-wrapper">
          <div className="pagination-info">
            Mostrando {startIndex + 1}-{Math.min(endIndex, totalItems)} de {totalItems} {totalItems === 1 ? 'usuário RH' : 'usuários RH'}
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

        .btn-new {
          background: transparent;
          border: 1px solid #421E97;
          color: #421E97;
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
        .btn-new:hover { background: #421E97; color: white; }

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
        .page-number.active { background: #421E97; color: white; border-color: #421E97; }

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
