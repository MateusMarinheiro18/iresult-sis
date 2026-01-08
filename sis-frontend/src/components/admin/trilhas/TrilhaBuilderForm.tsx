// src/components/admin/trilhas/TrilhaBuilderForm.tsx
'use client';

import React, { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

import type { TrilhaFormState, TrilhaItemFormState } from './types';
import TrilhaBasicDataSection from './TrilhaBasicDataSection';
import TrilhaItemsSection from './TrilhaItemsSection';
import TrilhaItemModal from './TrilhaItemModal';

type Props = {
  mode: 'create' | 'edit';
  trilhaId?: number; // obrigatório se mode === 'edit'
  initialData?: TrilhaFormState;
  createdAtLabel?: string; // apenas para exibição na edição
};

function createTempId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createEmptyItem(): TrilhaItemFormState {
  return {
    tempId: createTempId('item'),
    nome: '',
    tipo: '',
    data: '',
    detalhes: '',
  };
}

export default function TrilhaBuilderForm({
  mode,
  trilhaId,
  initialData,
  createdAtLabel,
}: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [state, setState] = useState<TrilhaFormState>(() => {
    if (initialData) return initialData;

    return {
      nome: '',
      ativo: true,
      itens: [],
    };
  });

  // ---- Modal ----
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTempId, setEditingTempId] = useState<string | null>(null);
  const [modalItem, setModalItem] = useState<TrilhaItemFormState | null>(null);

  function openNewItemModal() {
    setEditingTempId(null);
    setModalItem(createEmptyItem());
    setModalOpen(true);
  }

  function openEditItemModal(tempId: string) {
    const existing = state.itens.find((i) => i.tempId === tempId);
    if (!existing) return;
    setEditingTempId(tempId);
    setModalItem({ ...existing });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setModalItem(null);
    setEditingTempId(null);
  }

  function handleModalChangeField(
    field: 'nome' | 'tipo' | 'data' | 'detalhes',
    value: string
  ) {
    setModalItem((prev) => (prev ? { ...prev, [field]: value } : prev));
  }

  function handleSaveItemFromModal() {
    if (!modalItem) return;

    const nome = modalItem.nome.trim();
    if (!nome) {
      toast.error('Informe o nome do evento.');
      return;
    }

    setState((prev) => {
      if (editingTempId) {
        // edição
        return {
          ...prev,
          itens: prev.itens.map((i) =>
            i.tempId === editingTempId ? { ...modalItem } : i
          ),
        };
      }
      // novo
      return {
        ...prev,
        itens: [...prev.itens, { ...modalItem, tempId: createTempId('item') }],
      };
    });

    closeModal();
  }

  function removeItem(tempId: string) {
    setState((prev) => ({
      ...prev,
      itens: prev.itens.filter((i) => i.tempId !== tempId),
    }));
  }

  // ---- Atualização de campos da trilha ----
  function updateNome(nome: string) {
    setState((prev) => ({ ...prev, nome }));
  }

  function updateAtivo(ativo: boolean) {
    setState((prev) => ({ ...prev, ativo }));
  }

  // ---- Submit ----
  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;

    const nome = state.nome.trim();
    if (!nome) {
      toast.error('Informe o nome da trilha.');
      return;
    }

    if (!state.itens.length) {
      toast.error('Adicione pelo menos um evento na trilha.');
      return;
    }

    for (let i = 0; i < state.itens.length; i++) {
      const item = state.itens[i];
      if (!item.nome.trim()) {
        toast.error(`Evento ${i + 1}: nome é obrigatório.`);
        return;
      }
    }

    const payload = {
      nome,
      ativo: state.ativo ? 1 : 0,
      itens: state.itens.map((i) => ({
        id: i.id,
        nome: i.nome.trim(),
        tipo: i.tipo.trim() || null,
        data: i.data || null,
        detalhes: i.detalhes.trim() || null,
      })),
    };

    const url =
      mode === 'create'
        ? '/api/trilhas/builder'
        : trilhaId
        ? `/api/trilhas/${trilhaId}`
        : null;

    if (!url && mode === 'edit') {
      toast.error('ID da trilha não informado para edição.');
      return;
    }

    const method = mode === 'create' ? 'POST' : 'PUT';
    const successMessage =
      mode === 'create'
        ? 'Trilha criada com sucesso!'
        : 'Trilha atualizada com sucesso!';

    setSaving(true);
    fetch(url as string, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || 'Erro ao salvar trilha.');
        }
        toast.success(successMessage);
        router.push('/admin/trilhas');
      })
      .catch((err: any) => {
        console.error(err);
        toast.error(err.message || 'Erro ao salvar trilha.');
      })
      .finally(() => setSaving(false));
  }

  return (
    <div className="trilha-builder">
      <form className="trilha-form" onSubmit={handleSubmit}>
        <TrilhaBasicDataSection
          nome={state.nome}
          ativo={state.ativo}
          onChangeNome={updateNome}
          onChangeAtivo={updateAtivo}
          createdAtLabel={createdAtLabel}
        />

        <TrilhaItemsSection
          items={state.itens}
          onNew={openNewItemModal}
          onEdit={openEditItemModal}
          onRemove={removeItem}
        />

        <div className="footer-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => router.push('/admin/trilhas')}
            disabled={saving}
          >
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar trilha'}
          </button>
        </div>
      </form>

      <TrilhaItemModal
        open={modalOpen}
        item={modalItem}
        isEditing={!!editingTempId}
        onChangeField={handleModalChangeField}
        onCancel={closeModal}
        onSave={handleSaveItemFromModal}
      />

      {/* CSS escopado em .trilha-builder */}
      <style jsx global>{`
        .trilha-builder .trilha-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .trilha-builder .card {
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 6px 18px rgba(11, 37, 39, 0.06);
          padding: 20px 20px 18px;
        }

        .trilha-builder .card-title {
          font-size: 18px;
          font-weight: 700;
          color: #111827;
          margin: 0 0 4px;
        }

        .trilha-builder .card-subtitle {
          font-size: 13px;
          color: #6b7280;
          margin: 0 0 14px;
        }

        .trilha-builder .card-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .trilha-builder .field-grid {
          display: grid;
          grid-template-columns: minmax(0, 2fr) auto;
          gap: 16px;
          align-items: flex-end;
        }

        .trilha-builder .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .trilha-builder .label {
          font-size: 13px;
          font-weight: 600;
          color: #374151;
        }

        .trilha-builder .required {
          color: #b91c1c;
          margin-left: 2px;
        }

        .trilha-builder .input,
        .trilha-builder .textarea {
          width: 100%;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          padding: 8px 10px;
          font-size: 14px;
          color: #111827;
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .trilha-builder .textarea {
          min-height: 70px;
          resize: vertical;
        }

        .trilha-builder .input:focus,
        .trilha-builder .textarea:focus {
          border-color: #421E97;
          box-shadow: 0 0 0 1px rgba(11, 37, 39, 0.1);
        }

        .trilha-builder .switch-field {
          align-items: flex-start;
        }

        .trilha-builder .switch {
          position: relative;
          display: inline-block;
          width: 42px;
          height: 24px;
        }

        .trilha-builder .switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .trilha-builder .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #d1d5db;
          transition: 0.2s;
          border-radius: 999px;
        }

        .trilha-builder .slider::before {
          position: absolute;
          content: '';
          height: 18px;
          width: 18px;
          left: 3px;
          top: 3px;
          background-color: white;
          transition: 0.2s;
          border-radius: 50%;
        }

        .trilha-builder .switch input:checked + .slider {
          background-color: #421E97;
        }

        .trilha-builder .switch input:checked + .slider::before {
          transform: translateX(18px);
        }

        /* Tabela de eventos */
        .trilha-builder .table-scroll {
          width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          border-radius: 12px;
          background: #fff;
          border: 1px solid rgba(11, 37, 39, 0.06);
        }

        .trilha-builder table.trilha-items-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 700px;
        }

        .trilha-builder thead th {
          text-align: left;
          padding: 12px 16px;
          font-size: 12px;
          font-weight: 700;
          color: #374151;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          border-bottom: 1px solid rgba(11, 37, 39, 0.08);
          white-space: nowrap;
          background: #fafafa;
        }

        .trilha-builder .col-date {
          min-width: 130px;
        }

        .trilha-builder .col-type {
          min-width: 140px;
        }

        .trilha-builder .col-details {
          min-width: 200px;
        }

        .trilha-builder .col-actions {
          min-width: 160px;
          text-align: right;
        }

        .trilha-builder tbody tr {
          border-bottom: 1px solid rgba(11, 37, 39, 0.04);
          transition: background 0.15s ease;
        }

        .trilha-builder tbody tr:hover {
          background: rgba(11, 37, 39, 0.02);
        }

        .trilha-builder .cell {
          padding: 14px 16px;
          vertical-align: middle;
          font-size: 14px;
          color: #333;
        }

        .trilha-builder .name-cell {
          font-weight: 600;
          color: #111827;
        }

        .trilha-builder .type-cell,
        .trilha-builder .date-cell {
          white-space: nowrap;
        }

        .trilha-builder .details-cell {
          font-size: 13px;
          color: #4b5563;
        }

        .trilha-builder .actions-cell {
          text-align: right;
          white-space: nowrap;
        }

        .trilha-builder .pill-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 6px 12px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
          border: 1px solid transparent;
          cursor: pointer;
          white-space: nowrap;
          text-decoration: none;
          transition: all 0.2s ease;
          margin-left: 6px;
        }

        .trilha-builder .pill-secondary {
          background: white;
          color: #421E97;
          border-color: #421E97;
        }

        .trilha-builder .pill-secondary:hover {
          background: #f3f4ff;
        }

        .trilha-builder .pill-danger {
          background: #fef2f2;
          color: #b91c1c;
          border-color: #fecaca;
        }

        .trilha-builder .pill-danger:hover {
          background: #fee2e2;
        }

        .trilha-builder .no-results {
          text-align: center;
          padding: 24px;
          color: #6b7280;
          font-size: 14px;
        }

        .trilha-builder .btn-primary,
        .trilha-builder .btn-secondary {
          border-radius: 999px;
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          border: 1px solid transparent;
          transition: all 0.15s ease;
          white-space: nowrap;
        }

        .trilha-builder .btn-primary {
          background: #421E97;
          color: #ffffff;
          border-color: #421E97;
        }

        .trilha-builder .btn-primary:hover {
          background: #134148;
          border-color: #134148;
        }

        .trilha-builder .btn-secondary {
          background: #ffffff;
          color: #421E97;
          border-color: #421E97;
        }

        .trilha-builder .btn-secondary:hover {
          background: #f3f4ff;
        }

        .trilha-builder .footer-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 4px;
        }

        /* Modal */
        .trilha-builder .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.45);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 50;
          padding: 16px;
        }

        .trilha-builder .modal-card {
          background: #ffffff;
          border-radius: 16px;
          width: 100%;
          max-width: 520px;
          box-shadow: 0 16px 40px rgba(15, 23, 42, 0.25);
          padding: 18px 18px 14px;
        }

        .trilha-builder .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .trilha-builder .modal-title {
          font-size: 17px;
          font-weight: 700;
          color: #111827;
          margin: 0;
        }

        .trilha-builder .modal-close {
          border: none;
          background: transparent;
          font-size: 22px;
          line-height: 1;
          cursor: pointer;
          color: #6b7280;
        }

        .trilha-builder .modal-close:hover {
          color: #111827;
        }

        .trilha-builder .modal-body {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .trilha-builder .modal-grid {
          grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
        }

        .trilha-builder .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 14px;
        }

        @media (max-width: 960px) {
          .trilha-builder .field-grid {
            grid-template-columns: minmax(0, 1fr);
          }

          .trilha-builder .footer-actions {
            flex-direction: column-reverse;
            align-items: stretch;
          }

          .trilha-builder table.trilha-items-table {
            min-width: 650px;
          }

          .trilha-builder .modal-card {
            max-width: 100%;
          }

          .trilha-builder .modal-grid {
            grid-template-columns: minmax(0, 1fr);
          }
        }
      `}</style>
    </div>
  );
}
