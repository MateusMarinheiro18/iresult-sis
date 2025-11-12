// src/components/admin/company/CompanyRowActions.tsx
'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function CompanyRowActions({ companyId }: { companyId: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fecha o menu quando clicar fora
  useEffect(() => {
    if (!open) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  async function handleDelete() {
    if (loading) return;
    if (!confirm('Confirmar exclusão desta empresa?')) return;

    setLoading(true);
    setOpen(false);

    try {
      const res = await fetch(`/api/companies/${companyId}`, {
        method: 'DELETE',
        headers: { Accept: 'application/json' },
      });

      // tenta extrair JSON (se houver)
      let body: any = null;
      try {
        body = await res.json();
      } catch (e) {
        // ignore JSON parse errors
      }

      if (!res.ok) {
        const msg = body?.message ?? `Erro ao deletar (status ${res.status})`;
        alert(msg);
        setLoading(false);
        return;
      }

      // sucesso
      // body may contain { message: 'deleted', item: {...} }
      alert(body?.message ?? 'Empresa deletada com sucesso.');
      // refresha dados server-side / revalidates Server Components
      router.refresh();
    } catch (err) {
      console.error('Erro ao deletar empresa', err);
      alert('Erro inesperado ao deletar. Veja o console.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="actions-root" ref={menuRef}>
      <button
        className="dots-btn"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((s) => !s)}
        title="Mais ações"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="5" r="1.5" fill="#6B7280"/>
          <circle cx="12" cy="12" r="1.5" fill="#6B7280"/>
          <circle cx="12" cy="19" r="1.5" fill="#6B7280"/>
        </svg>
      </button>

      {open && (
        <div className="menu" role="menu">
          <button className="menu-item" onClick={() => {
            setOpen(false);
            router.push(`/admin/empresas/${companyId}/edit`);
          }}>
            Editar
          </button>
          <button className="menu-item danger" onClick={handleDelete} disabled={loading}>
            {loading ? 'Deletando...' : 'Excluir'}
          </button>
        </div>
      )}

      <style jsx>{`
        .actions-root {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: flex-end;
        }

        .dots-btn {
          background: transparent;
          border: none;
          padding: 6px;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.2s ease;
        }
        
        .dots-btn:hover {
          background: rgba(11,37,39,0.06);
        }

        .menu {
          position: absolute;
          right: 0;
          bottom: 100%;
          margin-bottom: 4px;
          min-width: 140px;
          background: #fff;
          border: 1px solid rgba(11,37,39,0.08);
          box-shadow: 0 8px 24px rgba(11,37,39,0.12);
          border-radius: 8px;
          overflow: hidden;
          z-index: 100;
          display: flex;
          flex-direction: column;
        }

        .menu-item {
          padding: 10px 14px;
          text-align: left;
          border: none;
          background: transparent;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          color: #374151;
          transition: background 0.15s ease;
        }

        .menu-item:hover { 
          background: rgba(11,37,39,0.04); 
        }
        
        .menu-item:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .menu-item.danger { 
          color: #dc2626; 
          font-weight: 700; 
        }
        
        .menu-item.danger:hover {
          background: #fef2f2;
        }
      `}</style>
    </div>
  );
}