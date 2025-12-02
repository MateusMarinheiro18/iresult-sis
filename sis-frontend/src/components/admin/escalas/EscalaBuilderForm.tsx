// src/components/admin/escalas/EscalaBuilderForm.tsx
'use client';

import React, { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useConfirm } from '@/components/ui/ConfirmProvider';

export type RespostaFormState = {
  tempId: string;
  id?: number;
  resposta: string;
};

export type PerguntaFormState = {
  tempId: string;
  id?: number;
  pergunta: string;

  valorInicialFavoravel: string;
  valorFinalFavoravel: string;
  valorInicialIntermediario: string;
  valorFinalIntermediario: string;
  valorInicialRisco: string;
  valorFinalRisco: string;

  respostas: RespostaFormState[];
};

export type EscalaFormState = {
  id?: number;
  nome: string;
  dataVencimento: string; // yyyy-mm-dd
  ativo: boolean;
  perguntas: PerguntaFormState[];
};

type Props = {
  mode: 'create'; // no futuro dá pra usar 'edit'
  initialData?: EscalaFormState;
};

function createTempId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createEmptyResposta(): RespostaFormState {
  return {
    tempId: createTempId('resp'),
    resposta: '',
  };
}

function createEmptyPergunta(): PerguntaFormState {
  return {
    tempId: createTempId('perg'),
    pergunta: '',
    valorInicialFavoravel: '',
    valorFinalFavoravel: '',
    valorInicialIntermediario: '',
    valorFinalIntermediario: '',
    valorInicialRisco: '',
    valorFinalRisco: '',
    respostas: [createEmptyResposta()],
  };
}

