// src/components/import/ImportEmployeesClient.tsx
'use client';
import React, { useState } from 'react';
import toast from 'react-hot-toast';
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
      toast.error(`${parsedRows.length} linhas processadas. ${errorCount} com problemas.`);
      setMessage(`${parsedRows.length} linhas processadas. ${errorCount} com problemas que precisam ser corrigidos.`);
    } else {
      toast.success(`${parsedRows.length} linhas processadas com sucesso!`);
      setMessage(`${parsedRows.length} linhas processadas com sucesso!`);
    }
  }

  function handleRemoveRow(index: number) {
    setRows((s) => s.filter((_, i) => i !== index));
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
      toast.error('Nenhuma linha para importar.');
      setMessage('Nenhuma linha para importar.');
      return;
    }
    if (Object.keys(errorsByRow).length > 0) {
      toast.error('Existem linhas com problemas. Corrija ou remova antes de importar.');
      setMessage('Existem linhas com problemas. Corrija ou remova antes de importar.');
      return;
    }

    setImporting(true);
    const toastId = toast.loading('Importando funcionários…');
    try {
      const res = await fetch(`/api/companies/${companyId}/employees/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      });

      const body = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = body?.error ?? `Erro ao importar (status ${res.status})`;
        toast.error(msg, { id: toastId });
        setMessage(msg);
        setImporting(false);
        return;
      }

      const summary = body?.summary ?? null;
      const successMsg = `✓ Importação concluída! ${
        summary ? `Inseridos: ${summary.inserted ?? summary.imported ?? 0}` : ''
      }`;
      toast.success(successMsg, { id: toastId });
      setMessage(successMsg);
      setRows([]);
      setErrorsByRow({});
    } catch (err: any) {
      console.error(err);
      toast.error('Erro inesperado ao importar. Veja o console.', { id: toastId });
      setMessage('Erro inesperado ao importar. Veja o console.');
    } finally {
      setImporting(false);
    }
  }

  function handleClear() {
    setRows([]);
    setErrorsByRow({});
    setMessage(null);
    toast('Pré-visualização limpa.');
  }

  return (
    <div className="root">
      <div className="upload-section">
        <FileUploader onParsed={handleParsed} setMessage={setMessage} setParsing={setParsing} />
      </div>

      {rows.length > 0 && (
        <div className="actions">
          <button className="btn clear" onClick={handleClear} disabled={parsing || importing}>
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

      {message && (
        <div
          className={`message ${
            message.includes('❌') ? 'error' : message.includes('⚠️') ? 'warning' : 'success'
          }`}
        >
          {message}
        </div>
      )}

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
    </div>
  );
}
