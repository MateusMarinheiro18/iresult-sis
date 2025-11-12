// src/components/admin/company/CompaniesTableClient.tsx
'use client';
import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import CompanyRowActions from './CompanyRowActions';
import { useRouter } from 'next/navigation';

type Company = {
  id: number;
  razaoSocial?: string | null;
  cnpj?: string | null;
  telefone?: string | null;
  created?: string | Date | null;
};

export default function CompaniesTableClient({ initialData }: { initialData: Company[] }) {
  const [query, setQuery] = useState('');
  const router = useRouter();

  // filtra por nome (razaoSocial) - case insensitive
  const filtered = useMemo(() => {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return initialData;
    return initialData.filter((c) => (c.razaoSocial ?? '').toLowerCase().includes(q));
  }, [initialData, query]);

  return (
    <div className="wrapper">
      <div className="controls-row">
        <div className="search-box" role="search" aria-label="Buscar empresa por nome">
          <div className="search-icon" aria-hidden>
            {/* lupa SVG */}
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
            aria-label="Buscar empresas por nome"
          />
        </div>

        <div className="right-actions">
          <button className="btn-new" onClick={() => router.push('/admin/empresas/new')}>Nova Empresa</button>
        </div>
      </div>

      {/* scroll wrapper para responsividade horizontal */}
      <div className="table-scroll">
        <table className="companies-table" cellPadding={0} cellSpacing={0}>
          <thead>
            <tr>
              <th className="col-id">ID</th>
              <th className="col-name">Nome</th>
              <th className="col-cnpj">CNPJ</th>
              <th className="col-phone">Telefone</th>
              <th className="col-users">Funcionários</th>
              <th className="col-action">Ação</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((c) => (
              <tr key={c.id}>
                <td className="cell id-cell">#{c.id}</td>

                <td className="cell name-cell">
                  <Link href={`/admin/empresas/${c.id}`} className="name-link">
                    {c.razaoSocial ?? '—'}
                  </Link>
                </td>

                <td className="cell cnpj-cell">{formatCnpj(c.cnpj)}</td>

                <td className="cell phone-cell">{formatPhone(c.telefone)}</td>

                <td className="cell users-cell">
                  <a href={`/admin/empresas/${c.id}/funcionarios`} className="pill-btn">
                    Usuários
                  </a>
                </td>

                <td className="cell action-cell">
                  <CompanyRowActions companyId={c.id} />
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="no-results">Nenhuma empresa encontrada.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <style jsx>{`
        .wrapper {
          display: block;
          gap: 12px;
        }

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
        .search-input::placeholder { color: #9ca3af; }

        .right-actions { display: flex; gap: 8px; }

        .btn-new {
          background: transparent;
          border: 1px solid #0b2527;
          color: #0b2527;
          padding: 8px 14px;
          border-radius: 999px;
          text-decoration: none;
          font-weight: 700;
          cursor: pointer;
        }

        /* scroll wrapper: permite rolagem horizontal em small screens */
        .table-scroll {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          border-radius: 12px;
          background: #fff;
          box-shadow: 0 6px 18px rgba(11,37,39,0.06);
        }

        table.companies-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 900px; /* garante que em telas pequenas apareça scroll horizontal */
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
        
        .col-id { padding-left: 24px; }
        .col-action { padding-right: 24px; text-align: center; }

        tbody tr { 
          border-bottom: 1px solid rgba(11,37,39,0.04); 
          transition: background 0.15s ease;
        }
        tbody tr:hover { background: rgba(11,37,39,0.02); }

        .cell { 
          padding: 18px 20px; 
          vertical-align: middle; 
          font-size: 14px; 
          color: #333; 
        }
        
        .id-cell { 
          font-weight: 800; 
          color: #111827; 
          width: 80px;
          padding-left: 24px;
        }
        
        .name-cell {
          max-width: 300px;
        }
        
        .name-link { 
          color: #1f2a65; 
          font-weight: 700; 
          text-decoration: none; 
        }
        
        .name-link:hover {
          text-decoration: underline;
        }
        
        .cnpj-cell { 
          color: #9aa0ab;
          font-family: monospace;
        }
        
        .phone-cell { 
          color: #374151;
          white-space: nowrap;
        }

        .users-cell {
          text-align: left;
        }

        /* pill button for users - VERDE ARREDONDADO */
        .pill-btn {
          display: inline-block;
          padding: 7px 18px;
          background: #0B2527;
          color: white;
          border-radius: 999px;
          text-decoration: none;
          font-weight: 600;
          font-size: 13px;
          transition: background 0.2s ease;
          white-space: nowrap;
        }
        
        .pill-btn:hover {
          background:rgba(11, 37, 39, 0.87);
        }

        .action-cell { 
          width: 80px; 
          text-align: center;
          padding-right: 24px;
          position: relative;
        }

        .no-results {
          text-align: center;
          padding: 28px;
          color: #6b7280;
        }

        /* Responsive: when viewport is narrow, allow horizontal scroll (user can pan) */
        @media (max-width: 960px) {
          .controls-row { flex-direction: column; align-items: stretch; gap: 12px; }
          .search-box { max-width: 100%; }
          .right-actions { justify-content: flex-end; }
          table.companies-table { min-width: 700px; } /* keep some scroll but not too large */
          .action-cell { padding-right: 12px; }
        }
      `}</style>
    </div>
  );
}

/* helpers */
function formatCnpj(c?: string | null) {
  if (!c) return '—';
  const digits = String(c).replace(/\D/g, '');
  if (digits.length !== 14) return c;
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

function formatPhone(p?: string | null) {
  if (!p) return '—';
  const d = String(p).replace(/\D/g, '');
  if (d.length === 11) return d.replace(/^(\d{2})(\d{1})(\d{4})(\d{4})$/, '($1) $2 $3-$4');
  if (d.length === 10) return d.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
  return p;
}