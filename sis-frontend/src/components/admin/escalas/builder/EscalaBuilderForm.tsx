// src/components/admin/escalas/builder/EscalaBuilderForm.tsx
'use client';

import React, { FormEvent, useState, useEffect, useRef } from 'react';
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

function parseNumberOrNull(v?: string | number): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
  if (Number.isNaN(n)) return null;
  return n;
}

const EPS = 1e-9;
const MIN_GAP = 0.1;

function validateModuleRanges(mod: ModuloFormState): string | null {
  const ri = parseNumberOrNull(mod.valorInicialRisco);
  const rf = parseNumberOrNull(mod.valorFinalRisco);
  const ii = parseNumberOrNull(mod.valorInicialIntermediario);
  const ifv = parseNumberOrNull(mod.valorFinalIntermediario);
  const fi = parseNumberOrNull(mod.valorInicialFavoravel);
  const ff = parseNumberOrNull(mod.valorFinalFavoravel);

  const anyFilled = [ri, rf, ii, ifv, fi, ff].some((x) => x !== null);
  if (!anyFilled) return null;

  if ((ri === null) !== (rf === null)) return 'Preencha ambos os valores da faixa "Risco" ou deixe-os vazios.';
  if ((ii === null) !== (ifv === null)) return 'Preencha ambos os valores da faixa "Intermediário" ou deixe-os vazios.';
  if ((fi === null) !== (ff === null)) return 'Preencha ambos os valores da faixa "Favorável" ou deixe-os vazios.';

  const pairs: Array<[number | null, number | null, string]> = [
    [ri, rf, 'Risco'],
    [ii, ifv, 'Intermediário'],
    [fi, ff, 'Favorável'],
  ];
  for (const [a, b, label] of pairs) {
    if (a !== null && b !== null) {
      if (a < 1 || a > 5 || b < 1 || b > 5) {
        return `Valores da faixa "${label}" devem estar entre 1 e 5.`;
      }
      if (a > b + EPS) return `Na faixa "${label}" o valor inicial não pode ser maior que o valor final.`;
    }
  }

  if (rf !== null && ii !== null) {
    if (ii - rf + EPS < MIN_GAP) {
      return `Há sobreposição ou gap insuficiente entre "Risco" (até ${rf}) e "Intermediário" (a partir de ${ii}). Deve haver pelo menos ${MIN_GAP.toFixed(1)} de distância entre o final de uma e o início da outra (ex.: risco até 2.9 e intermediário a partir de 3.0).`;
    }
  }

  if (ifv !== null && fi !== null) {
    if (fi - ifv + EPS < MIN_GAP) {
      return `Há sobreposição ou gap insuficiente entre "Intermediário" (até ${ifv}) e "Favorável" (a partir de ${fi}). Deve haver pelo menos ${MIN_GAP.toFixed(1)} de distância entre as faixas.`;
    }
  }

  if (rf !== null && fi !== null && ii === null && ifv === null) {
    if (fi - rf + EPS < MIN_GAP) {
      return `As faixas "Risco" e "Favorável" precisam ter pelo menos ${MIN_GAP.toFixed(1)} de distância entre elas quando não há faixa "Intermediário". Por exemplo, se Favorável começa em 3.0, Risco deve terminar em no máximo 2.9.`;
    }
  }

  return null;
}

const DRAFT_KEY_PREFIX = 'escala_draft_v1:'; // versão no prefix para invalidar se formato mudar

