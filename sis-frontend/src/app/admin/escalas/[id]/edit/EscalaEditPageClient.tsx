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
        {/* HEADER: mesmo layout da página de criação, com botão de excluir */}
        <div className="header-row">
          <div>
            <h1 className="page-title">Editar Escala</h1>
            <p className="page-subtitle">
              Ajuste as informações da escala, perguntas e respostas.
            </p>
          </div>

          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="btn btn-danger"
          >
            {deleting ? 'Excluindo...' : 'Excluir escala'}
          </button>
        </div>

        {/* FORM: versão de edição do builder, com mesmo visual do EscalaBuilderForm */}
        <EscalaBuilderEditForm
          escalaId={escalaId}
          initialData={initialEscala}
        />
      </main>
    </div>
  );
}
