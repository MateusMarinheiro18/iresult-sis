// src/components/admin/escalas/builder/ModuleModal.tsx
'use client';
import React, { useEffect, useRef } from 'react';
import { ModuloFormState } from './types';

export default function ModuleModal({
  open,
  draft,
  editingTempId,
  onClose,
  onChange,
  onSave,
}: {
  open: boolean;
  draft: ModuloFormState | null;
  editingTempId: string | null;
  onClose: () => void;
  onChange: <K extends keyof ModuloFormState>(field: K, value: ModuloFormState[K]) => void;
  onSave: () => void;
}) {
  const sheetRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' || e.key === 'Esc') {
        onClose();
      }
      // prevent Enter from submitting parent form accidentally
      if (e.key === 'Enter') {
        const active = document.activeElement as HTMLElement | null;
        if (active && sheetRef.current && sheetRef.current.contains(active)) {
          e.preventDefault();
        }
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open || !draft) return null;

  // Normalize string for saving:
  // - accepts ',' or '.' as decimal separator
  // - if value is an integer (no decimal part) -> return "X.0"
  // - if value has decimal part -> return as-is (normalized to '.'), except trailing '.' -> treat as X.0
  // - empty or invalid -> return ''
  function formatValueOnSave(raw?: string | null) {
    if (raw === undefined || raw === null) return '';
    const s = String(raw).trim();
    if (s === '') return '';
    const normalized = s.replace(',', '.').trim();

    // remove trailing dot (e.g. "1." -> "1")
    const withoutTrailingDot = normalized.endsWith('.') ? normalized.slice(0, -1) : normalized;

    if (withoutTrailingDot === '') return '';

    const n = Number(withoutTrailingDot);
    if (Number.isNaN(n)) return '';

    // if original had a decimal separator (and wasn't just trailing dot), keep original decimals
    if (withoutTrailingDot.includes('.')) {
      // remove unnecessary leading zeros, but keep decimals as typed (trim trailing zeros not done to respect user)
      // also remove stray leading '+' sign
      const signed = withoutTrailingDot.replace(/^\+/, '');
      return signed;
    }
    // integer -> format to X.0
    return n.toFixed(1);
  }

  // onSave click: format numeric fields (if necessary) then call parent onSave
  function handleSaveClick() {
    // list of numeric fields to normalize on save
    const numericFields: (keyof ModuloFormState)[] = [
      'valorInicialRisco',
      'valorFinalRisco',
      'valorInicialIntermediario',
      'valorFinalIntermediario',
      'valorInicialFavoravel',
      'valorFinalFavoravel',
    ];

    numericFields.forEach((f) => {
      const raw = (draft as any)[f] as string | undefined | null;
      const formatted = formatValueOnSave(raw as any);
      // only call onChange if formatted differs (avoids extra setState flicker)
      if ((raw ?? '') !== formatted) {
        onChange(f as any, formatted as any);
      }
    });

    // now call parent's save — parent reads moduleDraft (which we just normalized via onChange)
    onSave();
  }

  // prevent clicks inside sheet closing the modal (backdrop should close)
  function handleSheetClick(e: React.MouseEvent) {
    e.stopPropagation();
  }

  return (
    <div
      className="modal-root"
      role="dialog"
      aria-modal="true"
      aria-labelledby="module-modal-title"
      onClick={onClose}
    >
      <div className="modal-backdrop" aria-hidden />

      <div
        ref={sheetRef}
        className="modal-sheet"
        role="document"
        onClick={handleSheetClick}
      >
        <div className="modal-banner">
          <div>
            <h3 id="module-modal-title" className="modal-banner-title">
              {editingTempId ? 'Editar módulo' : 'Novo módulo'}
            </h3>
            <p className="modal-banner-sub">Defina o nome e as faixas de classificação deste módulo.</p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Fechar">✕</button>
        </div>

        <div className="modal-body">
          <div className="field">
            <label className="label">Nome do módulo <span className="required">*</span></label>
            <input
              className="input"
              value={draft.nome}
              onChange={(e) => onChange('nome', e.target.value)}
              placeholder="Ex.: Clima Organizacional"
              aria-label="Nome do módulo"
            />
          </div>

          <div className="faixas-grid" role="group" aria-label="Faixas de classificação">
            <div className="faixa-col">
              <h4 className="faixa-title"><span className="faixa-dot faixa-dot-risco" aria-hidden />Risco</h4>
              <div className="faixa-row">
                <div className="field compact">
                  <label className="label-mini">De</label>
                  <input
                    className="input"
                    // NÃO formatamos na digitação — deixamos o texto como o usuário digita
                    value={draft.valorInicialRisco ?? ''}
                    onChange={(e) => onChange('valorInicialRisco', e.target.value)}
                    placeholder="Ex.: 1.0"
                    aria-label="Risco - valor inicial"
                    inputMode="decimal"
                  />
                </div>
                <div className="field compact">
                  <label className="label-mini">Até</label>
                  <input
                    className="input"
                    value={draft.valorFinalRisco ?? ''}
                    onChange={(e) => onChange('valorFinalRisco', e.target.value)}
                    placeholder="Ex.: 2.9"
                    aria-label="Risco - valor final"
                    inputMode="decimal"
                  />
                </div>
              </div>
            </div>

            <div className="faixa-col">
              <h4 className="faixa-title"><span className="faixa-dot faixa-dot-intermediario" aria-hidden />Intermediário</h4>
              <div className="faixa-row">
                <div className="field compact">
                  <label className="label-mini">De</label>
                  <input
                    className="input"
                    value={draft.valorInicialIntermediario ?? ''}
                    onChange={(e) => onChange('valorInicialIntermediario', e.target.value)}
                    placeholder="Ex.: 3.0"
                    aria-label="Intermediário - valor inicial"
                    inputMode="decimal"
                  />
                </div>
                <div className="field compact">
                  <label className="label-mini">Até</label>
                  <input
                    className="input"
                    value={draft.valorFinalIntermediario ?? ''}
                    onChange={(e) => onChange('valorFinalIntermediario', e.target.value)}
                    placeholder="Ex.: 3.9"
                    aria-label="Intermediário - valor final"
                    inputMode="decimal"
                  />
                </div>
              </div>
            </div>

            <div className="faixa-col">
              <h4 className="faixa-title"><span className="faixa-dot faixa-dot-favoravel" aria-hidden />Favorável</h4>
              <div className="faixa-row">
                <div className="field compact">
                  <label className="label-mini">De</label>
                  <input
                    className="input"
                    value={draft.valorInicialFavoravel ?? ''}
                    onChange={(e) => onChange('valorInicialFavoravel', e.target.value)}
                    placeholder="Ex.: 4.0"
                    aria-label="Favorável - valor inicial"
                    inputMode="decimal"
                  />
                </div>
                <div className="field compact">
                  <label className="label-mini">Até</label>
                  <input
                    className="input"
                    value={draft.valorFinalFavoravel ?? ''}
                    onChange={(e) => onChange('valorFinalFavoravel', e.target.value)}
                    placeholder="Ex.: 5.0"
                    aria-label="Favorável - valor final"
                    inputMode="decimal"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer className="modal-footer">
          <button type="button" className="btn-tertiary" onClick={onClose}>Cancelar</button>
          <button type="button" className="btn-primary" onClick={handleSaveClick}>Salvar módulo</button>
        </footer>
      </div>

      <style jsx>{`
        .modal-root {
          position: fixed;
          inset: 0;
          z-index: 10050;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .modal-backdrop {
          position: absolute;
          inset: 0;
          background: rgba(2,6,23,0.45);
        }
        .modal-sheet {
          position: relative;
          width: 920px;
          max-width: calc(100% - 32px);
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 20px 60px rgba(11,37,39,0.12);
          padding: 0;
          z-index: 10060;
        }

        .modal-banner {
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap:12px;
          padding: 18px;
          background: #0B2527;
          border-top-left-radius: 12px;
          border-top-right-radius: 12px;
        }
        .modal-banner-title { margin:0; font-size:18px; font-weight:700; color:#F3F4FF; }
        .modal-banner-sub { margin:6px 0 0; font-size:13px; color: rgba(243,244,255,0.9); }

        .modal-close { background: transparent; border: none; color: #f3f4ff; font-size:18px; cursor:pointer; padding:6px; border-radius:6px; }
        .modal-close:hover { background: rgba(255,255,255,0.04); }

        .modal-body { padding: 18px; }

        .field { display:flex; flex-direction:column; gap:6px; margin-bottom:12px; }
        .label { font-size:13px; font-weight:600; color:#374151; }
        .label-mini { font-size:11px; color:#6b7280; font-weight:600; }
        .required { color:#b91c1c; margin-left:2px; }

        .input {
          width:100%;
          border-radius:8px;
          border:1px solid #e5e7eb;
          padding:8px 10px;
          font-size:14px;
          color:#111827;
          outline:none;
          transition: border-color .15s, box-shadow .15s;
        }
        .input::placeholder { color:#374151; opacity:0.7; }
        .input:focus { border-color:#0B2527; box-shadow: 0 0 0 2px rgba(11,37,39,0.06); }

        .faixas-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-top:6px; }
        .faixa-col { background:#fafafa; border-radius:8px; border:1px solid #eef2ff; padding:10px; }
        .faixa-title { font-size:13px; font-weight:700; color:#0B2527; display:flex; align-items:center; gap:8px; margin:0 0 8px; }
        .faixa-dot { width:10px;height:10px;border-radius:999px; display:inline-block; }
        .faixa-dot-risco { background:#dc2626; }
        .faixa-dot-intermediario { background:#facc15; }
        .faixa-dot-favoravel { background:#16a34a; }

        .modal-footer { display:flex; justify-content:flex-end; gap:10px; padding:12px 18px 18px; }
        .btn-primary { background:#0B2527; color:#fff; border:none; padding:8px 14px; border-radius:999px; font-weight:700; cursor:pointer; }
        .btn-primary:hover { background:#134148; }
        .btn-tertiary { background:transparent; border:1px solid #e5e7eb; padding:8px 12px; border-radius:999px; cursor:pointer; color:#0B2527; }
        .btn-tertiary:hover { background:#f9fafb; }

        @media (max-width:720px) {
          .modal-sheet { width: 100%; }
          .faixas-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
