// src/components/admin/trilhas/TrilhaItemsSection.tsx
import React from 'react';
import type { TrilhaItemFormState } from './types';

type Props = {
  items: TrilhaItemFormState[];
  onNew: () => void;
  onEdit: (tempId: string) => void;
  onRemove: (tempId: string) => void;
};

export default function TrilhaItemsSection({
  items,
  onNew,
  onEdit,
  onRemove,
}: Props) {
  return (
    <section className="card">
      <div className="card-header-row">
        <div>
          <h2 className="card-title">Eventos da trilha</h2>
          <p className="card-subtitle">
            Adicione os eventos (encontros, workshops, sessões, etc.) que fazem
            parte desta trilha.
          </p>
        </div>

        <button type="button" className="btn-secondary" onClick={onNew}>
          + Adicionar evento
        </button>
      </div>

      <div className="table-scroll">
        <table className="trilha-items-table" cellPadding={0} cellSpacing={0}>
          <thead>
            <tr>
              <th className="col-name">Nome do evento</th>
              <th className="col-type">Tipo</th>
              <th className="col-date">Data</th>
              <th className="col-details">Detalhes</th>
              <th className="col-actions">Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.tempId}>
                <td className="cell name-cell">
                  {item.nome || `Evento ${index + 1}`}
                </td>
                <td className="cell type-cell">{item.tipo || '—'}</td>
                <td className="cell date-cell">
                  {item.data
                    ? new Date(item.data).toLocaleDateString('pt-BR')
                    : '—'}
                </td>
                <td className="cell details-cell">
                  {item.detalhes ? (
                    <span title={item.detalhes}>
                      {item.detalhes.length > 60
                        ? item.detalhes.slice(0, 60) + '...'
                        : item.detalhes}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="cell actions-cell">
                  <button
                    type="button"
                    className="pill-btn pill-secondary"
                    onClick={() => onEdit(item.tempId)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="pill-btn pill-danger"
                    onClick={() => onRemove(item.tempId)}
                  >
                    Remover
                  </button>
                </td>
              </tr>
            ))}

            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="no-results">
                  Nenhum evento adicionado ainda. Clique em{' '}
                  <strong>“Adicionar evento”</strong> para começar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
