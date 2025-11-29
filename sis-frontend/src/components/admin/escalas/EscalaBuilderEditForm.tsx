// src/components/admin/escalas/EscalaBuilderEditForm.tsx
'use client';

import React, { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import type {
  EscalaFormState,
  PerguntaFormState,
  RespostaFormState,
} from './EscalaBuilderForm';

// Se quiser, pode extrair essas helpers para um arquivo comum e reusar
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

type Props = {
  escalaId: number;
  initialData: EscalaFormState; // precisa vir no mesmo formato do builder (com tempId, etc.)
};

export default function EscalaBuilderEditForm({ escalaId, initialData }: Props) {
  const router = useRouter();
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

  function updateCampoEscala<K extends keyof EscalaFormState>(
    field: K,
    value: EscalaFormState[K]
  ) {
    setState(prev => ({ ...prev, [field]: value }));
  }

  function updatePergunta(
    tempId: string,
    updater: (p: PerguntaFormState) => PerguntaFormState
  ) {
    setState(prev => ({
      ...prev,
      perguntas: prev.perguntas.map(p =>
        p.tempId === tempId ? updater(p) : p
      ),
    }));
  }

  function removePergunta(tempId: string) {
    setState(prev => ({
      ...prev,
      perguntas: prev.perguntas.filter(p => p.tempId !== tempId),
    }));
  }

  function addPergunta() {
    setState(prev => ({
      ...prev,
      perguntas: [...prev.perguntas, createEmptyPergunta()],
    }));
  }

  function addResposta(pergTempId: string) {
    updatePergunta(pergTempId, p => ({
      ...p,
      respostas: [...p.respostas, createEmptyResposta()],
    }));
  }

  function removeResposta(pergTempId: string, respTempId: string) {
    updatePergunta(pergTempId, p => ({
      ...p,
      respostas: p.respostas.filter(r => r.tempId !== respTempId),
    }));
  }

  function updateResposta(
    pergTempId: string,
    respTempId: string,
    value: string
  ) {
    updatePergunta(pergTempId, p => ({
      ...p,
      respostas: p.respostas.map(r =>
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

    // Agora incluímos os IDs para o backend conseguir atualizar
    const payload = {
      nome,
      dataVencimento: state.dataVencimento || null,
      ativo: state.ativo ? 1 : 0,
      perguntas: state.perguntas.map(p => ({
        id: p.id ?? null,
        pergunta: p.pergunta.trim(),
        valorInicialFavoravel: p.valorInicialFavoravel || null,
        valorFinalFavoravel: p.valorFinalFavoravel || null,
        valorInicialIntermediario: p.valorInicialIntermediario || null,
        valorFinalIntermediario: p.valorFinalIntermediario || null,
        valorInicialRisco: p.valorInicialRisco || null,
        valorFinalRisco: p.valorFinalRisco || null,
        respostas: p.respostas.map(r => ({
          id: r.id ?? null,
          resposta: r.resposta.trim(),
        })),
      })),
    };

    setSaving(true);
    fetch(`/api/escalas/builder/${escalaId}`, {
      method: 'PUT', // 👈 aqui é edição
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(async res => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || 'Erro ao atualizar escala.');
        }
        toast.success('Escala atualizada com sucesso!');
        router.push('/admin/escalas');
      })
      .catch((err: any) => {
        console.error(err);
        toast.error(err.message || 'Erro ao atualizar escala.');
      })
      .finally(() => setSaving(false));
  }

  return (
    <form className="escala-form" onSubmit={handleSubmit}>
      {/* Bloco de dados básicos da escala */}
      <section className="card">
        <h2 className="card-title">Dados da escala</h2>
        <p className="card-subtitle">
          Ajuste o nome e a data de vencimento da escala.
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
              onChange={e => updateCampoEscala('nome', e.target.value)}
              placeholder="Ex.: Escala de Clima Organizacional 2025"
            />
          </div>

          <div className="field">
            <label className="label">Data de vencimento</label>
            <input
              type="date"
              className="input"
              value={state.dataVencimento}
              onChange={e =>
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
                onChange={e => updateCampoEscala('ativo', e.target.checked)}
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

          <button type="button" className="btn-secondary" onClick={addPergunta}>
            + Adicionar pergunta
          </button>
        </div>

        {state.perguntas.map((p, index) => (
          <div key={p.tempId} className="pergunta-card">
            <div className="pergunta-header">
              <h3 className="pergunta-title">Pergunta {index + 1}</h3>
              {state.perguntas.length > 1 && (
                <button
                  type="button"
                  className="pergunta-remove"
                  onClick={() => removePergunta(p.tempId)}
                >
                  Remover
                </button>
              )}
            </div>

            <div className="field">
              <label className="label">
                Texto da pergunta <span className="required">*</span>
              </label>
              <textarea
                className="textarea"
                value={p.pergunta}
                onChange={e =>
                  updatePergunta(p.tempId, prev => ({
                    ...prev,
                    pergunta: e.target.value,
                  }))
                }
                placeholder="Ex.: Como você avalia o ambiente de trabalho?"
              />
            </div>

            {/* Faixas */}
            <div className="faixas-grid">
              <div className="faixa-col">
                <h4 className="faixa-title">Favorável</h4>
                <div className="faixa-row">
                  <div className="field compact">
                    <label className="label-mini">De</label>
                    <input
                      className="input"
                      value={p.valorInicialFavoravel}
                      onChange={e =>
                        updatePergunta(p.tempId, prev => ({
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
                      onChange={e =>
                        updatePergunta(p.tempId, prev => ({
                          ...prev,
                          valorFinalFavoravel: e.target.value,
                        }))
                      }
                      placeholder="Ex.: 10"
                    />
                  </div>
                </div>
              </div>

              <div className="faixa-col">
                <h4 className="faixa-title">Intermediário</h4>
                <div className="faixa-row">
                  <div className="field compact">
                    <label className="label-mini">De</label>
                    <input
                      className="input"
                      value={p.valorInicialIntermediario}
                      onChange={e =>
                        updatePergunta(p.tempId, prev => ({
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
                      onChange={e =>
                        updatePergunta(p.tempId, prev => ({
                          ...prev,
                          valorFinalIntermediario: e.target.value,
                        }))
                      }
                      placeholder="Ex.: 6.9"
                    />
                  </div>
                </div>
              </div>

              <div className="faixa-col">
                <h4 className="faixa-title">Risco</h4>
                <div className="faixa-row">
                  <div className="field compact">
                    <label className="label-mini">De</label>
                    <input
                      className="input"
                      value={p.valorInicialRisco}
                      onChange={e =>
                        updatePergunta(p.tempId, prev => ({
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
                      onChange={e =>
                        updatePergunta(p.tempId, prev => ({
                          ...prev,
                          valorFinalRisco: e.target.value,
                        }))
                      }
                      placeholder="Ex.: 3.9"
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
                      onChange={e =>
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
                        removeResposta(p.tempId, r.tempId)
                      }
                    >
                      Remover
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
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
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </div>

      {/* 👇 copie o mesmo bloco de <style jsx> do EscalaBuilderForm,
          ou importe via CSS global se já estiver extraído */}

      <style jsx>{`
        /* exatamente o mesmo CSS do EscalaBuilderForm.tsx */
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
        }
        .pergunta-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
          gap: 8px;
        }
        .pergunta-title {
          font-size: 15px;
          font-weight: 700;
          color: #111827;
          margin: 0;
        }
        .pergunta-remove,
        .resposta-remove {
          border: none;
          background: transparent;
          color: #b91c1c;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
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
          .footer-actions {
            flex-direction: column-reverse;
            align-items: stretch;
          }
        }
      `}</style>
    </form>
  );
}