export default function EscalaBuilderForm({
  mode = 'create',
  initialData,
}: {
  mode?: 'create' | 'edit';
  initialData?: EscalaFormState;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const [saving, setSaving] = useState(false);

  // --- ✅ MUDANÇA: Estado do formulário inicializado diretamente com initialData ---
  const [state, setState] = useState<EscalaFormState>(
    () =>
      initialData ?? {
        nome: '',
        dataVencimento: '',
        ativo: true,
        modulos: [],
        categorias: [],
        perguntas: [],
      }
  );

  // Autosave metadata
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const isMountedRef = useRef(false);

  // local draft key: include escala id if editing, else "new"
  const escalaId = (initialData && (initialData as any).id) ? (initialData as any).id : null;
  const draftKey = `${DRAFT_KEY_PREFIX}${escalaId ?? 'new'}`;

  // ✅ MUDANÇA: Lógica de rascunho refatorada para evitar erro de hidratação
  useEffect(() => {
    isMountedRef.current = true;

    // Carrega o rascunho do localStorage e pergunta ao usuário se deseja restaurar
    const rawDraft = localStorage.getItem(draftKey);
    if (rawDraft) {
      try {
        const parsed = JSON.parse(rawDraft);
        const draftTimestamp = parsed.timestamp ? new Date(parsed.timestamp) : null;

        if (draftTimestamp) {
          const loadDraft = async () => {
            const ok = await confirm({
              title: 'Rascunho encontrado',
              description: `Encontramos um rascunho salvo localmente em ${draftTimestamp.toLocaleString()}. Deseja restaurá-lo?`,
              confirmLabel: 'Restaurar Rascunho',
              cancelLabel: 'Ignorar',
            });

            if (ok && isMountedRef.current) {
              setState(parsed.data);
              toast.success('Rascunho restaurado.');
            }
            // Limpa o rascunho se o usuário ignorar, para não perguntar de novo
            if (!ok) {
              localStorage.removeItem(draftKey);
            }
          };
          // Atraso mínimo para garantir que a UI inicial esteja estável
          setTimeout(loadDraft, 100);
        }
      } catch (err) {
        console.warn('Erro ao processar rascunho local:', err);
        localStorage.removeItem(draftKey);
      }
    }

    return () => {
      isMountedRef.current = false;
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]); // Executa apenas uma vez na montagem

  // Autosave on state change (debounced)
  useEffect(() => {
    if (!isMountedRef.current) return;

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(() => {
      try {
        // ✅ MUDANÇA: Salva o estado completo com um timestamp
        const now = new Date();
        const toSave = {
          timestamp: now.toISOString(),
          data: state,
        };
        localStorage.setItem(draftKey, JSON.stringify(toSave));
        setLastSavedAt(now);
      } catch (err) {
        console.warn('Erro ao salvar rascunho local:', err);
      }
      saveTimerRef.current = null;
    }, 800);

    return () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, [state, draftKey]);

  // helper to clear draft on successful save
  function clearLocalDraft() {
    try {
      localStorage.removeItem(draftKey);
      setLastSavedAt(null);
    } catch (err) {
      console.warn('Erro ao limpar rascunho local:', err);
    }
  }

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

  // ---------- handleSaveModule: persist in edit mode, fallback local ----------
  async function handleSaveModule() {
    if (!moduleDraft) return;
    const nome = String(moduleDraft.nome ?? '').trim();
    if (!nome) {
      toast.error('Informe o nome do módulo.');
      return;
    }

    const err = validateModuleRanges(moduleDraft);
    if (err) {
      toast.error(err);
      return;
    }

    // Normalized object to use in UI/update and send to server
    const normalizedModule: Partial<ModuloFormState> = {
      ...moduleDraft,
      nome,
    };

    // If editing an existing escala (edit mode + initialData.id) -> try to persist immediately
    const escalaIdForServer = escalaId;
    if (mode === 'edit' && escalaIdForServer) {
      try {
        setSaving(true);

        const isUpdate = !!(moduleDraft as any).id && Number((moduleDraft as any).id) > 0;

        if (isUpdate) {
          // update existing modulo - usar /api/modulos/[id] ao invés de /api/escalas/[id]/modulos/[moduloId]
          const modId = (moduleDraft as any).id;
          const res = await fetch(`/api/modulos/${modId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nome: normalizedModule.nome,
              valorInicialFavoravel: normalizedModule.valorInicialFavoravel ?? null,
              valorFinalFavoravel: normalizedModule.valorFinalFavoravel ?? null,
              valorInicialIntermediario: normalizedModule.valorInicialIntermediario ?? null,
              valorFinalIntermediario: normalizedModule.valorFinalIntermediario ?? null,
              valorInicialRisco: normalizedModule.valorInicialRisco ?? null,
              valorFinalRisco: normalizedModule.valorFinalRisco ?? null,
            }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data?.error || 'Erro ao atualizar módulo.');

          // update local state (keep tempId)
          setState((prev) => ({
            ...prev,
            modulos: prev.modulos.map((m) => (m.tempId === editingModuleTempId ? { ...(m as any), ...normalizedModule } : m)),
          }));
        } else {
          // create module on server
          const res = await fetch(`/api/escalas/${escalaIdForServer}/modulos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nome: normalizedModule.nome,
              valorInicialFavoravel: normalizedModule.valorInicialFavoravel ?? null,
              valorFinalFavoravel: normalizedModule.valorFinalFavoravel ?? null,
              valorInicialIntermediario: normalizedModule.valorInicialIntermediario ?? null,
              valorFinalIntermediario: normalizedModule.valorFinalIntermediario ?? null,
              valorInicialRisco: normalizedModule.valorInicialRisco ?? null,
              valorFinalRisco: normalizedModule.valorFinalRisco ?? null,
            }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data?.error || 'Erro ao criar módulo.');

          const createdId = data?.id ?? null;

          if (editingModuleTempId) {
            setState((prev) => ({
              ...prev,
              modulos: prev.modulos.map((m) =>
                m.tempId === editingModuleTempId ? { ...(m as any), ...normalizedModule, id: createdId } : m
              ),
            }));
          } else {
            setState((prev) => ({
              ...prev,
              modulos: [...prev.modulos, { ...(normalizedModule as any), tempId: createTempId('mod'), id: createdId }],
            }));
          }
        }

        toast.success('Módulo salvo.');
        closeModuleModal();
      } catch (err: any) {
        console.error('Erro ao salvar módulo', err);
        toast.error(err?.message || 'Erro ao salvar módulo no servidor. Foi salvo localmente.');

        // fallback to local update so UX is not broken
        if (editingModuleTempId) {
          setState((prev) => ({ ...prev, modulos: prev.modulos.map((m) => (m.tempId === editingModuleTempId ? { ...moduleDraft, nome } : m)) }));
        } else {
          setState((prev) => ({ ...prev, modulos: [...prev.modulos, { ...moduleDraft, nome, tempId: createTempId('mod') }] }));
        }
        closeModuleModal();
      } finally {
        setSaving(false);
      }

      return;
    }

    // Fallback for create mode (or no escalaId): local only
    if (editingModuleTempId) {
      setState((prev) => ({ ...prev, modulos: prev.modulos.map((m) => (m.tempId === editingModuleTempId ? { ...moduleDraft, nome } : m)) }));
    } else {
      setState((prev) => ({ ...prev, modulos: [...prev.modulos, { ...moduleDraft, nome, tempId: createTempId('mod') }] }));
    }
    closeModuleModal();
  }
  // ---------- end handleSaveModule ----------

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

  type PerguntaDraftState = PerguntaFormState;

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

    setEditingQuestionTempId(null);

    // ✅ LÓGICA MOVIDA PARA CÁ: Preenche as respostas padrão ao criar uma nova pergunta.
    const defaultRespostas = [
      { texto: 'Nunca / Quase nunca', valor: 1 },
      { texto: 'Raramente', valor: 2 },
      { texto: 'Às vezes', valor: 3 },
      { texto: 'Frequentemente', valor: 4 },
      { texto: 'Sempre', valor: 5 },
    ].map(r => ({
      tempId: createTempId('resp'),
      resposta: r.texto,
      valor: r.valor,
    }));

    setQuestionDraft({
      tempId: createTempId('perg'),
      pergunta: '',
      ordem: state.perguntas.length + 1,
      moduloTempId: '',
      categoriasTempIds: [],
      respostas: defaultRespostas,
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
      categoriasTempIds: [...(perg.categoriasTempIds || [])],
      // ✅ LÓGICA MOVIDA PARA CÁ: Garante que as respostas existem ao editar.
      respostas: (perg.respostas && perg.respostas.length > 0)
        ? perg.respostas.map((r) => ({ ...r }))
        : createDefaultRespostasLikert(),
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
    setQuestionDraft((prev) => {
      if (!prev) return prev as PerguntaDraftState | null;
      return { ...prev, [field]: value } as PerguntaDraftState;
    });
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
    if (!questionDraft.categoriasTempIds || questionDraft.categoriasTempIds.length === 0) {
      toast.error('Selecione pelo menos uma categoria para a pergunta.');
      return;
    }
    setQuestionModalStep(2);
  }

  function handleAddRespostaToDraft() {
    setQuestionDraft((prev) => {
      if (!prev) return prev;
      return { ...prev, respostas: [...prev.respostas, createEmptyResposta()] } as PerguntaDraftState;
    });
  }

  function handleUpdateRespostaInDraft(respTempId: string, field: 'resposta' | 'valor', value: string) {
    setQuestionDraft((prev) => {
      if (!prev) return prev;
      const updated = prev.respostas.map((r) => {
        if (r.tempId !== respTempId) return r;
        if (field === 'resposta') {
          return { ...r, resposta: value };
        } else {
          const newVal = value === '' ? '' : Number(value);
          return { ...r, valor: newVal as RespostaFormState['valor'] };
        }
      });
      return { ...prev, respostas: updated } as PerguntaDraftState;
    });
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

    setQuestionDraft((prev) => {
      if (!prev) return prev;
      return { ...prev, respostas: prev.respostas.filter((r) => r.tempId !== respTempId) } as PerguntaDraftState;
    });
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
            categoriasTempIds: [...questionDraft.categoriasTempIds],
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
          categoriasTempIds: [...questionDraft.categoriasTempIds],
          respostas: questionDraft.respostas.map((r) => ({ ...r, resposta: r.resposta.trim() })),
        });
      }
      return { ...prev, perguntas };
    });

    closeQuestionModal();
  }

  function startCreateCategory() { setCreatingCategory(true); setNewCategoryName(''); }
  function cancelCreateCategory() { setCreatingCategory(false); setNewCategoryName(''); }
  function confirmCreateCategory() {
    if (!questionDraft) return;
    const nome = newCategoryName.trim();
    if (!nome) {
      toast.error('Informe o nome da categoria.');
      return;
    }
    const moduloTempId = questionDraft.moduloTempId;
    if (!moduloTempId) {
      toast.error('Selecione um módulo antes de criar a categoria.');
      return;
    }
    const newCat: CategoriaFormState = { tempId: createTempId('cat'), nome, moduloTempId };

    setState((prev) => ({ ...prev, categorias: [...prev.categorias, newCat] }));

    setQuestionDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        categoriasTempIds: [...prev.categoriasTempIds, newCat.tempId],
      } as PerguntaDraftState;
    });

    setCreatingCategory(false);
    setNewCategoryName('');
  }

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

  function getModuloName(moduloTempId: string) {
    return state.modulos.find((m) => m.tempId === moduloTempId)?.nome ?? '—';
  }

  function getCategoriasNames(categoriasTempIds: string[]) {
    if (!categoriasTempIds || categoriasTempIds.length === 0) return '—';
    const names = categoriasTempIds
      .map(id => state.categorias.find((c) => c.tempId === id)?.nome)
      .filter(Boolean);
    return names.length > 0 ? names.join(', ') : '—';
  }

  function updateCampoEscala<K extends keyof EscalaFormState>(field: K, value: EscalaFormState[K]) {
    setState((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;

    const nome = state.nome.trim();
    if (!nome) { toast.error('Informe o nome da escala.'); return; }
    if (!state.modulos.length) { toast.error('Adicione pelo menos um módulo à escala.'); return; }
    if (!state.perguntas.length) { toast.error('Adicione pelo menos uma pergunta.'); return; }

    for (let i = 0; i < state.modulos.length; i++) {
      const m = state.modulos[i];
      const err = validateModuleRanges(m);
      if (err) {
        toast.error(`Módulo "${m.nome || `#${i+1}`}": ${err}`);
        return;
      }
    }

    for (let i = 0; i < state.perguntas.length; i++) {
      const p = state.perguntas[i];
      if (!p.pergunta.trim()) { toast.error(`Pergunta ${i + 1}: texto é obrigatório.`); return; }
      if (!p.moduloTempId) { toast.error(`Pergunta ${i + 1}: selecione um módulo.`); return; }
      if (!p.categoriasTempIds || p.categoriasTempIds.length === 0) {
        toast.error(`Pergunta ${i + 1}: selecione pelo menos uma categoria.`);
        return;
      }
      if (!p.respostas.length) { toast.error(`Pergunta ${i + 1}: adicione pelo menos uma resposta.`); return; }
      for (let j = 0; j < p.respostas.length; j++) {
        const r = p.respostas[j];
        if (!r.resposta.trim()) { toast.error(`Pergunta ${i + 1}, resposta ${j + 1}: texto é obrigatório.`); return; }
        if (r.valor === '' || Number.isNaN(Number(r.valor)) || Number(r.valor) < 1 || Number(r.valor) > 5) {
          toast.error(`Pergunta ${i + 1}, resposta ${j + 1}: informe um valor entre 1 e 5.`); return;
        }
      }
    }

    const payload = {
      nome,
      dataVencimento: state.dataVencimento || null,
      ativo: state.ativo ? 1 : 0,
      modulos: state.modulos.map((m) => (({
        tempId: m.tempId,
        nome: m.nome.trim(),
        valorInicialFavoravel: m.valorInicialFavoravel || null,
        valorFinalFavoravel: m.valorFinalFavoravel || null,
        valorInicialIntermediario: m.valorInicialIntermediario || null,
        valorFinalIntermediario: m.valorFinalIntermediario || null,
        valorInicialRisco: m.valorInicialRisco || null,
        valorFinalRisco: m.valorFinalRisco || null,
        id: (m as any).id ?? null,
      }))),
      categorias: state.categorias.map((c) => (({
        tempId: c.tempId,
        nome: c.nome.trim(),
        moduloTempId: c.moduloTempId,
        id: (c as any).id ?? null,
      }))),
      perguntas: state.perguntas.map((p) => (({
        tempId: p.tempId,
        pergunta: p.pergunta.trim(),
        ordem: p.ordem,
        moduloTempId: p.moduloTempId,
        categoriasTempIds: p.categoriasTempIds,
        id: (p as any).id ?? null,
        respostas: p.respostas.map((r) => ({ resposta: r.resposta.trim(), valor: Number(r.valor), id: (r as any).id ?? null })),
      }))),
    };

    setSaving(true);
    try {
      let res;
      if (mode === 'create') {
        res = await fetch('/api/escalas/builder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      } else {
        const escalaIdForServer = escalaId;
        if (!escalaIdForServer) {
          throw new Error('ID da escala ausente para edição.');
        }
        res = await fetch(`/api/escalas/${escalaIdForServer}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      }

      const data = await res!.json().catch(() => ({}));
      if (!res!.ok) throw new Error(data?.error || 'Erro ao salvar escala.');

      // clear local draft after successful save
      clearLocalDraft();

      toast.success(mode === 'create' ? 'Escala criada com sucesso!' : 'Escala atualizada com sucesso!');
      router.push('/admin/escalas');
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'Erro ao salvar escala.');
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' || e.key === 'Esc') {
        if (moduleModalOpen) {
          closeModuleModal();
        }
        if (questionModalOpen) {
          closeQuestionModal();
        }
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [moduleModalOpen, questionModalOpen]);

  async function handleDeleteCategoria(categoriaId: string) {
    const categoria = state.categorias.find((c) => c.tempId === categoriaId);
    if (!categoria) return;

    const ok = await confirm({
      title: 'Excluir categoria',
      description: `Tem certeza que deseja excluir a categoria "${categoria.nome}"?\n\nTodas as perguntas vinculadas a ela serão desvinculadas.`,
      confirmLabel: 'Excluir',
      cancelLabel: 'Cancelar',
      danger: true,
    });

    if (!ok) return;

    setState((prev) => {
      const newCategorias = prev.categorias.filter((c) => c.tempId !== categoriaId);
      const newPerguntas = prev.perguntas.map((p) => ({
        ...p,
        categoriasTempIds: p.categoriasTempIds.filter(id => id !== categoriaId)
      }));

      if (questionDraft?.categoriasTempIds.includes(categoriaId)) {
        setQuestionDraft((prev) =>
          prev ? {
            ...prev,
            categoriasTempIds: prev.categoriasTempIds.filter(id => id !== categoriaId)
          } as PerguntaDraftState : prev
        );
      }

      return {
        ...prev,
        categorias: newCategorias,
        perguntas: newPerguntas,
      };
    });

    toast.success(`Categoria "${categoria.nome}" excluída com sucesso.`);
  }

  // small helper to format timestamp for display
  function formatTimestamp(ts: Date | null) {
    if (!ts) return '';
    return ts.toLocaleString();
  }

  return (
    <form className="escala-form" onSubmit={handleSubmit}>
      <section className="card data-card">
        <div className="card-banner">
          <div>
            <h2 className="card-banner-title">Dados da escala</h2>
            <p className="card-banner-sub">Informe o nome e a data de vencimento da escala.</p>
          </div>

          {/* Draft indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {lastSavedAt ? (
              <div style={{ color: '#d1d5db', fontSize: 12 }}>
                Rascunho salvo • <span style={{ color: '#9ca3af' }}>{formatTimestamp(lastSavedAt)}</span>
              </div>
            ) : null}
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
          getCategoriasNames={getCategoriasNames}
          onEdit={openEditQuestionModal}
          onRemove={handleRemovePergunta}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onDragEnd={handleDragEnd}
          draggingQuestionId={draggingQuestionId}
        />
      </section>

      <div className="footer-actions">
        <button type="button" className="btn-secondary" onClick={() => router.push('/admin/escalas')} disabled={saving}>Cancelar</button>
        <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Salvando...' : (mode === 'create' ? 'Salvar escala' : 'Atualizar escala')}</button>
      </div>

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
        onDeleteCategoria={handleDeleteCategoria}
      />

      <style jsx>{`
        .escala-form { display:flex; flex-direction:column; gap:20px; }
        .card { background:#fff; border-radius:12px; padding:18px; box-shadow:0 6px 18px rgba(11,37,39,0.06); }
        .card-title{font-size:18px;font-weight:700;margin:0 0 4px;color:#111827}
        .card-subtitle{font-size:13px;color:#6b7280;margin:0 0 12px}
        .card-header-row{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px}
        .data-card { padding: 0; overflow: visible; }
        .card-banner {
          background: #0B2527;
          padding: 18px;
          border-top-left-radius: 12px;
          border-top-right-radius: 12px;
          display:flex;
          justify-content:space-between;
          align-items:center;
        }
        .card-banner-title {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
          color: #F3F4FF;
        }
        .card-banner-sub {
          margin: 6px 0 0;
          font-size: 13px;
          color: rgba(243,244,255,0.9);
        }
        .card-body { padding: 18px; }
        .field-grid {
          display: grid;
          grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) auto;
          gap: 16px;
          align-items: center;
        }
        .field{display:flex;flex-direction:column;gap:6px}
        .label{font-size:13px;font-weight:600;color:#374151}
        .required{color:#b91c1c;margin-left:2px}
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
          color: #374151;
          opacity: 0.7;
        }
        input[type="date"] {
          color: #374151;
        }
        .input:focus { border-color:#0B2527; box-shadow:0 0 0 2px rgba(11,37,39,0.06); }
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
          background: #0B2527;
        }
        .new-switch input:checked + .slider::before {
          transform: translateX(24px);
        }
        .new-switch input:focus-visible + .slider {
          outline: 3px solid rgba(11,37,39,0.12);
          outline-offset: 2px;
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
        .footer-actions { display:flex; justify-content:flex-end; gap:10px; margin-top:8px; }
        @media (max-width: 960px) {
          .field-grid { grid-template-columns: 1fr; }
          .footer-actions { flex-direction: column-reverse; align-items: stretch; }
        }
      `}</style>
    </form>
  );
}
