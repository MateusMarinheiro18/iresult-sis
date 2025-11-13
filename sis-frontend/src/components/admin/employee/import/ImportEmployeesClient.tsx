'use client';
import React, { useState } from 'react';
import FileUploader from './FileUploader';
import PreviewTable from './PreviewTable';
import { EmployeeRow, validateRows } from './validators';

export default function ImportEmployeesClient({ companyId }: { companyId: number }) {
  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [errorsByRow, setErrorsByRow] = useState<Record<number, string[]>>({});
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const previewLimit = 200;

  function handleParsed(parsedRows: EmployeeRow[]) {
    const errs = validateRows(parsedRows);
    setRows(parsedRows);
    setErrorsByRow(errs);
    
    const errorCount = Object.keys(errs).length;
    if (errorCount > 0) {
      setMessage(`${parsedRows.length} linhas processadas. ${errorCount} com problemas que precisam ser corrigidos.`);
    } else {
      setMessage(`${parsedRows.length} linhas processadas com sucesso!`);
    }
  }

  function handleRemoveRow(index: number) {
    setRows((s) => s.filter((_, i) => i !== index));
    
    // Rebuild errors map
    setErrorsByRow((prev) => {
      const newMap: Record<number, string[]> = {};
      let j = 0;
      for (let i = 0; i < rows.length; i++) {
        if (i === index) continue;
        if (prev[i]) newMap[j] = prev[i];
        j++;
      }
      return newMap;
    });
  }

  function handleEditCell(idx: number, key: string, value: string) {
    setRows((cur) => {
      const copy = [...cur];
      // @ts-ignore
      copy[idx][key] = value;
      return copy;
    });
    
    // Revalidate row
    setErrorsByRow((prev) => {
      const copy = { ...prev };
      const r = { ...rows[idx], [key]: value };
      const issues: string[] = [];
      
      const nome = (r.nome ?? '').toString().trim();
      if (!nome || nome.length < 2) issues.push('nome obrigatório (min 2 chars)');
      if (r.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)) issues.push('email inválido');
      if (r.data_nascimento) {
        const parsed = new Date(r.data_nascimento);
        if (Number.isNaN(parsed.getTime())) issues.push('data_nascimento inválida');
      }
      
      if (issues.length) copy[idx] = issues;
      else delete copy[idx];
      return copy;
    });
  }

  async function handleImport() {
    setMessage(null);
    if (rows.length === 0) {
      setMessage('Nenhuma linha para importar.');
      return;
    }
    if (Object.keys(errorsByRow).length > 0) {
      setMessage('Existem linhas com problemas. Corrija ou remova antes de importar.');
      return;
    }

    setImporting(true);
    try {
      const res = await fetch(`/api/companies/${companyId}/employees/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      });
      
      const body = await res.json().catch(() => null);
      
      if (!res.ok) {
        setMessage(`${body?.error ?? `Erro ao importar (status ${res?.status})`}`);
        setImporting(false);
        return;
      }
      
      const summary = body?.summary ?? null;
      setMessage(`✓ Importação concluída! ${summary ? `Inseridos: ${summary.inserted ?? summary.imported ?? 0}` : ''}`);
      setRows([]);
      setErrorsByRow({});
    } catch (err) {
      console.error(err);
      setMessage('Erro inesperado ao importar. Veja o console.');
    } finally {
      setImporting(false);
    }
  }

  function handleClear() {
    setRows([]);
    setErrorsByRow({});
    setMessage(null);
  }

  return (
    <div className="root">
      {/* Upload Section */}
      <div className="upload-section">
        <FileUploader 
          onParsed={handleParsed} 
          setMessage={setMessage} 
          setParsing={setParsing} 
        />
      </div>

      {/* Actions */}
      {rows.length > 0 && (
        <div className="actions">
          <button 
            className="btn clear" 
            onClick={handleClear} 
            disabled={parsing || importing}
          >
            Limpar preview
          </button>
          <button 
            className="btn success" 
            onClick={handleImport} 
            disabled={importing || parsing || rows.length === 0 || Object.keys(errorsByRow).length > 0}
          >
            {importing ? 'Importando...' : '✓ Salvar (importar)'}
          </button>
        </div>
      )}

      {/* Summary */}
      {rows.length > 0 && (
        <div className="summary">
          <div className="summary-item">
            Linhas detectadas: <strong>{rows.length}</strong>
          </div>
          <div className="summary-item error">
            Linhas com problemas: <strong>{Object.keys(errorsByRow).length}</strong>
          </div>
        </div>
      )}

      {/* Message */}
      {message && (
        <div className={`message ${message.includes('❌') ? 'error' : message.includes('⚠️') ? 'warning' : 'success'}`}>
          {message}
        </div>
      )}

      {/* Preview Table */}
      <div className="preview">
        {rows.length === 0 ? (
          <div className="empty">
            Nenhuma pré-visualização. Faça upload de um arquivo para ver os registros.
          </div>
        ) : (
          <>
            <PreviewTable
              rows={rows}
              errorsByRow={errorsByRow}
              previewLimit={previewLimit}
              onEditCell={handleEditCell}
              onRemoveRow={handleRemoveRow}
            />

            {rows.length > previewLimit && (
              <div className="more">
                ℹ️ Mostrando {previewLimit} de {rows.length} linhas.
              </div>
            )}

            {Object.keys(errorsByRow).length > 0 && (
              <div className="errors">
                <h4>⚠️ Erros por linha</h4>
                <ul>
                  {Object.entries(errorsByRow).map(([k, v]) => (
                    <li key={k}>
                      <strong>Linha {Number(k) + 1}:</strong> {v.join('; ')}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      <style jsx>{`
        .root {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .upload-section {
          margin-bottom: 8px;
        }

        .actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        .btn {
          padding: 10px 20px;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
          transition: all 0.2s ease;
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn.clear {
          background: #f3f4f6;
          color: #374151;
        }

        .btn.clear:hover:not(:disabled) {
          background: #e5e7eb;
        }

        .btn.success {
          background: #10b981;
          color: white;
        }

        .btn.success:hover:not(:disabled) {
          background: #059669;
        }

        .summary {
          display: flex;
          gap: 24px;
          padding: 16px;
          background: #f9fafb;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
        }

        .summary-item {
          color: #374151;
          font-size: 14px;
        }

        .summary-item strong {
          color: #0B2527;
          font-size: 16px;
        }

        .summary-item.error strong {
          color: #ef4444;
        }

        .message {
          padding: 12px 16px;
          border-radius: 8px;
          font-weight: 500;
        }

        .message.success {
          background: #d1fae5;
          color: #065f46;
          border: 1px solid #10b981;
        }

        .message.warning {
          background: #fef3c7;
          color: #92400e;
          border: 1px solid #f59e0b;
        }

        .message.error {
          background: #fee2e2;
          color: #7f1d1d;
          border: 1px solid #ef4444;
        }

        .preview {
          margin-top: 8px;
        }

        .empty {
          color: #6b7280;
          padding: 40px 20px;
          text-align: center;
          background: #f9fafb;
          border-radius: 8px;
          border: 2px dashed #e5e7eb;
        }

        .more {
          margin-top: 12px;
          color: #6b7280;
          font-size: 14px;
          text-align: center;
        }

        .errors {
          margin-top: 16px;
          background: #fee2e2;
          border: 1px solid #ef4444;
          padding: 16px;
          border-radius: 8px;
        }

        .errors h4 {
          color: #7f1d1d;
          margin: 0 0 12px 0;
          font-size: 16px;
        }

        .errors ul {
          margin: 0;
          padding-left: 20px;
          color: #991b1b;
        }

        .errors li {
          margin-bottom: 6px;
        }
      `}</style>
    </div>
  );
}