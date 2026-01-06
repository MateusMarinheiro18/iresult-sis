'use client';
import React, { useEffect } from 'react';
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
  onDeleteCategoria,
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
  onDeleteCategoria?: (categoriaId: string) => void;
}) {
  if (!open || !draft) return null;

  const categoriasPorModulo = (modTempId: string) =>
    categorias.filter((c) => c.moduloTempId === modTempId);

  // DEFAULTS que serão usados para preencher respostas vazias/ausentes
  const DEFAULT_RESPONSE_TEXTS = [
    'Nunca / Quase nunca',
    'Raramente',
    'Às vezes',
    'Frequentemente',
    'Sempre',
  ];

  // Ao abrir o modal para uma pergunta nova (ou quando draft mudar),
  // garantir que existam 5 respostas preenchidas por padrão — sem sobrescrever valores do usuário.
  useEffect(() => {
    if (!open || !draft) return;

    const curr = Array.isArray(draft.respostas) ? draft.respostas : [];
    // se já tem 5 ou mais e todas têm texto, não fazemos nada
    const allFiveHaveText = curr.length >= 5 && curr.slice(0, 5).every(r => typeof r.resposta === 'string' && String(r.resposta).trim() !== '');
    if (allFiveHaveText) return;

    const now = Date.now();
    const newRespostas: RespostaFormState[] = [];
    for (let i = 0; i < 5; i++) {
      const existing = curr[i];
      const tempId = existing?.tempId ?? `${draft.tempId}-resp-${i}-${now}`;
      const respostaText = (existing && typeof existing.resposta === 'string' && existing.resposta.trim() !== '')
        ? existing.resposta
        : DEFAULT_RESPONSE_TEXTS[i];
      const valor = (existing && (existing.valor !== undefined && existing.valor !== null))
        ? existing.valor
        : (i + 1);
      newRespostas.push({
        tempId,
        resposta: respostaText,
        valor,
      });
    }

    // Se havia mais de 5 respostas (caso de edição), preserve as extras também:
    if (curr.length > 5) {
      for (let j = 5; j < curr.length; j++) {
        newRespostas.push(curr[j]);
      }
    }

    onChangeDraft('respostas', newRespostas as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, draft?.tempId]);

  // ✅ NOVO: toggle de categoria no array
  function toggleCategoria(catTempId: string) {
    if (!draft) return;

    const current = draft.categoriasTempIds || [];
    const isSelected = current.includes(catTempId);

    const updated = isSelected
      ? current.filter((id) => id !== catTempId)
      : [...current, catTempId];

    onChangeDraft('categoriasTempIds', updated as any);
  }

  const textareaId = `q-txt-${draft.tempId}`;
  const selectId = `q-mod-${draft.tempId}`;

  return (
    <div className="modal-root" role="dialog" aria-modal="true" aria-labelledby="question-modal-title" aria-describedby={`question-modal-sub-${draft.tempId}`}>
      <div className="modal-backdrop" onClick={onClose} />

      <div className="modal-sheet" role="document">
        <div className="modal-banner">
          <div>
            <h3 id="question-modal-title" className="modal-banner-title">
              {editingTempId ? 'Editar pergunta' : 'Nova pergunta'}
            </h3>
            <p id={`question-modal-sub-${draft.tempId}`} className="modal-banner-sub">{step === 1 ? 'Defina o texto da pergunta, o módulo e as categorias.' : 'Cadastre as respostas possíveis e seus valores (1 a 5).'}</p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Fechar" title="Fechar">
            ✕
          </button>
        </div>

        <div className="modal-body">
          {step === 1 && (
            <>
              <div className="field">
                <label className="label" htmlFor={textareaId}>Texto da pergunta <span className="required">*</span></label>
                <textarea
                  id={textareaId}
                  className="textarea"
                  value={draft?.pergunta ?? ''}
                  onChange={(e) => onChangeDraft('pergunta', e.target.value as any)}
                  placeholder="Ex.: Como você avalia o ambiente de trabalho?"
                  aria-required
                />
              </div>

              <div className="field">
                <label className="label" htmlFor={selectId}>Módulo <span className="required">*</span></label>
                <select
                  id={selectId}
                  className="input select-with-caret"
                  value={draft?.moduloTempId ?? ''}
                  onChange={(e) => {
                    const newModulo = e.target.value;
                    onChangeDraft('moduloTempId', newModulo as any);
                    onChangeDraft('categoriasTempIds', [] as any); // limpa categorias ao trocar módulo
                  }}
                >
                  <option value="">Selecione...</option>
                  {modulos.map((m) => (
                    <option key={m.tempId} value={m.tempId}>{m.nome}</option>
                  ))}
                </select>
              </div>

              {/* ✅ CATEGORIAS COM CHECKBOXES */}
              <div className="field">
                <div className="categorias-header">
                  <label className="label">Categorias <span className="required">*</span></label>

                  {!creatingCategory ? (
                    <button
                      type="button"
                      className="btn-add-categoria"
                      onClick={onStartCreateCategory}
                      aria-label="Criar nova categoria"
                      title="Nova categoria"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden focusable="false">
                        <path d="M12 5v14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Nova categoria
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn-cancel-categoria"
                      onClick={onCancelCreateCategory}
                      aria-label="Cancelar"
                      title="Cancelar"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden focusable="false">
                        <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Cancelar
                    </button>
                  )}
                </div>

                {creatingCategory && (
                  <div className="new-category-inline">
                    <input
                      className="input"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Nome da nova categoria"
                      aria-label="Nome da nova categoria"
                    />
                    <button
                      type="button"
                      className="btn-primary small"
                      onClick={onConfirmCreateCategory}
                      title="Salvar"
                    >
                      Salvar
                    </button>
                  </div>
                )}

                {/* CHECKBOXES DAS CATEGORIAS */}
                <div className="categorias-checkboxes" role="list" aria-label="Categorias disponíveis">
                  {categoriasPorModulo(draft?.moduloTempId ?? '').length === 0 ? (
                    <p className="empty-categorias">Nenhuma categoria disponível. Crie uma categoria para este módulo.</p>
                  ) : (
                    categoriasPorModulo(draft?.moduloTempId ?? '').map((cat) => {
                      const isSelected = (draft?.categoriasTempIds || []).includes(cat.tempId);
                      const inputId = `cat-${cat.tempId}`;

                      return (
                        <label key={cat.tempId} className="checkbox-item" htmlFor={inputId} role="listitem">
                          <input
                            id={inputId}
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleCategoria(cat.tempId)}
                            aria-checked={isSelected}
                          />
                          <span className="checkbox-custom" aria-hidden />
                          <span className="checkbox-label">{cat.nome}</span>

                          {/* Botão de deletar categoria */}
                          {onDeleteCategoria && (
                            <button
                              type="button"
                              className="btn-delete-cat-inline"
                              onClick={(e) => {
                                e.preventDefault();
                                onDeleteCategoria(cat.tempId);
                              }}
                              title={`Excluir "${cat.nome}"`}
                              aria-label={`Excluir categoria ${cat.nome}`}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                                <path d="M3 6h18" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                                <path d="M8 6v12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M10 11v6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                                <path d="M14 11v6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                              </svg>
                            </button>
                          )}
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="responses-top-row">
                <button
                  type="button"
                  className="icon-circle-back"
                  onClick={onBack}
                  aria-label="Voltar"
                  title="Voltar"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M15 18L9 12l6-6" stroke="#0B2527" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
                      <path d="M12 5v14" stroke="#0B2527" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M5 12h14" stroke="#0B2527" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="respostas-list" role="list" aria-label="Respostas da pergunta">
                {draft?.respostas?.map((r, index) => (
                  <div key={r.tempId} className="resposta-row" role="listitem" aria-label={`Resposta ${index + 1}`}>
                    <div className="field resposta-field">
                      <label className="label-mini">Resposta {index + 1}</label>
                      <input
                        className="input"
                        value={r.resposta}
                        onChange={(e) => onUpdateResposta(r.tempId, 'resposta', e.target.value)}
                        aria-label={`Texto da resposta ${index + 1}`}
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
                        aria-label={`Valor da resposta ${index + 1}`}
                      />
                    </div>

                    {(draft?.respostas?.length ?? 0) > 1 && (
                      <button type="button" className="resposta-remove" onClick={() => onRemoveResposta(r.tempId)} aria-label="Remover resposta">✕</button>
                    )}
                  </div>
                )) ?? null}
              </div>
            </>
          )}
        </div>

        <footer className="modal-footer">
          <button
            type="button"
            className="icon-circle-footer"
            onClick={onClose}
            aria-label="Cancelar e fechar"
            title="Cancelar"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden focusable="false">
              <path d="M18 6L6 18" stroke="#0B2527" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M6 6l12 12" stroke="#0B2527" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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

        .select-with-caret {
          padding-right: 42px;
          background-repeat: no-repeat;
          background-position: right 12px center;
          background-size: 18px 18px;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 24 24'><path fill='none' stroke='%230B2527' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' d='M6 9l6 6 6-6'/></svg>");
        }

        /* ✅ HEADER DAS CATEGORIAS */
        .categorias-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }

        .btn-add-categoria,
        .btn-cancel-categoria {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 600;
          border-radius: 6px;
          border: 1px solid;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .btn-add-categoria {
          background: #fff;
          color: #0B2527;
          border-color: rgba(11,37,39,0.12);
        }
        .btn-add-categoria:hover {
          background: #f9fafb;
          border-color: #0B2527;
        }

        .btn-cancel-categoria {
          background: #fef2f2;
          color: #dc2626;
          border-color: #fecaca;
        }
        .btn-cancel-categoria:hover {
          background: #fee2e2;
        }

        .new-category-inline {
          display: flex;
          gap: 8px;
          align-items: center;
          margin-bottom: 12px;
          padding: 12px;
          background: #fafafa;
          border-radius: 8px;
          border: 1px dashed #d1d5db;
        }

        /* ✅ CHECKBOXES CUSTOMIZADOS */
        .categorias-checkboxes {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 12px;
          background: #fafafa;
          border-radius: 8px;
          border: 1px solid #eef2f7;
          max-height: 220px;
          overflow-y: auto;
        }

        .empty-categorias {
          color: #6b7280;
          font-size: 13px;
          text-align: center;
          padding: 12px;
          margin: 0;
        }

        .checkbox-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          background: #fff;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
          cursor: pointer;
          transition: all 0.15s ease;
          position: relative;
        }

        .checkbox-item:hover {
          border-color: #0B2527;
          background: #f9fafb;
        }

        .checkbox-item input[type="checkbox"] {
          position: absolute;
          opacity: 0;
          width: 0;
          height: 0;
        }

        .checkbox-custom {
          width: 18px;
          height: 18px;
          border: 2px solid #d1d5db;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
          flex-shrink: 0;
        }

        .checkbox-item input:checked + .checkbox-custom {
          background: #0B2527;
          border-color: #0B2527;
        }

        .checkbox-item input:checked + .checkbox-custom::after {
          content: "";
          width: 5px;
          height: 9px;
          border: solid #fff;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
          margin-top: -2px;
        }

        .checkbox-label {
          flex: 1;
          font-size: 14px;
          font-weight: 600;
          color: #374151;
        }

        .checkbox-item:hover .checkbox-label {
          color: #0B2527;
        }

        /* ✅ BOTÃO DE DELETAR CATEGORIA INLINE */
        .btn-delete-cat-inline {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 6px;
          background: transparent;
          border: 1px solid transparent;
          color: #dc2626;
          cursor: pointer;
          transition: all 0.15s ease;
          flex-shrink: 0;
        }

        .btn-delete-cat-inline:hover {
          background: #fef2f2;
          border-color: #fecaca;
        }

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
        .btn-primary.small { padding:6px 10px; font-size:13px; }

        .icon-circle-footer {
          display:inline-flex;
          align-items:center;
          justify-content:center;
          width:36px;
          height:36px;
          border-radius:999px;
          background: transparent;
          border: 1px solid #e5e7eb;
          cursor:pointer;
          color: #0B2527;
        }
        .icon-circle-footer:hover {
          background: #f9fafb;
        }

        @media (max-width: 920px) {
          .modal-sheet { width: calc(100% - 20px); }
          .responses-top-row { flex-direction:row; gap:8px; align-items:center; }
          .responses-top-title { padding-left:8px; }
        }
      `}</style>
    </div>
  );
}
