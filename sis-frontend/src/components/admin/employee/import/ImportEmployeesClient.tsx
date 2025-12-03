'use client';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import FileUploader from './FileUploader';
import PreviewTable from './PreviewTable';
import { EmployeeRow, validateRows } from './validators';

type GroupOption = {
  id: number;
  nome: string;
};

export default function ImportEmployeesClient({ companyId }: { companyId: number }) {
  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [errorsByRow, setErrorsByRow] = useState<Record<number, string[]>>({});
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const previewLimit = 200;

  // NOVO: grupos da empresa
  const [groups, setGroups] = useState<GroupOption[]>([]);

  // NOVO: card “formato esperado” colapsável
  const [specOpen, setSpecOpen] = useState(false);

  // carrega grupos da empresa
  useEffect(() => {
    let cancelled = false;

    async function loadGroups() {
      try {
        const res = await fetch(`/api/companies/${companyId}`, { method: 'GET' });
        if (!res.ok) {
          console.error('Falha ao carregar grupos da empresa', res.status);
          return;
        }

        const text = await res.text();
        let data: any = {};
        try {
          data = text ? JSON.parse(text) : {};
        } catch {
          data = {};
        }

        const rawGroups: any[] = Array.isArray(data.gruposFuncionarios)
          ? data.gruposFuncionarios
          : Array.isArray(data.grupos)
          ? data.grupos
          : [];

        const mapped: GroupOption[] = rawGroups
          .filter((g: any) => g && typeof g.nome === 'string')
          .filter(
            (g: any) => g.ativo === undefined || g.ativo === null || g.ativo === 1
          )
          .map((g: any) => ({
            id: g.id,
            nome: g.nome as string,
          }));

        if (!cancelled) {
          setGroups(mapped);
        }
      } catch (err) {
        console.error('Erro ao carregar grupos da empresa', err);
      }
    }

    loadGroups();

    return () => {
      cancelled = true;
    };
  }, [companyId]);

  // helper: combina erros "básicos" + regras de grupo
  function withGroupValidation(
    currentRows: EmployeeRow[],
    base: Record<number, string[]>
  ): Record<number, string[]> {
    const result: Record<number, string[]> = {};
    const groupNamesLower = groups.map((g) => g.nome.toLowerCase());

    currentRows.forEach((row, idx) => {
      const issues = [...(base[idx] ?? [])];

      if (groups.length > 0) {
        const grupoNome = (row.grupo ?? '').toString().trim();
        if (!grupoNome) {
          issues.push('grupo obrigatório');
        } else {
          const hasMatch = groupNamesLower.includes(grupoNome.toLowerCase());
          if (!hasMatch) {
            issues.push('grupo não encontrado para esta empresa');
          }
        }
      }

      if (issues.length > 0) {
        result[idx] = issues;
      }
    });

    return result;
  }

  // se grupos carregarem depois de o arquivo já ter sido lido, recalcula erros
  useEffect(() => {
    if (rows.length === 0) return;
    if (groups.length === 0) return;

    const baseErrs = validateRows(rows);
    const finalErrs = withGroupValidation(rows, baseErrs);
    setErrorsByRow(finalErrs);
  }, [groups]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleParsed(parsedRows: EmployeeRow[]) {
    const baseErrs = validateRows(parsedRows);
    const finalErrs = withGroupValidation(parsedRows, baseErrs);
    setRows(parsedRows);
    setErrorsByRow(finalErrs);

    const errorCount = Object.keys(finalErrs).length;
    if (errorCount > 0) {
      toast.error(`${parsedRows.length} linhas processadas. ${errorCount} com problemas.`);
      setMessage(
        `${parsedRows.length} linhas processadas. ${errorCount} com problemas que precisam ser corrigidos.`
      );
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
      const r: EmployeeRow = { ...rows[idx], [key]: value };

      const issues: string[] = [];
      const nome = (r.nome ?? '').toString().trim();
      if (!nome || nome.length < 2) issues.push('nome obrigatório (min 2 chars)');
      if (r.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)) issues.push('email inválido');
      if (r.data_nascimento) {
        const parsed = new Date(r.data_nascimento);
        if (Number.isNaN(parsed.getTime())) issues.push('data_nascimento inválida');
      }

      // validação de grupo com base nos grupos da empresa
      if (groups.length > 0) {
        const grupoNome = (r.grupo ?? '').toString().trim();
        if (!grupoNome) {
          issues.push('grupo obrigatório');
        } else {
          const match = groups.some(
            (g) => g.nome.toLowerCase() === grupoNome.toLowerCase()
          );
          if (!match) issues.push('grupo não encontrado para esta empresa');
        }
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
      {/* NOVO: instruções de colunas esperadas (colapsável) */}
      <div className="spec-card">
        <button
          type="button"
          className="spec-header"
          onClick={() => setSpecOpen((o) => !o)}
        >
          <div className="spec-header-text">
            <h3 className="spec-title">Formato esperado do arquivo</h3>
            <p className="spec-subtitle">
              Clique para {specOpen ? 'ocultar' : 'ver'} as colunas esperadas.
            </p>
          </div>
          <span className={`spec-toggle ${specOpen ? 'open' : ''}`}>▼</span>
        </button>

        {specOpen && (
          <div className="spec-body">
            <p className="spec-info">
              Use uma planilha com cabeçalho na primeira linha. As colunas podem estar em
              qualquer ordem, desde que os nomes sejam reconhecidos.
            </p>
            <div className="spec-columns">
              <div className="spec-col">
                <strong>nome</strong>{' '}
                <span className="badge required">obrigatório</span>
                <p>Nome completo do funcionário.</p>
              </div>
              <div className="spec-col">
                <strong>email</strong>
                <p>Email de contato. Usado para evitar duplicidade na mesma empresa.</p>
              </div>
              <div className="spec-col">
                <strong>telefone</strong>
                <p>Apenas números. A máscara será aplicada automaticamente.</p>
              </div>
              <div className="spec-col">
                <strong>data_nascimento</strong>
                <p>
                  Formato aceito: <code>DD/MM/AAAA</code>, <code>AAAA-MM-DD</code> ou serial
                  Excel.
                </p>
              </div>
              <div className="spec-col">
                <strong>cidade_nascimento</strong>
                <p>Cidade de nascimento.</p>
              </div>
              <div className="spec-col">
                <strong>gestor</strong>
                <p>Nome do gestor direto do funcionário.</p>
              </div>
              <div className="spec-col">
                <strong>grupo</strong>{' '}
                <span className="badge required">obrigatório</span>
                <p>
                  Nome do grupo interno (ex: <em>RH</em>, <em>Tech</em>). Deve existir nos
                  grupos cadastrados da empresa.
                </p>
              </div>
              <div className="spec-col">
                <strong>ativo</strong>
                <p>
                  <code>1</code> ou <code>0</code> (opcional). Se não informado, será
                  considerado ativo.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

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
            disabled={
              importing || parsing || rows.length === 0 || Object.keys(errorsByRow).length > 0
            }
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
              groups={groups}
            />
            {rows.length > previewLimit && (
              <div className="more">
                ℹ️ Mostrando {previewLimit} de {rows.length} linhas.
              </div>
            )}
            {Object.keys(errorsByRow).length > 0 && (
              <div className="errors">
                <h4>Erros por linha</h4>
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
          gap: 24px;
        }

        .spec-card {
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          background: #f9fafb;
          padding: 8px 12px;
        }

        .spec-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 4px 4px 4px 0;
          border: none;
          background: transparent;
          cursor: pointer;
        }

        .spec-header-text {
          text-align: left;
        }

        .spec-title {
          margin: 0;
          font-size: 15px;
          font-weight: 700;
          color: #111827;
        }

        .spec-subtitle {
          margin: 0;
          font-size: 12px;
          color: #4b5563;
        }

        .spec-toggle {
          font-size: 12px;
          color: #4b5563;
          transition: transform 0.18s ease;
        }

        .spec-toggle.open {
          transform: rotate(180deg);
        }

        .spec-body {
          margin-top: 8px;
        }

        .spec-info {
          margin: 0 0 10px;
          font-size: 13px;
          color: #374151;
        }

        .spec-columns {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px 20px;
        }

        .spec-col {
          font-size: 13px;
          color: #374151;
        }

        .spec-col p {
          margin: 2px 0 0;
          font-size: 12px;
          color: #6b7280;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          padding: 2px 6px;
          border-radius: 999px;
          font-size: 10px;
          margin-left: 6px;
        }

        .badge.required {
          background: #fee2e2;
          color: #b91c1c;
          border: 1px solid #fecaca;
        }

        code {
          background: #11182708;
          border-radius: 4px;
          padding: 1px 4px;
          font-size: 11px;
        }

        .upload-section {
          margin-top: 4px;
        }

        .actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          align-items: center;
          flex-wrap: wrap;
        }

        .btn {
          padding: 8px 16px;
          border-radius: 999px;
          font-weight: 600;
          font-size: 13px;
          border: none;
          cursor: pointer;
        }

        .btn.clear {
          background: #f3f4f6;
          color: #374151;
        }

        .btn.success {
          background: #0b2527;
          color: #fff;
        }

        .btn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .summary {
          display: flex;
          gap: 16px;
          font-size: 13px;
          color: #374151;
        }

        .summary-item.error {
          color: #b91c1c;
        }

        .message {
          padding: 10px 12px;
          border-radius: 8px;
          font-size: 13px;
        }

        .message.success {
          background: #ecfdf3;
          color: #166534;
        }

        .message.warning {
          background: #fef9c3;
          color: #854d0e;
        }

        .message.error {
          background: #fee2e2;
          color: #b91c1c;
        }

        .preview {
          margin-top: 4px;
        }

        .empty {
          font-size: 13px;
          color: #6b7280;
          padding: 12px;
          border-radius: 8px;
          border: 1px dashed #d1d5db;
          text-align: center;
        }

        .more {
          margin-top: 8px;
          font-size: 12px;
          color: #6b7280;
        }

        .errors {
          margin-top: 12px;
          font-size: 12px;
          color: #b91c1c;
        }

        .errors h4 {
          margin: 0 0 4px;
          font-size: 13px;
        }

        @media (max-width: 960px) {
          .spec-columns {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 600px) {
          .spec-columns {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
