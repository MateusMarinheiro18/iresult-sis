'use client';
import React from 'react';
import { EmployeeRow } from './validators';

type Props = {
  rows: EmployeeRow[];
  errorsByRow: Record<number, string[]>;
  previewLimit?: number;
  onEditCell: (idx: number, key: string, value: string) => void;
  onRemoveRow: (idx: number) => void;
};

export default function PreviewTable({ rows, errorsByRow, previewLimit = 200, onEditCell, onRemoveRow }: Props) {
  // Função helper para formatar data ISO para formato brasileiro
  function formatDateForDisplay(dateStr: string | null | undefined): string {
    if (!dateStr) return '';
    
    // Se já está em formato ISO (YYYY-MM-DD), converte para DD/MM/YYYY
    const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
    }
    
    // Se já está em formato brasileiro, retorna como está
    return dateStr;
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
            <th>Gestor</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, previewLimit).map((r, idx) => (
            <tr key={idx} className={errorsByRow[idx] ? 'row-error' : ''}>
              <td>{r.origem_linha ?? idx + 1}</td>
              <td><input value={r.nome ?? ''} onChange={(e) => onEditCell(idx, 'nome', e.target.value)} /></td>
              <td><input value={r.email ?? ''} onChange={(e) => onEditCell(idx, 'email', e.target.value)} /></td>
              <td><input value={r.telefone ?? ''} onChange={(e) => onEditCell(idx, 'telefone', e.target.value)} /></td>
              <td><input value={formatDateForDisplay(r.data_nascimento)} onChange={(e) => onEditCell(idx, 'data_nascimento', e.target.value)} /></td>
              <td><input value={r.cidade_nascimento ?? ''} onChange={(e) => onEditCell(idx, 'cidade_nascimento', e.target.value)} /></td>
              <td><input value={r.gestor ?? ''} onChange={(e) => onEditCell(idx, 'gestor', e.target.value)} /></td>
              <td><button className="btn small danger" onClick={() => onRemoveRow(idx)}>Remover</button></td>
            </tr>
          ))}
        </tbody>
      </table>

      <style jsx>{`
        .table-wrap { 
          overflow-x: auto; 
          border-radius: 8px; 
          border: 1px solid #eee; 
          background: white;
        }
        table { 
          width: 100%; 
          border-collapse: collapse; 
          min-width: 900px; 
        }
        thead {
          background: #0B2527;
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
          border-color: #0B2527;
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
      `}</style>
    </div>
  );
}