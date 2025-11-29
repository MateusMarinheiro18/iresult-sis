// src/components/admin/trilhas/TrilhaItemModal.tsx
import React from 'react';
import type { TrilhaItemFormState } from './types';

type Props = {
  open: boolean;
  item: TrilhaItemFormState | null;
  isEditing: boolean;
  onChangeField: (field: 'nome' | 'tipo' | 'data' | 'detalhes', value: string) => void;
  onCancel: () => void;
  onSave: () => void;
};

export default function TrilhaItemModal({
  open,
  item,
  isEditing,
  onChangeField,
  onCancel,
  onSave,
}: Props) {
  if (!open || !item) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <div className="modal-header">
          <h2 className="modal-title">
            {isEditing ? 'Editar evento' : 'Novo evento'}
          </h2>
          <button
            type="button"
            className="modal-close"
            onClick={onCancel}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="field">
            <label className="label">
              Nome do evento <span className="required">*</span>
            </label>
            <input
              className="input"
              value={item.nome}
              onChange={(e) => onChangeField('nome', e.target.value)}
              placeholder="Ex.: Workshop de Comunicação Não-Violenta"
            />
          </div>

          <div className="field-grid modal-grid">
            <div className="field">
              <label className="label">Tipo</label>
              <input
                className="input"
                value={item.tipo}
                onChange={(e) => onChangeField('tipo', e.target.value)}
                placeholder="Ex.: Workshop, sessão individual..."
              />
            </div>

            <div className="field">
              <label className="label">Data</label>
              <input
                type="date"
                className="input"
                value={item.data}
                onChange={(e) => onChangeField('data', e.target.value)}
              />
            </div>
          </div>

          <div className="field">
            <label className="label">Detalhes</label>
            <textarea
              className="textarea"
              value={item.detalhes}
              onChange={(e) => onChangeField('detalhes', e.target.value)}
              placeholder="Descrição do que será abordado neste evento."
            />
          </div>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="btn-secondary"
            onClick={onCancel}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={onSave}
          >
            {isEditing ? 'Salvar alterações' : 'Adicionar evento'}
          </button>
        </div>
      </div>
    </div>
  );
}
