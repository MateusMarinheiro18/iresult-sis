// src/components/admin/escalas/EscalaEmpresasSection.tsx
'use client';

import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import EscalaEmpresasTable, {
  EmpresaForEscala,
} from './EscalaEmpresasTable';

type Props = {
  escalaId: number;
};

function setsEqual(a: Set<number>, b: Set<number>) {
  if (a.size !== b.size) return false;
  for (const v of a) {
    if (!b.has(v)) return false;
  }
  return true;
}

export default function EscalaEmpresasSection({ escalaId }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [empresas, setEmpresas] = useState<EmpresaForEscala[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [initialSelectedIds, setInitialSelectedIds] = useState<Set<number>>(
    new Set()
  );

  const hasChanges = !setsEqual(selectedIds, initialSelectedIds);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/escalas/${escalaId}/empresas`, {
          cache: 'no-store',
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || 'Erro ao carregar empresas.');
        }

        const list: EmpresaForEscala[] = (data?.empresas ?? []).map(
          (e: any) => ({
            id: e.id,
            razaoSocial: e.razaoSocial,
            cnpj: e.cnpj,
            telefone: e.telefone,
          })
        );

        const selected = new Set<number>(
          (data?.empresas ?? [])
            .filter((e: any) => e.vinculada)
            .map((e: any) => Number(e.id))
        );

        if (!cancelled) {
          setEmpresas(list);
          setSelectedIds(selected);
          setInitialSelectedIds(new Set(selected));
        }
      } catch (err: any) {
        console.error(err);
        if (!cancelled) {
          setError(err.message || 'Erro ao carregar empresas da escala.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [escalaId]);

  function toggleEmpresa(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
      const payload = { companyIds: Array.from(selectedIds) };
      const res = await fetch(`/api/escalas/${escalaId}/empresas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Erro ao salvar vínculos.');
      }
      toast.success('Vínculos salvos com sucesso!');
      setInitialSelectedIds(new Set(selectedIds));
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro ao salvar vínculos da escala.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card">
      <div className="card-header-row">
        <div>
          <h2 className="card-title">Empresas da escala</h2>
          <p className="card-subtitle">
            Selecione as empresas que poderão responder esta escala. As
            empresas marcadas ficarão vinculadas a esta escala.
          </p>
        </div>

        <div className="header-actions">
          <div className="selected-info">
            <span className="selected-dot" />
            <span>
              {selectedIds.size}{' '}
              {selectedIds.size === 1 ? 'empresa selecionada' : 'empresas selecionadas'}
            </span>
          </div>
          <button
            type="button"
            className="btn-primary"
            onClick={handleSave}
            disabled={loading || saving || !hasChanges}
          >
            {saving ? 'Salvando...' : 'Salvar vínculos'}
          </button>
        </div>
      </div>

      {loading && (
        <div className="status-row">
          <span className="status-text">Carregando empresas...</span>
        </div>
      )}

      {error && !loading && (
        <div className="status-row status-error">
          <span className="status-text">{error}</span>
        </div>
      )}

      {!loading && !error && (
        <>
          {empresas.length === 0 ? (
            <div className="status-row">
              <span className="status-text">
                Nenhuma empresa ativa encontrada.
              </span>
            </div>
          ) : (
            <EscalaEmpresasTable
              items={empresas}
              selectedIds={selectedIds}
              onToggle={toggleEmpresa}
            />
          )}

          {!hasChanges && empresas.length > 0 && (
            <div className="status-row status-muted">
              <span className="status-text">
                Nenhuma alteração pendente de salvamento.
              </span>
            </div>
          )}
        </>
      )}

      <style jsx>{`
        .card {
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 6px 18px rgba(11, 37, 39, 0.06);
          padding: 20px 20px 16px;
        }

        .card-header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 12px;
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
          margin: 0;
          max-width: 520px;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .selected-info {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: #374151;
          background: #f3f4ff;
          padding: 6px 10px;
          border-radius: 999px;
        }

        .selected-dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: #0b2527;
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
          white-space: nowrap;
          transition: all 0.15s ease;
        }

        .btn-primary:hover:not(:disabled) {
          background: #134148;
          border-color: #134148;
        }

        .btn-primary:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .status-row {
          margin-top: 8px;
          padding: 8px 4px;
        }

        .status-text {
          font-size: 13px;
          color: #6b7280;
        }

        .status-error .status-text {
          color: #b91c1c;
        }

        .status-muted .status-text {
          color: #9ca3af;
        }

        @media (max-width: 960px) {
          .card-header-row {
            flex-direction: column;
            align-items: flex-start;
          }

          .header-actions {
            width: 100%;
            justify-content: space-between;
          }
        }
      `}</style>
    </section>
  );
}
