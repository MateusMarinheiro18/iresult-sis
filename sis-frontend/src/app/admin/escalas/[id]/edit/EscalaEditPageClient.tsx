// src/app/admin/escalas/[id]/edit/EscalaEditPageClient.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import EscalaBuilderEditForm from '@/components/admin/escalas/EscalaBuilderEditForm';
import type { EscalaFormState } from '@/components/admin/escalas/EscalaBuilderForm';

type Props = {
  escalaId: number;
  // initialEscala já vem no formato EscalaFormState (com perguntas, respostas, etc.)
  initialEscala: EscalaFormState;
};

export default function EscalaEditPageClient({ escalaId, initialEscala }: Props) {
  const router = useRouter();
  const confirm = useConfirm();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    try {
      const ok = await confirm({
        title: 'Excluir escala',
        description:
          'Tem certeza que deseja excluir esta escala? Esta ação não pode ser desfeita.',
        confirmLabel: 'Excluir',
        cancelLabel: 'Cancelar',
        danger: true,
      });

      if (!ok) return;

      setDeleting(true);

      const res = await fetch(`/api/escalas/${escalaId}`, {
        method: 'DELETE',
      });

      if (!res.ok && res.status !== 204) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || 'Erro ao excluir escala');
      }

      toast.success('Escala excluída com sucesso!');
      router.push('/admin/escalas');
      router.refresh();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Não foi possível excluir a escala.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="page-root">
      <main className="container">
        <header className="header-row">
          <div>
            <h1 className="page-title">Editar Escala</h1>
            <p className="page-subtitle">
              Ajuste as informações da escala, perguntas e respostas.
            </p>
          </div>

          <div className="header-actions">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="btn-delete"
            >
              {deleting ? 'Excluindo...' : 'Excluir escala'}
            </button>

            <button
              type="button"
              className="back-btn"
              onClick={() => router.push('/admin/escalas')}
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
        </header>

        <EscalaBuilderEditForm escalaId={escalaId} initialData={initialEscala} />
      </main>

      <style jsx>{`
        .page-root {
          width: 100%;
        }

        .container {
          max-width: 1120px;
          margin: 0 auto;
          padding: 24px 16px 40px;
        }

        .header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
          gap: 12px;
        }

        .page-title {
          font-size: 20px;
          font-weight: 700;
          color: #0b2527;
          margin: 0 0 4px;
        }

        .page-subtitle {
          font-size: 14px;
          color: #6b7280;
          margin: 0;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .btn-delete {
          background: #ffffff;
          border: 1px solid #dc2626;
          color: #dc2626;
          padding: 8px 14px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
          white-space: nowrap;
        }

        .btn-delete:hover:not(:disabled) {
          background: #dc2626;
          color: #ffffff;
        }

        .btn-delete:disabled {
          opacity: 0.6;
          cursor: not-allowed;
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
          background: transparent;
          transition: background 0.15s ease, transform 0.1s ease;
        }

        @media (max-width: 960px) {
          .header-row {
            flex-direction: column;
            align-items: stretch;
          }

          .header-actions {
            justify-content: flex-end;
            flex-wrap: wrap;
          }
        }
      `}</style>
    </div>
  );
}
