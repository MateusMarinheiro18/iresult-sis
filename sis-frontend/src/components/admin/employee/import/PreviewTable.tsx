'use client';
import React from 'react';
import { EmployeeRow } from './validators';

type GroupOption = {
  id: number;
  nome: string;
};

type Props = {
  rows: EmployeeRow[];
  errorsByRow: Record<number, string[]>;
  previewLimit?: number;
  onEditCell: (idx: number, key: string, value: string) => void;
  onRemoveRow: (idx: number) => void;
  groups: GroupOption[];
};

export default function PreviewTable({
  rows,
  errorsByRow,
  previewLimit = 200,
  onEditCell,
  onRemoveRow,
  groups,
}: Props) {
  // Função para formatar data ISO para formato brasileiro DD/MM/YYYY
  function formatDateForDisplay(dateStr: string | null | undefined): string {
    if (!dateStr) return '';

    // Se está em formato ISO (YYYY-MM-DD), converte para DD/MM/YYYY
    const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
    }

    // Se já está em formato brasileiro DD/MM/YYYY, retorna como está
    const brMatch = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (brMatch) {
      return dateStr;
    }

    // Tenta fazer parse da data
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        const day = String(d.getUTCDate()).padStart(2, '0');
        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
        const year = d.getUTCFullYear();
        return `${day}/${month}/${year}`;
      }
    } catch {}

    return dateStr;
  }

  // Função para converter DD/MM/YYYY de volta para ISO ao editar
  function handleDateEdit(idx: number, value: string) {
    // Se usuário digitou em formato DD/MM/YYYY, converte para ISO
    const brMatch = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (brMatch) {
      const isoDate = `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`;
      onEditCell(idx, 'data_nascimento', isoDate);
      return;
    }

    // Se está em formato ISO ou outro, passa direto
    onEditCell(idx, 'data_nascimento', value);
  }

  // sanitize digits helper
  function sanitizeDigits(s?: string | null) {
    return s ? s.replace(/\D/g, '') : '';
  }

  // Formata telefone BR incremental (exibe máscara)
  function formatPhoneForDisplay(value?: string | null) {
    const raw = (value ?? '').replace(/\D/g, '');
    if (!raw) return '';

    let digits = raw;
    let country = '';

    if (digits.length > 11) {
      country = digits.slice(0, digits.length - 11);
      digits = digits.slice(digits.length - 11);
    }

    const parts: string[] = [];
    if (country) parts.push(`+${country}`);

    if (digits.length <= 2) {
      parts.push(digits);
      return parts.join(' ').trim();
    }

    const ddd = digits.slice(0, 2);
    const rest = digits.slice(2);

    if (rest.length === 0) {
      parts.push(`(${ddd})`);
      return parts.join(' ').trim();
    }

    if (rest.length <= 4) {
      parts.push(`(${ddd}) ${rest}`);
      return parts.join(' ').trim();
    }

    if (rest.length <= 7) {
      parts.push(`(${ddd}) ${rest.slice(0, rest.length - 4)}-${rest.slice(-4)}`);
      return parts.join(' ').trim();
    }

    if (rest.length <= 10) {
      parts.push(`(${ddd}) ${rest.slice(0, rest.length - 4)}-${rest.slice(-4)}`);
      return parts.join(' ').trim();
    }

    // 11+ digits
    parts.push(`(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5, 9)}`);
    return parts.join(' ').trim();
  }

  function getGroupSelectValue(row: EmployeeRow): string {
    const raw = (row.grupo ?? '').toString().trim();
    if (!raw) return '';
    const match = groups.find((g) => g.nome.toLowerCase() === raw.toLowerCase());
    return match ? match.nome : '';
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Nome</th>
            <th>Email</th>
            <th>Telefone</th>
            <th>Data Nasc.</th>
            <th>Cidade Nasc.</th>
            <th>Grupo</th>
            <th>Gestor</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, previewLimit).map((r, idx) => {
            const telefoneDisplay = formatPhoneForDisplay(r.telefone ?? '');
            const originalGroupName = (r.grupo ?? '').toString().trim();
            const selectValue = groups.length > 0 ? getGroupSelectValue(r) : '';
            const groupHasMatch =
              !!originalGroupName &&
              !!groups.find(
                (g) => g.nome.toLowerCase() === originalGroupName.toLowerCase()
              );

            return (
              <tr key={idx} className={errorsByRow[idx] ? 'row-error' : ''}>
                <td>{r.origem_linha ?? idx + 1}</td>
                <td>
                  <input
                    value={r.nome ?? ''}
                    onChange={(e) => onEditCell(idx, 'nome', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    value={r.email ?? ''}
                    onChange={(e) => onEditCell(idx, 'email', e.target.value)}
                  />
                </td>
                <td>
                  <input
                    value={telefoneDisplay}
                    onChange={(e) => {
                      const rawDigits = sanitizeDigits(e.target.value);
                      const formatted = formatPhoneForDisplay(rawDigits);
                      // envia só dígitos para o row
                      onEditCell(idx, 'telefone', rawDigits);
                      // o valor exibido vem do estado pai (rows)
                    }}
                  />
                </td>
                <td>
                  <input
                    value={formatDateForDisplay(r.data_nascimento ?? '')}
                    onChange={(e) => handleDateEdit(idx, e.target.value)}
                    placeholder="DD/MM/AAAA"
                  />
                </td>
                <td>
                  <input
                    value={r.cidade_nascimento ?? ''}
                    onChange={(e) =>
                      onEditCell(idx, 'cidade_nascimento', e.target.value)
                    }
                  />
                </td>
                <td>
                  {groups.length > 0 ? (
                    <div className="group-cell">
                      <select
                        className="group-select"
                        value={selectValue}
                        onChange={(e) => onEditCell(idx, 'grupo', e.target.value)}
                      >
                        <option value="">Selecione um grupo</option>
                        {groups.map((g) => (
                          <option key={g.id} value={g.nome}>
                            {g.nome}
                          </option>
                        ))}
                      </select>
                      {!groupHasMatch && originalGroupName && (
                        <div className="group-hint">
                          Valor no arquivo: <span>{originalGroupName}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <input
                      value={r.grupo ?? ''}
                      onChange={(e) => onEditCell(idx, 'grupo', e.target.value)}
                      placeholder="Grupo"
                    />
                  )}
                </td>
                <td>
                  <input
                    value={r.gestor ?? ''}
                    onChange={(e) => onEditCell(idx, 'gestor', e.target.value)}
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className="btn small danger"
                    onClick={() => onRemoveRow(idx)}
                  >
                    Remover
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <style jsx>{`
        .table-wrap {
          overflow-x: auto;            /* scroll lateral quando não couber */
          border-radius: 8px;
          border: 1px solid #eee;
          background: white;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          min-width: 1050px;           /* garante espaço + scroll */
        }
        thead {
          background: #0b2527;
          color: white;
        }
        th {
          padding: 12px 10px;
          text-align: left;
          font-weight: 600;
          font-size: 14px;
        }
        td {
          padding: 8px 10px;
          border-bottom: 1px solid #f3f4f6;
          text-align: left;
          color: #374151;
        }
        input {
          width: 100%;
          padding: 6px 8px;
          border-radius: 6px;
          border: 1px solid #e6e6e6;
          font-size: 13px;
        }
        input:focus {
          outline: none;
          border-color: #0b2527;
        }
        tr.row-error td {
          background: #fee2e2;
          border-left: 3px solid #ef4444;
        }
        tr.row-error input {
          background: #fff;
          border-color: #ef4444;
        }
        .btn {
          padding: 6px 12px;
          border-radius: 6px;
          border: none;
          background: #ef4444;
          color: white;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.2s ease;
        }
        .btn:hover {
          background: #dc2626;
        }
        .btn.small {
          padding: 6px 10px;
          font-size: 12px;
        }
        tbody tr:hover td {
          background: #f9fafb;
        }
        tbody tr.row-error:hover td {
          background: #fecaca;
        }
        .group-cell {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .group-select {
          width: 100%;
          padding: 6px 8px;
          border-radius: 6px;
          border: 1px solid #e6e6e6;
          font-size: 13px;
          background: #fff;
        }
        .group-select:focus {
          outline: none;
          border-color: #0b2527;
        }
        .group-hint {
          font-size: 11px;
          color: #6b7280;
        }
        .group-hint span {
          font-weight: 500;
          color: #374151;
        }
      `}</style>
    </div>
  );
}
