'use client';
import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useConfirm } from '@/components/ui/ConfirmProvider';

function extractMessageFromBody(body: any): string | null {
  if (!body) return null;
  if (typeof body === 'string' && body.trim()) return body;
  if (typeof body.message === 'string' && body.message.trim()) return body.message;
  if (typeof body.msg === 'string' && body.msg.trim()) return body.msg;
  if (typeof body.error === 'string' && body.error.trim()) return body.error;
  return null;
}

export default function CompanyRowActions({ companyId }: { companyId: number }) {
  const router = useRouter();
  const confirm = useConfirm();
  const [loading, setLoading] = useState(false);
  const [openMenu, setOpenMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!openMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openMenu]);

  async function handleDelete() {
    if (loading) return;

    const ok = await confirm({
      title: 'Excluir empresa',
      description: 'Tem certeza que deseja excluir esta empresa? Esta ação não pode ser desfeita.',
      confirmLabel: 'Excluir',
      cancelLabel: 'Cancelar',
      danger: true,
    });

    if (!ok) return;

    setLoading(true);
    setOpenMenu(false);

    const loadingId = toast.loading('Excluindo empresa…');

    try {
      const res = await fetch(`/api/companies/${companyId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(body.error || body.message || 'Erro ao deletar empresa');
      }

      const successMsg = extractMessageFromBody(body) || 'Empresa deletada com sucesso!';
      
      toast.success(successMsg, { id: loadingId });

      setTimeout(() => router.refresh(), 800);

    } catch (err: any) {
      console.error('Erro ao deletar empresa:', err);
      const errorMsg = err.message || 'Erro ao deletar empresa';
      toast.error(errorMsg, { id: loadingId });
    } finally {
      setLoading(false);
    }
  }

  function handleEdit() {
    setOpenMenu(false);
    router.push(`/admin/empresas/${companyId}/edit`);
  }

  return (
    <div className="actions-root" ref={menuRef}>
      <button
        className="dots-btn"
        aria-haspopup="menu"
        aria-expanded={openMenu}
        onClick={() => setOpenMenu(!openMenu)}
        title="Mais ações"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="5" r="1.5" fill="currentColor" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" />
          <circle cx="12" cy="19" r="1.5" fill="currentColor" />
        </svg>
      </button>

      {openMenu && (
        <div className="menu" role="menu">
          <button className="menu-item" onClick={handleEdit}>
            Editar
          </button>

          <button className="menu-item danger" onClick={handleDelete} disabled={loading}>
            {loading ? 'Processando...' : 'Excluir'}
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
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          background: transparent;
          border: none;
          padding: 6px;
          border-radius: 6px;
          cursor: pointer;
          transition: background 0.2s ease;
          color: #6b7280;
        }

        .dots-btn:hover {
          background: rgba(11, 37, 39, 0.06);
          color: #0b2527;
        }

        .menu {
          position: absolute;
          right: 0;
          bottom: calc(100% + 4px);
          min-width: 140px;
          background: #fff;
          border: 1px solid rgba(11, 37, 39, 0.08);
          box-shadow: 0 8px 24px rgba(11, 37, 39, 0.12);
          border-radius: 8px;
          overflow: hidden;
          z-index: 100;
          display: flex;
          flex-direction: column;
        }

        .menu-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          text-align: left;
          border: none;
          background: transparent;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          color: #374151;
          transition: all 0.15s ease;
        }

        .menu-item:hover:not(:disabled) {
          background: rgba(11, 37, 39, 0.04);
        }

        .menu-item:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .menu-item.danger {
          color: #dc2626;
        }

        .menu-item.danger:hover:not(:disabled) {
          background: #fef2f2;
        }

        .menu-item svg {
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
}
