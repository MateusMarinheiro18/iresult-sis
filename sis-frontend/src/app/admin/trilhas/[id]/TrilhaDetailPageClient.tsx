// src/app/admin/trilhas/[id]/TrilhaDetailPageClient.tsx
'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useConfirm } from '@/components/ui/ConfirmProvider';

import TrilhaBuilderForm from '@/components/admin/trilhas/TrilhaBuilderForm';
import type { TrilhaFormState } from '@/components/admin/trilhas/types';

type EmpresaOption = {
  id: number;
  razaoSocial: string;
  checked: boolean;
};

type Props = {
  trilhaId: number;
  initialForm: TrilhaFormState;
  empresas: EmpresaOption[];
  createdAtLabel?: string;
};

export default function TrilhaDetailPageClient({
  trilhaId,
  initialForm,
  empresas,
  createdAtLabel,
}: Props) {
  const router = useRouter();
  const confirm = useConfirm();

  const [empresasState, setEmpresasState] = useState<EmpresaOption[]>(empresas);
  const [empresaQuery, setEmpresaQuery] = useState('');
  const [savingLinks, setSavingLinks] = useState(false);

  const selectedCount = useMemo(
    () => empresasState.filter((e) => e.checked).length,
    [empresasState]
  );

  const filteredEmpresas = useMemo(() => {
    const q = empresaQuery.trim().toLowerCase();
    if (!q) return empresasState;
    return empresasState.filter((e) =>
      e.razaoSocial.toLowerCase().includes(q)
    );
  }, [empresaQuery, empresasState]);

  function toggleEmpresa(id: number) {
    setEmpresasState((prev) =>
      prev.map((e) => (e.id === id ? { ...e, checked: !e.checked } : e))
    );
  }

  async function handleSalvarVinculos() {
    const empresaIds = empresasState.filter((e) => e.checked).map((e) => e.id);

    try {
      setSavingLinks(true);
      const res = await fetch(`/api/trilhas/${trilhaId}/empresas`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empresaIds }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Erro ao salvar vínculos.');
      }

      toast.success('Vínculos com empresas atualizados com sucesso.');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro ao salvar vínculos.');
    } finally {
      setSavingLinks(false);
    }
  }

  async function handleDelete() {
    const ok = await confirm({
      title: 'Excluir trilha',
      description:
        'Tem certeza que deseja excluir esta trilha? Isso pode afetar as empresas vinculadas e os participantes.',
    });

    if (!ok) return;

    try {
      const res = await fetch(`/api/trilhas/${trilhaId}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Erro ao excluir trilha.');
      }

      toast.success('Trilha excluída com sucesso.');
      router.push('/admin/trilhas');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro ao excluir trilha.');
    }
  }

  return (
    <div className="page-root">
      <main className="container">
        <header className="header-row">
          <div>
            <h1 className="page-title">Detalhes da trilha</h1>
            <p className="page-subtitle">
              Edite as informações da trilha, seus eventos e empresas vinculadas.
            </p>
          </div>

          <div className="header-actions">
            <button type="button" className="btn-delete" onClick={handleDelete}>
              Excluir trilha
            </button>
          </div>
        </header>

        {/* Form de edição da trilha + itens */}
        <TrilhaBuilderForm
          mode="edit"
          trilhaId={trilhaId}
          initialData={initialForm}
          createdAtLabel={createdAtLabel}
        />

        {/* Card de empresas vinculadas */}
        <section className="card empresas-card">
          <div className="card-header-row">
            <div>
              <h2 className="card-title">Empresas vinculadas</h2>
              <p className="card-subtitle">
                Selecione as empresas ativas que terão acesso a esta trilha.
              </p>
            </div>

            <div className="empresas-summary">
              {selectedCount}{' '}
              {selectedCount === 1
                ? 'empresa selecionada'
                : 'empresas selecionadas'}
            </div>
          </div>

          <div className="empresas-controls">
            <div
              className="search-box"
              role="search"
              aria-label="Buscar empresa por nome"
            >
              <div className="search-icon" aria-hidden>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M21 21l-4.35-4.35"
                    stroke="#6B7280"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle
                    cx="11"
                    cy="11"
                    r="6"
                    stroke="#6B7280"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <input
                className="search-input"
                placeholder="Buscar empresa"
                value={empresaQuery}
                onChange={(e) => setEmpresaQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="empresas-list">
            {filteredEmpresas.length === 0 && (
              <div className="empresas-empty">
                Nenhuma empresa encontrada com esse filtro.
              </div>
            )}

            {filteredEmpresas.map((empresa) => (
              <label key={empresa.id} className="empresa-row">
                <input
                  type="checkbox"
                  checked={empresa.checked}
                  onChange={() => toggleEmpresa(empresa.id)}
                />
                <span className="empresa-name">{empresa.razaoSocial}</span>
              </label>
            ))}
          </div>

          <div className="empresas-footer">
            <button
              type="button"
              className="btn-primary"
              disabled={savingLinks}
              onClick={handleSalvarVinculos}
            >
              {savingLinks ? 'Salvando vínculos...' : 'Salvar vínculos'}
            </button>
          </div>
        </section>
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
          gap: 16px;
        }

        .page-title {
          font-size: 20px;
          font-weight: 700;
          color: #111827;
          margin: 0 0 4px;
        }

        .page-subtitle {
          font-size: 14px;
          color: #6b7280;
          margin: 0;
        }

        .header-actions {
          display: flex;
          gap: 8px;
        }

        .btn-delete {
          border-radius: 999px;
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          border: 1px solid #fecaca;
          background: #fef2f2;
          color: #b91c1c;
          transition: all 0.15s ease;
          white-space: nowrap;
        }

        .btn-delete:hover {
          background: #fee2e2;
          border-color: #fca5a5;
        }

        .card {
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 6px 18px rgba(11, 37, 39, 0.06);
          padding: 20px 20px 18px;
          margin-top: 20px;
        }

        .card-title {
          font-size: 18px;
          font-weight: 700;
          color: #111827;
          margin: 0 0 4px;
        }

        .card-subtitle {
          font-size: 13px;
          color: #6b7280;
          margin: 0 0 10px;
        }

        .card-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 10px;
        }

        .empresas-summary {
          font-size: 13px;
          font-weight: 600;
          color: #4b5563;
        }

        .empresas-controls {
          margin-bottom: 10px;
        }

        .search-box {
          display: flex;
          align-items: center;
          background: #fff;
          padding: 8px 12px;
          border-radius: 999px;
          box-shadow: 0 2px 8px rgba(11, 37, 39, 0.04);
          border: 1px solid rgba(11, 37, 39, 0.04);
          min-width: 220px;
          max-width: 420px;
          width: 100%;
          box-sizing: border-box;
        }

        .search-icon {
          display: inline-flex;
          margin-right: 10px;
          align-items: center;
          justify-content: center;
        }

        .search-input {
          border: none;
          outline: none;
          font-size: 14px;
          flex: 1;
          color: #111827;
          background: transparent;
        }
        .search-input::placeholder {
          color: #9ca3af;
        }

        .empresas-list {
          max-height: 260px;
          overflow-y: auto;
          border-radius: 10px;
          border: 1px solid #e5e7eb;
          padding: 8px 10px;
          background: #f9fafb;
        }

        .empresas-empty {
          padding: 10px;
          font-size: 13px;
          color: #6b7280;
        }

        .empresa-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 4px;
          font-size: 14px;
          color: #111827;
          cursor: pointer;
        }

        .empresa-row + .empresa-row {
          border-top: 1px dashed #e5e7eb;
        }

        .empresa-row input[type='checkbox'] {
          width: 16px;
          height: 16px;
          cursor: pointer;
        }

        .empresa-name {
          flex: 1;
        }

        .empresas-footer {
          margin-top: 12px;
          display: flex;
          justify-content: flex-end;
        }

        .btn-primary {
          border-radius: 999px;
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          border: 1px solid #0b2527;
          background: #0b2527;
          color: #ffffff;
          transition: all 0.15s ease;
          white-space: nowrap;
        }

        .btn-primary:hover {
          background: #134148;
          border-color: #134148;
        }

        .btn-primary:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        @media (max-width: 960px) {
          .header-row {
            flex-direction: column;
            align-items: flex-start;
          }

          .header-actions {
            width: 100%;
            justify-content: flex-end;
          }

          .empresas-list {
            max-height: 220px;
          }
        }
      `}</style>
    </div>
  );
}
