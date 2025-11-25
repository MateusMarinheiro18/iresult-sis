'use client';
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useConfirm } from '@/components/ui/ConfirmProvider';

/**
 * Arquivo do protótipo (referência)
 * Local path: /mnt/data/Psyqué Protótipo Basico.pdf
 * (usado apenas como referência - não é carregado aqui)
 */

function extractMessageFromBody(body: any): string | null {
  if (!body && body !== 0) return null;
  if (typeof body === 'string' && body.trim()) return body.trim();
  if (typeof body === 'object') {
    if (typeof body.message === 'string' && body.message.trim()) return body.message.trim();
    if (typeof body.msg === 'string' && body.msg.trim()) return body.msg.trim();
    if (typeof body.error === 'string' && body.error.trim()) return body.error.trim();
    if (typeof body.data === 'string' && body.data.trim()) return body.data.trim();
  }
  return null;
}

export default function UsersRhRowActions({
  companyId,
  userId,
}: {
  companyId: number;
  userId: number;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [open]);

  async function handleDelete() {
    if (loading) return;

    const ok = await confirm({
      title: 'Excluir usuário RH',
      description: 'Tem certeza que deseja excluir este usuário RH?',
      confirmLabel: 'Excluir',
      cancelLabel: 'Cancelar',
      danger: true,
    });
    if (!ok) return;

    setLoading(true);
    setOpen(false);

    const loadingId = toast.loading('Excluindo usuário RH…');

    try {
      const res = await fetch(
        `/api/companies/${companyId}/usersrh/${userId}`,
        { method: 'DELETE', headers: { Accept: 'application/json' } }
      );

      const text = await res.text().catch(() => '');
      let body: any = {};
      try {
        body = text ? JSON.parse(text) : {};
      } catch {
        body = text;
      }

      if (!res.ok) {
        const msg = extractMessageFromBody(body) ?? 'Erro ao deletar usuário RH.';
        toast.error(msg, { id: loadingId });
        setLoading(false);
        return;
      }

      const successMsg = extractMessageFromBody(body) ?? 'Usuário RH deletado com sucesso.';
      toast.success(successMsg, { id: loadingId });

      setTimeout(() => router.refresh(), 800);
    } catch (err: any) {
      console.error('Erro ao deletar usuário RH', err);
      const msg = err?.message ?? 'Erro inesperado ao deletar usuário RH.';
      toast.error(msg, { id: loadingId });
      setLoading(false);
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
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="12" cy="5" r="1.5" fill="#6B7280" />
          <circle cx="12" cy="12" r="1.5" fill="#6B7280" />
          <circle cx="12" cy="19" r="1.5" fill="#6B7280" />
        </svg>
      </button>

      {open && (
        <div className="menu" role="menu">
          <button
            className="menu-item"
            onClick={() => {
              setOpen(false);
              router.push(
                `/admin/empresas/${companyId}/usuariosrh/${userId}/edit`
              );
            }}
          >
            Editar
          </button>
          <button
            className="menu-item danger"
            onClick={handleDelete}
            disabled={loading}
          >
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
          background: rgba(11, 37, 39, 0.06);
        }
        .menu {
          position: absolute;
          right: 0;
          bottom: 100%;
          margin-bottom: 4px;
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
          background: rgba(11, 37, 39, 0.04);
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
