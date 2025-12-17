'use client';
import React from 'react';
import {
  PerguntaFormState,
  RespostaFormState,
  CategoriaFormState,
} from './types';

export default function QuestionModal({
  open,
  draft,
  step,
  editingTempId,
  modulos,
  categorias,
  onClose,
  onChangeDraft,
  onNext,
  onBack,
  onAddResposta,
  onUpdateResposta,
  onRemoveResposta,
  onSave,
  creatingCategory,
  onStartCreateCategory,
  onCancelCreateCategory,
  newCategoryName,
  setNewCategoryName,
  onConfirmCreateCategory,
}: {
  open: boolean;
  draft: PerguntaFormState | null;
  step: 1 | 2;
  editingTempId: string | null;
  modulos: { tempId: string; nome: string }[];
  categorias: CategoriaFormState[];
  onClose: () => void;
  onChangeDraft: (
    field: keyof PerguntaFormState,
    value: PerguntaFormState[keyof PerguntaFormState]
  ) => void;
  onNext: () => void;
  onBack: () => void;
  onAddResposta: () => void;
  onUpdateResposta: (respTempId: string, field: 'resposta' | 'valor', value: string) => void;
  onRemoveResposta: (respTempId: string) => void;
  onSave: () => void;
  creatingCategory: boolean;
  onStartCreateCategory: () => void;
  onCancelCreateCategory: () => void;
  newCategoryName: string;
  setNewCategoryName: (v: string) => void;
  onConfirmCreateCategory: () => void;
}) {
  if (!open || !draft) return null;

  const categoriasPorModulo = (modTempId: string) =>
    categorias.filter((c) => c.moduloTempId === modTempId);

  return (
    <div className="modal-root" role="dialog" aria-modal="true" aria-labelledby="question-modal-title">
      <div className="modal-backdrop" onClick={onClose} />

      <div className="modal-sheet" role="document">
        <div className="modal-banner">
          <div>
            <h3 id="question-modal-title" className="modal-banner-title">
              {editingTempId ? 'Editar pergunta' : 'Nova pergunta'}
            </h3>
            <p className="modal-banner-sub">{step === 1 ? 'Defina o texto da pergunta, o módulo e a categoria.' : 'Cadastre as respostas possíveis e seus valores (1 a 5).'}</p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Fechar" title="Fechar">
            ✕
          </button>
        </div>

        <div className="modal-body">
          {step === 1 && (
            <>
              <div className="field">
                <label className="label">Texto da pergunta <span className="required">*</span></label>
                <textarea
                  className="textarea"
                  value={draft.pergunta}
                  onChange={(e) => onChangeDraft('pergunta', e.target.value as any)}
                  placeholder="Ex.: Como você avalia o ambiente de trabalho?"
                />
              </div>

              <div className="field-grid-2">
                <div className="field">
                  <label className="label">Módulo <span className="required">*</span></label>

                  {/* SELECT MÓDULO: com placeholder e seta interna */}
                  <select
                    className="input select-with-caret"
                    value={draft.moduloTempId ?? ''}
                    onChange={(e) => {
                      const newModulo = e.target.value;
                      onChangeDraft('moduloTempId', newModulo as any);
                      onChangeDraft('categoriaTempId', '' as any);
                    }}
                  >
                    <option value="">Selecione...</option>
                    {modulos.map((m) => (
                      <option key={m.tempId} value={m.tempId}>{m.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label className="label">Categoria <span className="required">*</span></label>
                  <div className="category-row">
                    <select
                      className="input select-with-caret"
                      value={draft.categoriaTempId ?? ''}
                      onChange={(e) => onChangeDraft('categoriaTempId', e.target.value as any)}
                    >
                      <option value="">Selecione...</option>
                      {categoriasPorModulo(draft.moduloTempId ?? '').map((c) => (
                        <option key={c.tempId} value={c.tempId}>{c.nome}</option>
                      ))}
                    </select>

                    {/* ICON: + quando não criando; X quando criando */}
                    {!creatingCategory ? (
                      <button
                        type="button"
                        className="icon-circle"
                        onClick={onStartCreateCategory}
                        aria-label="Criar nova categoria"
                        title="Nova categoria"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden focusable="false">
                          <path d="M12 5v14" stroke="#0B2527" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M5 12h14" stroke="#0B2527" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="icon-circle"
                        onClick={onCancelCreateCategory}
                        aria-label="Cancelar criação de categoria"
                        title="Cancelar criação"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden focusable="false">
                          <path d="M18 6L6 18" stroke="#0B2527" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M6 6l12 12" stroke="#0B2527" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    )}
                  </div>

                  {creatingCategory && (
                    <div className="field" style={{ marginTop: 6 }}>
                      <label className="label-mini">Nome da nova categoria</label>
                      <div className="new-category-row">
                        <input
                          className="input"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          placeholder="Ex.: Liderança"
                        />
                        <button
                          type="button"
                          className="btn-primary small"
                          onClick={onConfirmCreateCategory}
                          title="Salvar nova categoria"
                        >
                          Salvar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              {/* Top row: back icon (left) + title (center) + add-response icon (right) */}
              <div className="responses-top-row">
                <button
                  type="button"
                  className="icon-circle-back"
                  onClick={onBack}
                  aria-label="Voltar"
                  title="Voltar"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M15 18L9 12l6-6" stroke="#0B2527" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>

                <div className="responses-top-title">
                  <h4 className="respostas-title">Respostas possíveis</h4>
                  <p className="respostas-sub">Cadastre as respostas possíveis e seus valores (1 a 5).</p>
                </div>

                <div className="responses-top-actions">
                  <button
                    type="button"
                    className="icon-circle"
                    onClick={onAddResposta}
                    aria-label="Adicionar resposta"
                    title="Adicionar resposta"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden focusable="false">
                      <path d="M12 5v14" stroke="#0B2527" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M5 12h14" stroke="#0B2527" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              </div>

              {/* Respostas list */}
              <div className="respostas-list">
                {draft.respostas.map((r, index) => (
                  <div key={r.tempId} className="resposta-row">
                    <div className="field resposta-field">
                      <label className="label-mini">Resposta {index + 1}</label>
                      <input
                        className="input"
                        value={r.resposta}
                        onChange={(e) => onUpdateResposta(r.tempId, 'resposta', e.target.value)}
                        placeholder="Ex.: Concordo totalmente"
                      />
                    </div>

                    <div className="field resposta-valor-field">
                      <label className="label-mini">Valor (1–5)</label>
                      <input
                        type="number"
                        min={1}
                        max={5}
                        className="input"
                        value={String(r.valor ?? '')}
                        onChange={(e) => onUpdateResposta(r.tempId, 'valor', e.target.value)}
                      />
                    </div>

                    {draft.respostas.length > 1 && (
                      <button type="button" className="resposta-remove" onClick={() => onRemoveResposta(r.tempId)} aria-label="Remover resposta">✕</button>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <footer className="modal-footer">
          {/* KEEP footer X cancel */}
          <button
            type="button"
            className="icon-circle-footer"
            onClick={onClose}
            aria-label="Cancelar e fechar"
            title="Cancelar"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden focusable="false">
              <path d="M18 6L6 18" stroke="#0B2527" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 6l12 12" stroke="#0B2527" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {step === 1 && <button type="button" className="btn-primary" onClick={onNext}>Continuar</button>}
          {step === 2 && <button type="button" className="btn-primary" onClick={onSave}>Salvar pergunta</button>}
        </footer>
      </div>

      <style jsx>{`
        .modal-root { position: fixed; inset: 0; z-index: 10050; display:flex; align-items:center; justify-content:center; }
        .modal-backdrop { position:absolute; inset:0; background: rgba(2,6,23,0.45); }

        .modal-sheet { width: 920px; max-width: calc(100% - 32px); background:#fff; border-radius:12px; box-shadow:0 20px 60px rgba(11,37,39,0.12); padding:0; z-index:10060; }

        .modal-banner {
          display:flex; align-items:flex-start; justify-content:space-between; gap:12px; padding:18px; background:#0B2527; border-top-left-radius:12px; border-top-right-radius:12px;
        }
        .modal-banner-title { margin:0; font-size:18px; font-weight:700; color:#F3F4FF; }
        .modal-banner-sub { margin:6px 0 0; font-size:13px; color: rgba(243,244,255,0.9); }

        .modal-close { background:transparent;border:none;color:#f3f4ff;font-size:18px;cursor:pointer;padding:6px;border-radius:6px }
        .modal-close:hover { background: rgba(255,255,255,0.04); }

        .modal-body { padding: 18px; max-height: 70vh; overflow:auto; }

        .field { display:flex; flex-direction:column; gap:6px; margin-bottom:12px; }
        .label { font-size:13px; font-weight:600; color:#374151; }
        .label-mini { font-size:11px; color:#6b7280; font-weight:600; }
        .required { color:#b91c1c; margin-left:2px; }

        .textarea { min-height: 80px; border-radius:8px; border:1px solid #e5e7eb; padding:8px 10px; font-size:14px; color:#111827; resize:vertical; }
        .textarea::placeholder { color:#374151; opacity:0.7; }
        .input { width:100%; border-radius:8px; border:1px solid #e5e7eb; padding:8px 10px; font-size:14px; color:#111827; background-color:#fff; box-sizing:border-box; }
        .input::placeholder { color:#374151; opacity:0.7; }
        select.input { appearance:none; -webkit-appearance:none; -moz-appearance:none; }

        /* === novo: select com caret (seta) dentro ===
           usamos um pequeno SVG inline como background-image e posicionamos à direita.
        */
        .select-with-caret {
          padding-right: 42px; /* espaço para a seta */
          background-repeat: no-repeat;
          background-position: right 12px center;
          background-size: 18px 18px;
        }
        /* caret SVG em data URI (preto/escuro) */
        .select-with-caret {
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24'><path fill='none' stroke='%230B2527' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' d='M6 9l6 6 6-6'/></svg>");
        }

        .field-grid-2 { display:grid; grid-template-columns: 1fr 1fr; gap:12px; align-items:start; }

        .category-row { display:flex; gap:8px; align-items:center; }
        .new-category-row { display:flex; gap:8px; align-items:center; margin-top:6px; }

        /* ICON circle (used for "+ nova categoria" and add response) */
        .icon-circle {
          display:inline-flex;
          align-items:center;
          justify-content:center;
          width:36px;
          height:36px;
          border-radius:999px;
          background: #ffffff;
          border: 1px solid rgba(11,37,39,0.06);
          cursor:pointer;
        }

        /* back icon on top-left of responses */
        .icon-circle-back {
          display:inline-flex;
          align-items:center;
          justify-content:center;
          width:40px;
          height:40px;
          border-radius:8px;
          background: #ffffff;
          border: 1px solid rgba(11,37,39,0.06);
          cursor:pointer;
        }

        .responses-top-row {
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:12px;
          margin-bottom:12px;
        }
        .responses-top-title { flex:1; padding-left:12px; }
        .respostas-title { margin:0; font-size:15px; font-weight:700; color:#0B2527; }
        .respostas-sub { margin:4px 0 0; color:#6b7280; font-size:13px; }

        .responses-top-actions { display:flex; align-items:center; gap:8px; }

        .respostas-list { display:flex; flex-direction:column; gap:12px; margin-top:6px; }

        .resposta-row { display:flex; gap:8px; align-items:flex-end; margin-bottom:8px; }
        .resposta-field { flex:1; }
        .resposta-valor-field { width:110px; min-width:80px; }

        .resposta-remove { background:transparent; border:none; color:#dc2626; font-weight:700; font-size:14px; cursor:pointer; padding:6px; border-radius:6px }
        .resposta-remove:hover { background: rgba(220,38,38,0.06); }

        .modal-footer { display:flex; justify-content:flex-end; gap:10px; padding:12px 18px 18px; align-items:center; }
        .btn-primary { background:#0B2527; color:#fff; border:none; padding:8px 14px; border-radius:999px; font-weight:700; cursor:pointer; }
        .btn-primary:hover { background:#134148; }
        .btn-secondary { background:#fff; color:#0B2527; border:1px solid #0B2527; padding:8px 12px; border-radius:999px; font-weight:700; cursor:pointer; }
        .btn-secondary:hover { background:#f3f7f7; }
        .btn-tertiary { background:transparent; border:1px solid #e5e7eb; padding:8px 12px; border-radius:999px; color:#0B2527; cursor:pointer; }
        .btn-tertiary.small, .btn-primary.small { padding:6px 10px; font-size:13px; }

        @media (max-width: 920px) {
          .modal-sheet { width: calc(100% - 20px); }
          .field-grid-2 { grid-template-columns: 1fr; }
          .resposta-valor-field { width:100px; }
          .responses-top-row { flex-direction:row; gap:8px; align-items:center; }
          .responses-top-title { padding-left:8px; }
        }
      `}</style>
    </div>
  );
}
