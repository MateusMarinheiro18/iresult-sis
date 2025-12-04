// src/components/admin/escalas/EscalaBuilderForm.tsx
'use client';

import React, { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useConfirm } from '@/components/ui/ConfirmProvider';

import {
  EscalaFormState,
  ModuloFormState,
  PerguntaFormState,
  RespostaFormState,
  CategoriaFormState,
} from './types';

import ModuleModal from './ModuleModal';
import ModuleList from './ModuleList';
import QuestionModal from './QuestionModal';
import QuestionList from './QuestionList';

function createTempId(prefix = 'id') {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createEmptyModulo(): ModuloFormState {
  return {
    tempId: createTempId('mod'),
    nome: '',
    valorInicialFavoravel: '',
    valorFinalFavoravel: '',
    valorInicialIntermediario: '',
    valorFinalIntermediario: '',
    valorInicialRisco: '',
    valorFinalRisco: '',
  };
}

function createEmptyResposta(valor?: number): RespostaFormState {
  return {
    tempId: createTempId('resp'),
    resposta: '',
    valor: typeof valor === 'number' ? valor : '',
  };
}

function createDefaultRespostasLikert(): RespostaFormState[] {
  return [1, 2, 3, 4, 5].map((v) => createEmptyResposta(v));
}

export default function EscalaBuilderForm({
  mode = 'create',
  initialData,
}: {
  mode?: 'create';
  initialData?: EscalaFormState;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [saving, setSaving] = useState(false);

  const [state, setState] = useState<EscalaFormState>(() => initialData ?? {
    nome: '',
    dataVencimento: '',
    ativo: true,
    modulos: [],
    categorias: [],
    perguntas: [],
  });

  // Module modal
  const [moduleModalOpen, setModuleModalOpen] = useState(false);
  const [editingModuleTempId, setEditingModuleTempId] = useState<string | null>(null);
  const [moduleDraft, setModuleDraft] = useState<ModuloFormState | null>(null);

  function openNewModuleModal() {
    setEditingModuleTempId(null);
    setModuleDraft(createEmptyModulo());
    setModuleModalOpen(true);
  }
  function openEditModuleModal(tempId: string) {
    const mod = state.modulos.find((m) => m.tempId === tempId);
    if (!mod) return;
    setEditingModuleTempId(tempId);
    setModuleDraft({ ...mod });
    setModuleModalOpen(true);
  }
  function closeModuleModal() {
    setModuleModalOpen(false);
    setModuleDraft(null);
    setEditingModuleTempId(null);
  }
  function handleModuleDraftChange<K extends keyof ModuloFormState>(field: K, value: ModuloFormState[K]) {
    if (!moduleDraft) return;
    setModuleDraft({ ...moduleDraft, [field]: value });
  }
  async function handleSaveModule() {
    if (!moduleDraft) return;
    const nome = moduleDraft.nome.trim();
    if (!nome) {
      toast.error('Informe o nome do módulo.');
      return;
    }

    if (editingModuleTempId) {
      setState((prev) => ({ ...prev, modulos: prev.modulos.map((m) => (m.tempId === editingModuleTempId ? { ...moduleDraft, nome } : m)) }));
    } else {
      setState((prev) => ({ ...prev, modulos: [...prev.modulos, { ...moduleDraft, nome, tempId: createTempId('mod') }] }));
    }
    closeModuleModal();
  }

  async function handleRemoveModule(tempId: string) {
    const hasQuestions = state.perguntas.some((p) => p.moduloTempId === tempId);
    if (hasQuestions) {
      toast.error('Não é possível remover um módulo que possui perguntas vinculadas.');
      return;
    }
    const ok = await confirm({
      title: 'Remover módulo',
      description: 'Tem certeza que deseja remover este módulo?',
      confirmLabel: 'Remover',
      cancelLabel: 'Cancelar',
      danger: true,
    });
    if (!ok) return;
    setState((prev) => ({ ...prev, modulos: prev.modulos.filter((m) => m.tempId !== tempId), categorias: prev.categorias.filter((c) => c.moduloTempId !== tempId) }));
  }

  // Question modal (we use PerguntaFormState shape for the draft so types align)
  type PerguntaDraftState = PerguntaFormState; // alias for clarity

  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [questionModalStep, setQuestionModalStep] = useState<1 | 2>(1);
  const [editingQuestionTempId, setEditingQuestionTempId] = useState<string | null>(null);
  const [questionDraft, setQuestionDraft] = useState<PerguntaDraftState | null>(null);

  const [creatingCategory, setCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  function openNewQuestionModal() {
    if (state.modulos.length === 0) {
      toast.error('Crie pelo menos um módulo antes de adicionar perguntas.');
      return;
    }
    const defaultModuloTempId = state.modulos[0]?.tempId ?? '';
    setEditingQuestionTempId(null);
    setQuestionDraft({
      tempId: createTempId('perg'),
      pergunta: '',
      ordem: state.perguntas.length + 1,
      moduloTempId: defaultModuloTempId,
      categoriaTempId: '',
      respostas: createDefaultRespostasLikert(),
    });
    setQuestionModalStep(1);
    setCreatingCategory(false);
    setNewCategoryName('');
    setQuestionModalOpen(true);
  }

  function openEditQuestionModal(tempId: string) {
    const perg = state.perguntas.find((p) => p.tempId === tempId);
    if (!perg) return;
    setEditingQuestionTempId(tempId);
    setQuestionDraft({
      tempId: perg.tempId,
      pergunta: perg.pergunta,
      ordem: perg.ordem,
      moduloTempId: perg.moduloTempId,
      categoriaTempId: perg.categoriaTempId,
      respostas: perg.respostas.map((r) => ({ ...r })),
    });
    setQuestionModalStep(1);
    setCreatingCategory(false);
    setNewCategoryName('');
    setQuestionModalOpen(true);
  }

  function closeQuestionModal() {
    setQuestionModalOpen(false);
    setQuestionDraft(null);
    setEditingQuestionTempId(null);
    setQuestionModalStep(1);
    setCreatingCategory(false);
    setNewCategoryName('');
  }

  function handleQuestionDraftChange(field: keyof PerguntaDraftState, value: PerguntaDraftState[keyof PerguntaDraftState]) {
    if (!questionDraft) return;
    setQuestionDraft({ ...questionDraft, [field]: value } as PerguntaDraftState);
  }

  function handleQuestionStep1Next() {
    if (!questionDraft) return;
    const texto = questionDraft.pergunta.trim();
    if (!texto) {
      toast.error('Informe o texto da pergunta.');
      return;
    }
    if (!questionDraft.moduloTempId) {
      toast.error('Selecione um módulo para a pergunta.');
      return;
    }
    if (!questionDraft.categoriaTempId) {
      toast.error('Selecione uma categoria para a pergunta.');
      return;
    }
    setQuestionModalStep(2);
  }

  function handleAddRespostaToDraft() {
    if (!questionDraft) return;
    setQuestionDraft({ ...questionDraft, respostas: [...questionDraft.respostas, createEmptyResposta()] });
  }

  function handleUpdateRespostaInDraft(respTempId: string, field: 'resposta' | 'valor', value: string) {
    if (!questionDraft) return;
    const updated = questionDraft.respostas.map((r) => {
      if (r.tempId !== respTempId) return r;
      if (field === 'resposta') {
        return { ...r, resposta: value };
      } else {
        const newVal = value === '' ? '' : Number(value);
        return { ...r, valor: newVal as RespostaFormState['valor'] };
      }
    });
    setQuestionDraft({ ...questionDraft, respostas: updated });
  }

  async function handleRemoveRespostaInDraft(respTempId: string) {
    if (!questionDraft) return;
    if (questionDraft.respostas.length <= 1) {
      toast.error('A pergunta deve ter pelo menos uma resposta possível.');
      return;
    }
    const ok = await confirm({
      title: 'Remover resposta',
      description: 'Tem certeza que deseja remover esta resposta?',
      confirmLabel: 'Remover',
      cancelLabel: 'Cancelar',
      danger: true,
    });
    if (!ok) return;
    setQuestionDraft({ ...questionDraft, respostas: questionDraft.respostas.filter((r) => r.tempId !== respTempId) });
  }

  function handleQuestionStep2Save() {
    if (!questionDraft) return;

    for (let i = 0; i < questionDraft.respostas.length; i++) {
      const r = questionDraft.respostas[i];
      if (!r.resposta.trim()) {
        toast.error(`Resposta ${i + 1}: texto é obrigatório.`);
        return;
      }
      if (r.valor === '' || Number.isNaN(Number(r.valor))) {
        toast.error(`Resposta ${i + 1}: informe um valor entre 1 e 5.`);
        return;
      }
      if (Number(r.valor) < 1 || Number(r.valor) > 5) {
        toast.error(`Resposta ${i + 1}: valor deve ser entre 1 e 5.`);
        return;
      }
    }

    setState((prev) => {
      const perguntas = [...prev.perguntas];
      if (editingQuestionTempId) {
        const idx = perguntas.findIndex((p) => p.tempId === editingQuestionTempId);
        if (idx >= 0) {
          perguntas[idx] = {
            ...perguntas[idx],
            pergunta: questionDraft.pergunta.trim(),
            moduloTempId: questionDraft.moduloTempId,
            categoriaTempId: questionDraft.categoriaTempId,
            ordem: questionDraft.ordem,
            respostas: questionDraft.respostas.map((r) => ({ ...r, resposta: r.resposta.trim() })),
          };
        }
      } else {
        const ordem = perguntas.length + 1;
        perguntas.push({
          tempId: questionDraft.tempId,
          pergunta: questionDraft.pergunta.trim(),
          ordem,
          moduloTempId: questionDraft.moduloTempId,
          categoriaTempId: questionDraft.categoriaTempId,
          respostas: questionDraft.respostas.map((r) => ({ ...r, resposta: r.resposta.trim() })),
        });
      }
      return { ...prev, perguntas };
    });

    closeQuestionModal();
  }

  // create category inline
  function startCreateCategory() { setCreatingCategory(true); setNewCategoryName(''); }
  function cancelCreateCategory() { setCreatingCategory(false); setNewCategoryName(''); }
  function confirmCreateCategory() {
    if (!questionDraft) return;
    const nome = newCategoryName.trim();
    if (!nome) { toast.error('Informe o nome da categoria.'); return; }
    const moduloTempId = questionDraft.moduloTempId;
    if (!moduloTempId) { toast.error('Selecione um módulo antes de criar a categoria.'); return; }
    const newCat: CategoriaFormState = { tempId: createTempId('cat'), nome, moduloTempId };
    setState((prev) => ({ ...prev, categorias: [...prev.categorias, newCat] }));
    setQuestionDraft({ ...questionDraft, categoriaTempId: newCat.tempId });
    setCreatingCategory(false);
    setNewCategoryName('');
  }

  // drag & drop questions
  const [draggingQuestionId, setDraggingQuestionId] = useState<string | null>(null);

  function handleDragStart(e: React.DragEvent<HTMLDivElement>, tempId: string) {
    setDraggingQuestionId(tempId);
    e.dataTransfer.effectAllowed = 'move';
  }
  function handleDragOver(e: React.DragEvent<HTMLDivElement>, tempId: string) {
    e.preventDefault();
    if (!draggingQuestionId || draggingQuestionId === tempId) return;
    e.dataTransfer.dropEffect = 'move';
  }
  function handleDrop(e: React.DragEvent<HTMLDivElement>, targetId: string) {
    e.preventDefault();
    if (!draggingQuestionId || draggingQuestionId === targetId) return;
    setState((prev) => {
      const perguntas = [...prev.perguntas];
      const fromIdx = perguntas.findIndex((p) => p.tempId === draggingQuestionId);
      const toIdx = perguntas.findIndex((p) => p.tempId === targetId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const [moved] = perguntas.splice(fromIdx, 1);
      perguntas.splice(toIdx, 0, moved);
      const perguntasComOrdem = perguntas.map((p, index) => ({ ...p, ordem: index + 1 }));
      return { ...prev, perguntas: perguntasComOrdem };
    });
    setDraggingQuestionId(null);
  }
  function handleDragEnd() { setDraggingQuestionId(null); }

  async function handleRemovePergunta(tempId: string) {
    const ok = await confirm({
      title: 'Remover pergunta',
      description: 'Tem certeza que deseja remover esta pergunta?',
      confirmLabel: 'Remover',
      cancelLabel: 'Cancelar',
      danger: true,
    });
    if (!ok) return;
    setState((prev) => {
      const perguntas = prev.perguntas.filter((p) => p.tempId !== tempId);
      const perguntasComOrdem = perguntas.map((p, index) => ({ ...p, ordem: index + 1 }));
      return { ...prev, perguntas: perguntasComOrdem };
    });
  }

  // helpers
  function getModuloName(moduloTempId: string) {
    return state.modulos.find((m) => m.tempId === moduloTempId)?.nome ?? '—';
  }

  function getCategoriaName(catTempId: string) {
    return state.categorias.find((c) => c.tempId === catTempId)?.nome ?? '—';
  }

  function updateCampoEscala<K extends keyof EscalaFormState>(field: K, value: EscalaFormState[K]) {
    setState((prev) => ({ ...prev, [field]: value }));
  }

  // submit
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;

    const nome = state.nome.trim();
    if (!nome) { toast.error('Informe o nome da escala.'); return; }
    if (!state.modulos.length) { toast.error('Adicione pelo menos um módulo à escala.'); return; }
    if (!state.perguntas.length) { toast.error('Adicione pelo menos uma pergunta.'); return; }

    // validate perguntas
    for (let i = 0; i < state.perguntas.length; i++) {
      const p = state.perguntas[i];
      if (!p.pergunta.trim()) { toast.error(`Pergunta ${i + 1}: texto é obrigatório.`); return; }
      if (!p.moduloTempId) { toast.error(`Pergunta ${i + 1}: selecione um módulo.`); return; }
      if (!p.categoriaTempId) { toast.error(`Pergunta ${i + 1}: selecione uma categoria.`); return; }
      if (!p.respostas.length) { toast.error(`Pergunta ${i + 1}: adicione pelo menos uma resposta.`); return; }
      for (let j = 0; j < p.respostas.length; j++) {
        const r = p.respostas[j];
        if (!r.resposta.trim()) { toast.error(`Pergunta ${i + 1}, resposta ${j + 1}: texto é obrigatório.`); return; }
        if (r.valor === '' || Number.isNaN(Number(r.valor)) || Number(r.valor) < 1 || Number(r.valor) > 5) {
          toast.error(`Pergunta ${i + 1}, resposta ${j + 1}: informe um valor entre 1 e 5.`);
          return;
        }
      }
    }

    const payload = {
      nome,
      dataVencimento: state.dataVencimento || null,
      ativo: state.ativo ? 1 : 0,
      modulos: state.modulos.map((m) => ({
        tempId: m.tempId,
        nome: m.nome.trim(),
        valorInicialFavoravel: m.valorInicialFavoravel || null,
        valorFinalFavoravel: m.valorFinalFavoravel || null,
        valorInicialIntermediario: m.valorInicialIntermediario || null,
        valorFinalIntermediario: m.valorFinalIntermediario || null,
        valorInicialRisco: m.valorInicialRisco || null,
        valorFinalRisco: m.valorFinalRisco || null,
      })),
      categorias: state.categorias.map((c) => ({
        tempId: c.tempId,
        nome: c.nome.trim(),
        moduloTempId: c.moduloTempId,
      })),
      perguntas: state.perguntas.map((p) => ({
        tempId: p.tempId,
        pergunta: p.pergunta.trim(),
        ordem: p.ordem,
        moduloTempId: p.moduloTempId,
        categoriaTempId: p.categoriaTempId,
        respostas: p.respostas.map((r) => ({ resposta: r.resposta.trim(), valor: Number(r.valor) })),
      })),
    };

    setSaving(true);
    try {
      const res = await fetch('/api/escalas/builder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Erro ao salvar escala.');
      toast.success('Escala criada com sucesso!');
      router.push('/admin/escalas');
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Erro ao salvar escala.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="escala-form" onSubmit={handleSubmit}>
      {/* DADOS BÁSICOS */}
      <section className="card data-card">
        {/* Banner/header com cor primária */}
        <div className="card-banner">
          <div>
            <h2 className="card-banner-title">Dados da escala</h2>
            <p className="card-banner-sub">Informe o nome e a data de vencimento da escala.</p>
          </div>
        </div>

        <div className="card-body">
          <div className="field-grid">
            <div className="field">
              <label className="label">Nome da escala <span className="required">*</span></label>
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
                onChange={(e) => updateCampoEscala('dataVencimento', e.target.value)}
                placeholder="dd/mm/aaaa"
              />
            </div>

            <div className="field switch-field">
              <label className="label">Ativa</label>
              <label className="switch new-switch" aria-label="Ativa">
                <input
                  type="checkbox"
                  checked={state.ativo}
                  onChange={(e) => updateCampoEscala('ativo', e.target.checked)}
                  aria-checked={state.ativo}
                />
                <span className="slider" />
              </label>
            </div>
          </div>
        </div>
      </section>

      {/* MÓDULOS */}
      <section className="card">
        <div className="card-header-row">
          <div>
            <h2 className="card-title">Módulos da escala</h2>
            <p className="card-subtitle">Cadastre os módulos e defina as faixas de Favorável / Intermediário / Risco para a média de respostas (1 a 5).</p>
          </div>
          <div>
            <button type="button" className="btn-secondary" onClick={openNewModuleModal}>+ Adicionar módulo</button>
          </div>
        </div>

        <ModuleList modulos={state.modulos} onEdit={openEditModuleModal} onRemove={handleRemoveModule} />
      </section>

      {/* PERGUNTAS */}
      <section className="card">
        <div className="card-header-row">
          <div>
            <h2 className="card-title">Perguntas da escala</h2>
            <p className="card-subtitle">Crie as perguntas, vincule a um módulo e categoria, e defina as respostas possíveis com valores de 1 a 5.</p>
          </div>
          <div>
            <button type="button" className="btn-secondary" onClick={openNewQuestionModal}>+ Adicionar pergunta</button>
          </div>
        </div>

        <QuestionList
          perguntas={state.perguntas}
          getModuloName={getModuloName}
          getCategoriaName={getCategoriaName}
          onEdit={openEditQuestionModal}
          onRemove={handleRemovePergunta}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
          draggingQuestionId={draggingQuestionId}
        />
      </section>

      {/* FOOTER */}
      <div className="footer-actions">
        <button type="button" className="btn-secondary" onClick={() => router.push('/admin/escalas')} disabled={saving}>Cancelar</button>
        <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Salvando...' : 'Salvar escala'}</button>
      </div>

      {/* Modals */}
      <ModuleModal
        open={moduleModalOpen}
        draft={moduleDraft}
        editingTempId={editingModuleTempId}
        onClose={closeModuleModal}
        onChange={handleModuleDraftChange}
        onSave={handleSaveModule}
      />

      <QuestionModal
        open={questionModalOpen}
        draft={questionDraft}
        step={questionModalStep}
        editingTempId={editingQuestionTempId}
        modulos={state.modulos.map((m) => ({ tempId: m.tempId, nome: m.nome }))}
        categorias={state.categorias}
        onClose={closeQuestionModal}
        onChangeDraft={handleQuestionDraftChange}
        onNext={handleQuestionStep1Next}
        onBack={() => setQuestionModalStep(1)}
        onAddResposta={handleAddRespostaToDraft}
        onUpdateResposta={handleUpdateRespostaInDraft}
        onRemoveResposta={handleRemoveRespostaInDraft}
        onSave={handleQuestionStep2Save}
        creatingCategory={creatingCategory}
        onStartCreateCategory={startCreateCategory}
        onCancelCreateCategory={cancelCreateCategory}
        newCategoryName={newCategoryName}
        setNewCategoryName={setNewCategoryName}
        onConfirmCreateCategory={confirmCreateCategory}
      />

      <style jsx>{`
        /* layout */
        .escala-form { display:flex; flex-direction:column; gap:20px; }
        .card { background:#fff; border-radius:12px; padding:18px; box-shadow:0 6px 18px rgba(11,37,39,0.06); }
        .card-title{font-size:18px;font-weight:700;margin:0 0 4px;color:#111827}
        .card-subtitle{font-size:13px;color:#6b7280;margin:0 0 12px}
        .card-header-row{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px}

        /* ---------- custom data-card banner ---------- */
        .data-card { padding: 0; overflow: visible; }
        .card-banner {
          background: #0B2527;
          padding: 18px;
          border-top-left-radius: 12px;
          border-top-right-radius: 12px;
        }
        .card-banner-title {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
          color: #F3F4FF; /* título branco-azulado */
        }
        .card-banner-sub {
          margin: 6px 0 0;
          font-size: 13px;
          color: rgba(243,244,255,0.9); /* subtítulo levemente mais claro */
        }
        .card-body { padding: 18px; } /* espaçamento interno para os campos */

        .field-grid {
          display: grid;
          grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) auto;
          gap: 16px;
          align-items: center;
        }

        .field{display:flex;flex-direction:column;gap:6px}
        .label{font-size:13px;font-weight:600;color:#374151}
        .required{color:#b91c1c;margin-left:2px}

        /* inputs e placeholder */
        .input,
        .textarea,
        select.input {
          width:100%;
          border-radius:8px;
          border:1px solid #e5e7eb;
          padding:8px 10px;
          font-size:14px;
          color:#111827;
          outline:none;
          transition: border-color .15s ease, box-shadow .15s ease;
        }

        .input::placeholder,
        select.input::placeholder {
          color: #374151; /* placeholder conforme pedido */
          opacity: 0.7;
        }

        /* Date inputs don't always respect ::placeholder; ensure text color visible */
        input[type="date"] {
          color: #374151;
        }

        .input:focus { border-color:#0B2527; box-shadow:0 0 0 2px rgba(11,37,39,0.06); }

        /* switch (novo estilo) */
        .switch-field { align-items:flex-start; display:flex; flex-direction:column; gap:8px; }
        .new-switch {
          position: relative;
          display: inline-block;
          width: 56px;
          height: 32px;
        }
        .new-switch input { opacity:0; width:0; height:0; position:absolute; left:0; top:0; }
        .new-switch .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: #e5e7eb;
          transition: .18s;
          border-radius: 999px;
          box-shadow: inset 0 1px 0 rgba(11,37,39,0.03);
        }
        .new-switch .slider::before {
          content: "";
          position: absolute;
          height: 26px;
          width: 26px;
          left: 3px;
          top: 3px;
          background: #ffffff;
          border-radius: 50%;
          transition: transform .18s;
          box-shadow: 0 4px 10px rgba(2,6,23,0.12);
        }
        .new-switch input:checked + .slider {
          background: #0B2527; /* cor primária */
        }
        .new-switch input:checked + .slider::before {
          transform: translateX(24px);
        }
        .new-switch input:focus-visible + .slider {
          outline: 3px solid rgba(11,37,39,0.12);
          outline-offset: 2px;
        }

        /* outras classes utilizadas nos subcomponentes */
        .faixas-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-top:6px; }
        .faixa-col { background:#fafafa; border-radius:8px; border:1px solid #eef2ff; padding:10px; }
        .faixa-title { font-size:13px; font-weight:700; color:#0B2527; display:flex; align-items:center; gap:8px; margin:0 0 8px; }
        .faixa-dot { width:10px;height:10px;border-radius:999px; display:inline-block; }
        .faixa-dot-risco { background:#dc2626 }
        .faixa-dot-intermediario { background:#facc15 }
        .faixa-dot-favoravel { background:#16a34a }

        .respostas-header { display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:8px; }
        .respostas-title{font-size:13px;font-weight:700;color:#111827}

        .btn-primary,
        .btn-secondary,
        .btn-tertiary {
          border-radius: 999px;
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          border: 1px solid transparent;
          transition: all .15s ease;
          white-space: nowrap;
        }

        .btn-primary {
          background: #0B2527;
          color: #ffffff;
          border-color: #0B2527;
        }
        .btn-primary:hover { background: #134148; border-color:#134148; }

        .btn-secondary {
          background: #ffffff;
          color:#0B2527;
          border: 1px solid #0B2527;
        }
        .btn-secondary:hover { background:#f3f7f7; }

        .btn-tertiary {
          background: transparent;
          color: #0B2527;
          border-color: #d1d5db;
          padding-inline: 12px;
        }
        .btn-tertiary:hover { background:#f9fafb; }

        .footer-actions { display:flex; justify-content:flex-end; gap:10px; margin-top:8px; }

        @media (max-width: 960px) {
          .field-grid { grid-template-columns: 1fr; }
          .faixas-grid { grid-template-columns: 1fr; }
          .footer-actions { flex-direction: column-reverse; align-items: stretch; }
        }
      `}</style>
    </form>
  );
}