export default function EscalaBuilderForm({ mode, initialData }: Props) {
  const router = useRouter();
  const confirm = useConfirm();
  const [saving, setSaving] = useState(false);

  const [state, setState] = useState<EscalaFormState>(() => {
    if (initialData) return initialData;
    return {
      nome: '',
      dataVencimento: '',
      ativo: true,
      perguntas: [createEmptyPergunta()],
    };
  });

  // Estado de colapso/expansão por pergunta (key = tempId)
  const [collapsedById, setCollapsedById] = useState<Record<string, boolean>>(
    {}
  );

  function togglePerguntaCollapsed(tempId: string) {
    setCollapsedById((prev) => ({
      ...prev,
      [tempId]: !prev[tempId],
    }));
  }

  function updateCampoEscala<K extends keyof EscalaFormState>(
    field: K,
    value: EscalaFormState[K]
  ) {
    setState((prev) => ({ ...prev, [field]: value }));
  }

  function removePerguntaInternal(tempId: string) {
    setState((prev) => ({
      ...prev,
      perguntas: prev.perguntas.filter((p) => p.tempId !== tempId),
    }));
  }

  async function handleRemovePergunta(tempId: string) {
    const ok = await confirm({
      title: 'Remover pergunta',
      description:
        'Tem certeza que deseja remover esta pergunta e todas as respostas associadas?',
      confirmLabel: 'Remover',
      cancelLabel: 'Cancelar',
      danger: true,
    });
    if (!ok) return;
    removePerguntaInternal(tempId);
  }

  function addPergunta() {
    setState((prev) => ({
      ...prev,
      perguntas: [...prev.perguntas, createEmptyPergunta()],
    }));
  }

  function addResposta(pergTempId: string) {
    updatePergunta(pergTempId, (p) => ({
      ...p,
      respostas: [...p.respostas, createEmptyResposta()],
    }));
  }

  function removeRespostaInternal(pergTempId: string, respTempId: string) {
    updatePergunta(pergTempId, (p) => ({
      ...p,
      respostas: p.respostas.filter((r) => r.tempId !== respTempId),
    }));
  }

  async function handleRemoveResposta(pergTempId: string, respTempId: string) {
    const ok = await confirm({
      title: 'Remover resposta',
      description: 'Tem certeza que deseja remover esta resposta?',
      confirmLabel: 'Remover',
      cancelLabel: 'Cancelar',
      danger: true,
    });
    if (!ok) return;
    removeRespostaInternal(pergTempId, respTempId);
  }

  function updatePergunta(
    tempId: string,
    updater: (p: PerguntaFormState) => PerguntaFormState
  ) {
    setState((prev) => ({
      ...prev,
      perguntas: prev.perguntas.map((p) =>
        p.tempId === tempId ? updater(p) : p
      ),
    }));
  }

  function updateResposta(
    pergTempId: string,
    respTempId: string,
    value: string
  ) {
    updatePergunta(pergTempId, (p) => ({
      ...p,
      respostas: p.respostas.map((r) =>
        r.tempId === respTempId ? { ...r, resposta: value } : r
      ),
    }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;

    const nome = state.nome.trim();
    if (!nome) {
      toast.error('Informe o nome da escala.');
      return;
    }

    if (!state.perguntas.length) {
      toast.error('Adicione pelo menos uma pergunta.');
      return;
    }

    for (let i = 0; i < state.perguntas.length; i++) {
      const p = state.perguntas[i];
      if (!p.pergunta.trim()) {
        toast.error(`Pergunta ${i + 1}: texto é obrigatório.`);
        return;
      }
      if (!p.respostas.length) {
        toast.error(`Pergunta ${i + 1}: adicione pelo menos uma resposta.`);
        return;
      }
      for (let j = 0; j < p.respostas.length; j++) {
        if (!p.respostas[j].resposta.trim()) {
          toast.error(
            `Pergunta ${i + 1}, resposta ${j + 1}: texto é obrigatório.`
          );
          return;
        }
      }
    }

    const payload = {
      nome,
      dataVencimento: state.dataVencimento || null,
      ativo: state.ativo ? 1 : 0,
      perguntas: state.perguntas.map((p) => ({
        pergunta: p.pergunta.trim(),
        valorInicialFavoravel: p.valorInicialFavoravel || null,
        valorFinalFavoravel: p.valorFinalFavoravel || null,
        valorInicialIntermediario: p.valorInicialIntermediario || null,
        valorFinalIntermediario: p.valorFinalIntermediario || null,
        valorInicialRisco: p.valorInicialRisco || null,
        valorFinalRisco: p.valorFinalRisco || null,
        respostas: p.respostas.map((r) => ({
          resposta: r.resposta.trim(),
        })),
      })),
    };

    setSaving(true);
    fetch('/api/escalas/builder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || 'Erro ao salvar escala.');
        }
        toast.success('Escala criada com sucesso!');
        router.push('/admin/escalas');
      })
      .catch((err: any) => {
        console.error(err);
        toast.error(err.message || 'Erro ao salvar escala.');
      })
      .finally(() => setSaving(false));
  }

  return (
    <form className="escala-form" onSubmit={handleSubmit}>
      {/* Bloco de dados básicos da escala */}
      <section className="card">
        <h2 className="card-title">Dados da escala</h2>
        <p className="card-subtitle">
          Informe o nome e a data de vencimento da escala.
        </p>

        <div className="field-grid">
          <div className="field">
            <label className="label">
              Nome da escala <span className="required">*</span>
            </label>
            <input
              type="text"
              className="input"
              value={state.nome}
              onChange={(e) => updateCampoEscala('nome', e.target.value)}
              placeholder="Ex.: Escala de Clima Organizacional 2025"
            />
          </div>

          <div className="field">
            <label className="label">Data de vencimento</label>
            <input
              type="date"
              className="input"
              value={state.dataVencimento}
              onChange={(e) =>
                updateCampoEscala('dataVencimento', e.target.value)
              }
            />
          </div>

          <div className="field switch-field">
            <label className="label">Ativa</label>
            <label className="switch">
              <input
                type="checkbox"
                checked={state.ativo}
                onChange={(e) => updateCampoEscala('ativo', e.target.checked)}
              />
              <span className="slider" />
            </label>
          </div>
        </div>
      </section>

      {/* Bloco de perguntas e respostas */}
      <section className="card">
        <div className="card-header-row">
          <div>
            <h2 className="card-title">Perguntas da escala</h2>
            <p className="card-subtitle">
              Configure as perguntas e as faixas de Favorável / Intermediário /
              Risco.
            </p>
          </div>

          <button
            type="button"
            className="btn-secondary"
            onClick={addPergunta}
          >
            + Adicionar pergunta
          </button>
        </div>

        {state.perguntas.map((p, index) => {
          const isCollapsed = collapsedById[p.tempId] ?? false;
          const preview =
            p.pergunta.trim() ||
            'Clique para expandir e editar o texto da pergunta.';

          return (
            <div
              key={p.tempId}
              className={`pergunta-card ${isCollapsed ? 'collapsed' : ''}`}
            >
              <div className="pergunta-header">
                <button
                  type="button"
                  className="toggle-btn"
                  onClick={() => togglePerguntaCollapsed(p.tempId)}
                  aria-expanded={!isCollapsed}
                  aria-label={
                    isCollapsed
                      ? `Expandir pergunta ${index + 1}`
                      : `Recolher pergunta ${index + 1}`
                  }
                >
                  <span
                    className={`chevron ${isCollapsed ? 'collapsed' : ''}`}
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M8 10l4 4 4-4"
                        stroke="#374151"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </button>

                <div className="pergunta-header-main">
                  <h3 className="pergunta-title">Pergunta {index + 1}</h3>
                  <p className="pergunta-preview">{preview}</p>
                </div>

                {state.perguntas.length > 1 && (
                  <button
                    type="button"
                    className="pergunta-remove"
                    onClick={() => handleRemovePergunta(p.tempId)}
                    aria-label="Remover pergunta"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M9 3h6l-.5 2H9.5L9 3Z"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M5 5h14"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                      <path
                        d="M10 9v6"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                      <path
                        d="M14 9v6"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                      />
                      <path
                        d="M8 5h8v11a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V5Z"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                )}
              </div>

              {/* Só renderiza o corpo da pergunta quando NÃO estiver colapsada */}
              {!isCollapsed && (
                <>
                  <div className="field">
                    <label className="label">
                      Texto da pergunta <span className="required">*</span>
                    </label>
                    <textarea
                      className="textarea"
                      value={p.pergunta}
                      onChange={(e) =>
                        updatePergunta(p.tempId, (prev) => ({
                          ...prev,
                          pergunta: e.target.value,
                        }))
                      }
                      placeholder="Ex.: Como você avalia o ambiente de trabalho?"
                    />
                  </div>

                  {/* Faixas – agora na ordem: RISCO, INTERMEDIÁRIO, FAVORÁVEL */}
                  <div className="faixas-grid">
                    {/* Risco */}
                    <div className="faixa-col">
                      <h4 className="faixa-title">
                        <span className="faixa-dot faixa-dot-risco" />
                        Risco
                      </h4>
                      <div className="faixa-row">
                        <div className="field compact">
                          <label className="label-mini">De</label>
                          <input
                            className="input"
                            value={p.valorInicialRisco}
                            onChange={(e) =>
                              updatePergunta(p.tempId, (prev) => ({
                                ...prev,
                                valorInicialRisco: e.target.value,
                              }))
                            }
                            placeholder="Ex.: 0"
                          />
                        </div>
                        <div className="field compact">
                          <label className="label-mini">Até</label>
                          <input
                            className="input"
                            value={p.valorFinalRisco}
                            onChange={(e) =>
                              updatePergunta(p.tempId, (prev) => ({
                                ...prev,
                                valorFinalRisco: e.target.value,
                              }))
                            }
                            placeholder="Ex.: 3.9"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Intermediário */}
                    <div className="faixa-col">
                      <h4 className="faixa-title">
                        <span className="faixa-dot faixa-dot-intermediario" />
                        Intermediário
                      </h4>
                      <div className="faixa-row">
                        <div className="field compact">
                          <label className="label-mini">De</label>
                          <input
                            className="input"
                            value={p.valorInicialIntermediario}
                            onChange={(e) =>
                              updatePergunta(p.tempId, (prev) => ({
                                ...prev,
                                valorInicialIntermediario: e.target.value,
                              }))
                            }
                            placeholder="Ex.: 4"
                          />
                        </div>
                        <div className="field compact">
                          <label className="label-mini">Até</label>
                          <input
                            className="input"
                            value={p.valorFinalIntermediario}
                            onChange={(e) =>
                              updatePergunta(p.tempId, (prev) => ({
                                ...prev,
                                valorFinalIntermediario: e.target.value,
                              }))
                            }
                            placeholder="Ex.: 6.9"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Favorável */}
                    <div className="faixa-col">
                      <h4 className="faixa-title">
                        <span className="faixa-dot faixa-dot-favoravel" />
                        Favorável
                      </h4>
                      <div className="faixa-row">
                        <div className="field compact">
                          <label className="label-mini">De</label>
                          <input
                            className="input"
                            value={p.valorInicialFavoravel}
                            onChange={(e) =>
                              updatePergunta(p.tempId, (prev) => ({
                                ...prev,
                                valorInicialFavoravel: e.target.value,
                              }))
                            }
                            placeholder="Ex.: 7"
                          />
                        </div>
                        <div className="field compact">
                          <label className="label-mini">Até</label>
                          <input
                            className="input"
                            value={p.valorFinalFavoravel}
                            onChange={(e) =>
                              updatePergunta(p.tempId, (prev) => ({
                                ...prev,
                                valorFinalFavoravel: e.target.value,
                              }))
                            }
                            placeholder="Ex.: 10"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Respostas possíveis */}
                  <div className="respostas-block">
                    <div className="respostas-header">
                      <h4 className="respostas-title">Respostas possíveis</h4>
                      <button
                        type="button"
                        className="btn-tertiary"
                        onClick={() => addResposta(p.tempId)}
                      >
                        + Adicionar resposta
                      </button>
                    </div>

                    {p.respostas.map((r, rIndex) => (
                      <div key={r.tempId} className="resposta-row">
                        <div className="field resposta-field">
                          <label className="label-mini">
                            Resposta {rIndex + 1}
                          </label>
                          <input
                            className="input"
                            value={r.resposta}
                            onChange={(e) =>
                              updateResposta(p.tempId, r.tempId, e.target.value)
                            }
                            placeholder="Ex.: Discordo totalmente"
                          />
                        </div>
                        {p.respostas.length > 1 && (
                          <button
                            type="button"
                            className="resposta-remove"
                            onClick={() =>
                              handleRemoveResposta(p.tempId, r.tempId)
                            }
                            aria-label="Remover resposta"
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                d="M9 3h6l-.5 2H9.5L9 3Z"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                              <path
                                d="M5 5h14"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                              />
                              <path
                                d="M10 9v6"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                              />
                              <path
                                d="M14 9v6"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                              />
                              <path
                                d="M8 5h8v11a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V5Z"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </section>

      <div className="footer-actions">
        <button
          type="button"
          className="btn-secondary"
          onClick={() => router.push('/admin/escalas')}
          disabled={saving}
        >
          Cancelar
        </button>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar escala'}
        </button>
      </div>

      <style jsx>{`
        .escala-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .card {
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 6px 18px rgba(11, 37, 39, 0.06);
          padding: 20px 20px 18px;
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
          margin: 0 0 14px;
        }

        .card-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }

        .field-grid {
          display: grid;
          grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) auto;
          gap: 16px;
          align-items: flex-end;
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .field.compact {
          gap: 4px;
        }

        .label {
          font-size: 13px;
          font-weight: 600;
          color: #374151;
        }

        .label-mini {
          font-size: 11px;
          font-weight: 600;
          color: #6b7280;
        }

        .required {
          color: #b91c1c;
          margin-left: 2px;
        }

        .input,
        .textarea {
          width: 100%;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          padding: 8px 10px;
          font-size: 14px;
          color: #111827;
          outline: none;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .textarea {
          min-height: 60px;
          resize: vertical;
        }

        .input:focus,
        .textarea:focus {
          border-color: #0b2527;
          box-shadow: 0 0 0 1px rgba(11, 37, 39, 0.1);
        }

        .switch-field {
          align-items: flex-start;
        }

        .switch {
          position: relative;
          display: inline-block;
          width: 42px;
          height: 24px;
        }

        .switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #d1d5db;
          transition: 0.2s;
          border-radius: 999px;
        }

        .slider::before {
          position: absolute;
          content: '';
          height: 18px;
          width: 18px;
          left: 3px;
          top: 3px;
          background-color: white;
          transition: 0.2s;
          border-radius: 50%;
        }

        .switch input:checked + .slider {
          background-color: #0b2527;
        }

        .switch input:checked + .slider::before {
          transform: translateX(18px);
        }

        .pergunta-card {
          border-radius: 10px;
          border: 1px solid #e5e7eb;
          padding: 14px 14px 10px;
          margin-top: 12px;
          background: #f9fafb;
          transition: background 0.15s ease, border-color 0.15s ease;
        }

        .pergunta-card.collapsed {
          padding-bottom: 8px;
          background: #fdfdfd;
        }

        .pergunta-header {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
        }

        .pergunta-header-main {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .pergunta-title {
          font-size: 15px;
          font-weight: 700;
          color: #111827;
          margin: 0;
        }

        .pergunta-preview {
          margin: 0;
          font-size: 12px;
          color: #6b7280;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .toggle-btn {
          border: none;
          background: transparent;
          padding: 4px;
          border-radius: 999px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s ease;
        }

        .toggle-btn:hover {
          background: rgba(15, 59, 62, 0.06);
        }

        .chevron {
          display: inline-block;
          transition: transform 0.2s ease;
        }

        .chevron.collapsed {
          transform: rotate(-90deg);
        }

        .pergunta-remove,
        .resposta-remove {
          border: none;
          background: transparent;
          color: #dc2626;
          font-size: 13px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 999px;
          padding: 0;
          transition: background 0.15s ease, transform 0.1s ease;
        }

        .pergunta-remove:hover,
        .resposta-remove:hover {
          background: rgba(220, 38, 38, 0.08);
          transform: translateY(-0.5px);
        }

        .pergunta-remove:focus-visible,
        .resposta-remove:focus-visible {
          outline: 2px solid #dc2626;
          outline-offset: 2px;
        }

        .faixas-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin: 12px 0 4px;
        }

        .faixa-col {
          background: #ffffff;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          padding: 10px 10px 8px;
        }

        .faixa-title {
          font-size: 13px;
          font-weight: 700;
          color: #111827;
          margin: 0 0 6px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .faixa-dot {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          display: inline-block;
        }

        .faixa-dot-risco {
          background: #dc2626;
        }

        .faixa-dot-intermediario {
          background: #facc15;
        }

        .faixa-dot-favoravel {
          background: #16a34a;
        }

        .faixa-row {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .respostas-block {
          margin-top: 12px;
          border-top: 1px dashed #e5e7eb;
          padding-top: 10px;
        }

        .respostas-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .respostas-title {
          font-size: 13px;
          font-weight: 700;
          color: #111827;
          margin: 0;
        }

        .resposta-row {
          display: flex;
          align-items: flex-end;
          gap: 8px;
          margin-bottom: 8px;
        }

        .resposta-field {
          flex: 1;
        }

        .btn-primary,
        .btn-secondary,
        .btn-tertiary {
          border-radius: 999px;
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          border: 1px solid transparent;
          transition: all 0.15s ease;
          white-space: nowrap;
        }

        .btn-primary {
          background: #0b2527;
          color: #ffffff;
          border-color: #0b2527;
        }

        .btn-primary:hover {
          background: #134148;
          border-color: #134148;
        }

        .btn-secondary {
          background: #ffffff;
          color: #0b2527;
          border-color: #0b2527;
        }

        .btn-secondary:hover {
          background: #f3f4ff;
        }

        .btn-tertiary {
          background: transparent;
          color: #0b2527;
          border-color: #d1d5db;
          padding-inline: 12px;
        }

        .btn-tertiary:hover {
          background: #f9fafb;
        }

        .footer-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 4px;
        }

        @media (max-width: 960px) {
          .field-grid {
            grid-template-columns: minmax(0, 1fr);
          }
          .faixas-grid {
            grid-template-columns: minmax(0, 1fr);
          }
          .pergunta-header {
            grid-template-columns: auto minmax(0, 1fr) auto;
          }
          .footer-actions {
            flex-direction: column-reverse;
            align-items: stretch;
          }
        }
      `}</style>
    </form>
  );
}
