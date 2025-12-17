// src/components/admin/company/editForm/CompanyEditForm.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { normalizeCnpj, formatCnpj as formatCnpjUtil, isValidCnpj } from '@/lib/cnpj';

type EscalaOption = {
  id: number;
  nome: string;
};

type Payload = {
  razaoSocial: string;
  cnpj?: string | null;
  email?: string | null;
  telefone?: string | null;
  cep?: string | null;
  escalaId?: number | null;
  grupos?: string[]; // nomes dos grupos internos
  // novos campos de endereço
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  cidade?: string | null;
  estado?: string | null;
  pais?: string | null;
};

function sanitizeDigits(s?: string) {
  return s ? s.replace(/\D/g, '') : undefined;
}

/** tenta extrair uma mensagem legível de diferentes formatos de body */
function extractMessageFromBody(body: any): string | null {
  if (!body && body !== 0) return null;
  if (typeof body === 'string' && body.trim()) return body.trim();
  if (typeof body === 'object') {
    if (typeof body.message === 'string' && body.message.trim()) return body.message.trim();
    if (typeof body.msg === 'string' && body.msg.trim()) return body.msg.trim();
    if (typeof body.error === 'string' && body.error.trim()) return body.error.trim();
    if (typeof body.data === 'string' && body.data.trim()) return body.data.trim();
  }
  return null;
}

/* ---------- Formatting helpers (masking while typing) ---------- */

function formatCep(value?: string) {
  const d = (value ?? '').replace(/\D/g, '').slice(0, 8);
  if (!d) return '';
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

function formatPhoneBR(value?: string) {
  let d = (value ?? '').replace(/\D/g, '');
  if (!d) return '';

  let country = '';
  if (d.length > 11) {
    country = d.slice(0, d.length - 11);
    d = d.slice(d.length - 11);
  }

  if (d.length <= 2) {
    return `${country ? `+${country} ` : ''}${d}`;
  }

  if (d.length <= 6) {
    return `${country ? `+${country} ` : ''}(${d.slice(0, 2)}) ${d.slice(2)}`;
  }

  if (d.length <= 10) {
    return `${country ? `+${country} ` : ''}(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  }

  return `${country ? `+${country} ` : ''}(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/* ---------- Helpers de grupos ---------- */

function extractInitialGroups(initial: any): string[] {
  if (!initial) return [];

  // Se o server já passou um array "grupos"
  if (Array.isArray(initial.grupos)) {
    if (initial.grupos.length > 0 && typeof initial.grupos[0] === 'string') {
      return (initial.grupos as string[]).filter((g) => !!g.trim());
    }
    if (initial.grupos.length > 0 && typeof initial.grupos[0] === 'object') {
      return (initial.grupos as any[])
        .map((g) => g?.nome ?? '')
        .filter((g: string) => !!g.trim());
    }
  }

  // Se veio direto do Prisma: empresa.gruposFuncionarios: EmpresaGrupo[]
  if (Array.isArray(initial.gruposFuncionarios)) {
    return (initial.gruposFuncionarios as any[])
      .map((g) => g?.nome ?? '')
      .filter((g: string) => !!g.trim());
  }

  return [];
}

/* ---------- Component ---------- */

export default function CompanyEditForm({
  initial,
}: {
  initial: {
    id: number;
    razaoSocial?: string | null;
    cnpj?: string | null;
    email?: string | null;
    telefone?: string | null;
    cep?: string | null;
    escalaId?: number | null;
    grupos?: any;
    gruposFuncionarios?: any;
    // podem já vir os campos de endereço do server
    logradouro?: string | null;
    numero?: string | null;
    complemento?: string | null;
    cidade?: string | null;
    estado?: string | null;
    pais?: string | null;
  };
}) {
  const router = useRouter();

  const [razaoSocial, setRazaoSocial] = useState(initial?.razaoSocial ?? '');
  const [cnpj, setCnpj] = useState<string>(initial?.cnpj ? formatCnpjUtil(initial.cnpj) : '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [telefone, setTelefone] = useState<string>(
    initial?.telefone ? formatPhoneBR(initial.telefone) : ''
  );
  const [cep, setCep] = useState<string>(initial?.cep ? formatCep(initial.cep) : '');
  const [saving, setSaving] = useState(false);

  // novos campos de endereço (valores que o usuário pode editar)
  const [logradouro, setLogradouro] = useState<string>(initial?.logradouro ?? '');
  const [numero, setNumero] = useState<string>(initial?.numero ?? '');
  const [complemento, setComplemento] = useState<string>(initial?.complemento ?? '');
  const [cidade, setCidade] = useState<string>(initial?.cidade ?? '');
  const [estado, setEstado] = useState<string>(initial?.estado ?? '');
  const [pais, setPais] = useState<string>(initial?.pais ?? '');

  const [fetchingCep, setFetchingCep] = useState(false);

  // Escala vinculada
  const [escalas, setEscalas] = useState<EscalaOption[]>([]);
  const [escalaId, setEscalaId] = useState<string>(
    initial?.escalaId ? String(initial?.escalaId) : ''
  );

  // Grupos internos da empresa
  const [groups, setGroups] = useState<string[]>(() => extractInitialGroups(initial));
  const [newGroupName, setNewGroupName] = useState('');

  // Se `initial` mudar (raro), reatribui valores
  useEffect(() => {
    setRazaoSocial(initial?.razaoSocial ?? '');
    setCnpj(initial?.cnpj ? formatCnpjUtil(initial.cnpj) : '');
    setEmail(initial?.email ?? '');
    setTelefone(initial?.telefone ? formatPhoneBR(initial.telefone) : '');
    setCep(initial?.cep ? formatCep(initial.cep) : '');
    setEscalaId(initial?.escalaId ? String(initial.escalaId) : '');
    setGroups(extractInitialGroups(initial));
    setNewGroupName('');

    // endereço inicial (se houver, colocamos como values)
    setLogradouro(initial?.logradouro ?? '');
    setNumero(initial?.numero ?? '');
    setComplemento(initial?.complemento ?? '');
    setCidade(initial?.cidade ?? '');
    setEstado(initial?.estado ?? '');
    setPais(initial?.pais ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial?.id]);

  // novo estado para erro de CNPJ (uso mínimo, para feedback)
  const [cnpjError, setCnpjError] = useState<string | null>(null);
  const [cnpjTouched, setCnpjTouched] = useState(false);

  // Carrega lista de escalas
  useEffect(() => {
    let cancelled = false;

    async function loadEscalas() {
      try {
        const res = await fetch('/api/escalas', { method: 'GET' });
        if (!res.ok) {
          console.error('Falha ao carregar escalas', res.status);
          return;
        }
        const text = await res.text();
        let data: any = [];
        try {
          data = text ? JSON.parse(text) : [];
        } catch {
          data = [];
        }

        const listRaw = Array.isArray(data)
          ? data
          : Array.isArray((data as any).items)
          ? (data as any).items
          : [];

        const mapped: EscalaOption[] = listRaw.map((e: any) => ({
          id: e.id,
          nome: e.nome ?? e.name ?? e.titulo ?? `Escala #${e.id}`,
        }));

        if (!cancelled) {
          setEscalas(mapped);
        }
      } catch (err) {
        console.error('Erro ao carregar escalas', err);
      }
    }

    loadEscalas();

    return () => {
      cancelled = true;
    };
  }, []);

  // Handlers de grupos

  function handleAddGroup(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const trimmed = newGroupName.trim();
    if (!trimmed) {
      toast.error('Informe um nome para o grupo.');
      return;
    }
    const exists = groups.some((g) => g.toLowerCase() === trimmed.toLowerCase());
    if (exists) {
      toast.error('Esse grupo já foi adicionado.');
      return;
    }
    setGroups((prev) => [...prev, trimmed]);
    setNewGroupName('');
  }

  function handleRemoveGroup(name: string) {
    setGroups((prev) => prev.filter((g) => g !== name));
  }

  // Validação do CNPJ em tempo real: quando muda o campo (uso do util)
  function handleCnpjChange(value: string) {
    setCnpj(value);
    setCnpjTouched(true);

    const digits = normalizeCnpj(value);
    if (!digits) {
      setCnpjError(null);
      return;
    }

    if (digits.length < 14) {
      setCnpjError(null);
      return;
    }

    if (!isValidCnpj(digits)) {
      setCnpjError('CNPJ inválido.');
    } else {
      setCnpjError(null);
    }
  }

  /* ------------------ CEP lookup ------------------ */

  async function fetchCepLookup(digits: string) {
    if (!digits || digits.length !== 8) return;
    setFetchingCep(true);
    try {
      const res = await fetch(`/api/cep/lookup?cep=${digits}`, { method: 'GET' });
      if (!res.ok) {
        if (res.status === 404) {
          toast.error('CEP não encontrado. Preencha o endereço manualmente.');
        } else {
          toast.error('Erro ao consultar CEP. Tente novamente mais tarde.');
        }
        setFetchingCep(false);
        return;
      }

      const data = await res.json();

      const fetchedLogradouro = data.logradouro ?? data.street ?? '';
      const fetchedCidade = data.localidade ?? data.city ?? data.cidade ?? '';
      const fetchedEstado = (data.uf ?? data.state ?? '')?.toUpperCase() ?? '';
      const fetchedPais = 'Brasil';

      // Preenche os campos (values) apenas se estiverem vazios — não sobrescreve entrada do usuário
      setLogradouro((prev) => (prev && prev.trim() ? prev : fetchedLogradouro || ''));
      setCidade((prev) => (prev && prev.trim() ? prev : fetchedCidade || ''));
      setEstado((prev) => (prev && prev.trim() ? prev : fetchedEstado || ''));
      setPais((prev) => (prev && prev.trim() ? prev : fetchedPais));
      // NÃO alteramos numero nem complemento automaticamente
    } catch (err) {
      console.error('Erro lookup CEP', err);
      toast.error('Erro ao consultar CEP. Tente novamente mais tarde.');
    } finally {
      setFetchingCep(false);
    }
  }

  // Quando o campo CEP atingir 8 dígitos, consultamos automaticamente
  function handleCepChange(value: string) {
    setCep(value);

    const digits = sanitizeDigits(value);
    if (!digits) {
      return;
    }

    if (digits.length === 8) {
      fetchCepLookup(digits);
    }
  }

  // também faz lookup no blur por segurança
  function handleCepBlur() {
    const digits = sanitizeDigits(cep);
    if (digits && digits.length === 8) {
      fetchCepLookup(digits);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!razaoSocial.trim()) {
      toast.error('Razão social é obrigatória.');
      return;
    }

    // validação mínima do CNPJ no edit form (se preenchido bloqueia envio)
    const cnpjDigits = sanitizeDigits(cnpj);
    if (cnpjDigits && !isValidCnpj(cnpjDigits)) {
      toast.error('CNPJ inválido. Corrija antes de salvar.');
      setCnpjTouched(true);
      setCnpjError('CNPJ inválido.');
      return;
    }

    setSaving(true);

    const payload: Payload = {
      razaoSocial: razaoSocial.trim(),
      cnpj: sanitizeDigits(cnpj) ?? null,
      email: email.trim() || null,
      telefone: sanitizeDigits(telefone) ?? null,
      cep: sanitizeDigits(cep) ?? null,
      escalaId: escalaId ? Number(escalaId) : null,
      // enviamos sempre grupos; se for [], o backend vai entender como "zerar grupos"
      grupos: groups,
      // novos campos de endereço (enviamos o que estiver preenchido)
      logradouro: logradouro ? logradouro.trim() : undefined,
      numero: numero ? numero.trim() : undefined,
      complemento: complemento ? complemento.trim() : undefined,
      cidade: cidade ? cidade.trim() : undefined,
      estado: estado ? estado.trim() : undefined,
      pais: pais ? pais.trim() : undefined,
    };

    try {
      const res = await fetch(`/api/companies/${initial.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const body = await res.text().then((t) => {
        try {
          return t ? JSON.parse(t) : {};
        } catch {
          return t;
        }
      });

      if (!res.ok) {
        const msg = extractMessageFromBody(body) ?? 'Erro ao atualizar empresa.';
        toast.error(msg);
        setSaving(false);
        return;
      }

      const successMsg = extractMessageFromBody(body) ?? 'Empresa atualizada com sucesso.';
      toast.success(successMsg);

      setTimeout(() => {
        router.push('/admin/empresas');
      }, 700);
    } catch (err: any) {
      console.error(err);
      const msg = err?.message ? String(err.message) : 'Erro inesperado. Veja o console.';
      toast.error(msg);
      setSaving(false);
    }
  }

  function handleCancel() {
    router.push('/admin/empresas');
  }

  return (
    <form className="form-root" onSubmit={handleSubmit} noValidate>
      <div className="grid">
        <div className="field">
          <label className="label">Razão Social *</label>
          <input
            className="input"
            value={razaoSocial}
            onChange={(e) => setRazaoSocial(e.target.value)}
            placeholder="Razão social"
            required
          />
        </div>

        <div className="field">
          <label className="label">CNPJ</label>
          <input
            className="input"
            value={cnpj}
            onChange={(e) => handleCnpjChange(formatCnpjUtil(e.target.value))}
            placeholder="00.000.000/0001-00"
            aria-invalid={!!cnpjError}
          />
          {cnpjTouched && cnpjError && (
            <div style={{ marginTop: 8, color: '#b91c1c', fontSize: 13 }}>{cnpjError}</div>
          )}
        </div>

        <div className="field">
          <label className="label">Email</label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="contato@empresa.com"
            required
          />
        </div>

        <div className="field">
          <label className="label">Telefone</label>
          <input
            className="input"
            value={telefone}
            onChange={(e) => setTelefone(formatPhoneBR(e.target.value))}
            placeholder="+55 (11) 99999-9999"
          />
        </div>

        <div className="field">
          <label className="label">CEP</label>
          <div style={{ position: 'relative' }}>
            <input
              className="input"
              value={cep}
              onChange={(e) => handleCepChange(formatCep(e.target.value))}
              onBlur={handleCepBlur}
              placeholder="00000-000"
            />
            {fetchingCep && (
              <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <circle cx="12" cy="12" r="10" stroke="#0b2527" strokeWidth="2" opacity="0.2"></circle>
                  <path d="M22 12a10 10 0 00-10-10" stroke="#0b2527" strokeWidth="2" strokeLinecap="round"></path>
                </svg>
              </div>
            )}
          </div>
        </div>

        <div className="field">
          <label className="label">Escala da empresa</label>
          <select
            className="input"
            value={escalaId}
            onChange={(e) => setEscalaId(e.target.value)}
          >
            <option value="">Nenhuma escala</option>
            {escalas.map((escala) => (
              <option key={escala.id} value={escala.id}>
                {escala.nome}
              </option>
            ))}
          </select>
        </div>

        {/* NOVOS CAMPOS DE ENDEREÇO (valores) */}

        <div className="field">
          <label className="label">Logradouro</label>
          <input
            className="input"
            value={logradouro}
            onChange={(e) => setLogradouro(e.target.value)}
            placeholder="Rua, Av., Praça..."
          />
        </div>

        <div className="field">
          <label className="label">Número</label>
          <input
            className="input"
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            placeholder="Ex.: 123, s/n"
          />
        </div>

        <div className="field">
          <label className="label">Complemento</label>
          <input
            className="input"
            value={complemento}
            onChange={(e) => setComplemento(e.target.value)}
            placeholder="Ex.: Apto 101, Bloco B"
          />
        </div>

        <div className="field">
          <label className="label">Cidade</label>
          <input
            className="input"
            value={cidade}
            onChange={(e) => setCidade(e.target.value)}
            placeholder="Cidade"
          />
        </div>

        <div className="field">
          <label className="label">Estado</label>
          <input
            className="input"
            value={estado}
            onChange={(e) => setEstado(e.target.value)}
            placeholder="UF (ex.: SP)"
            maxLength={2}
          />
        </div>

        <div className="field">
          <label className="label">País</label>
          <input
            className="input"
            value={pais}
            onChange={(e) => setPais(e.target.value)}
            placeholder="Brasil"
          />
        </div>
      </div>

      {/* Seção de grupos internos da empresa */}
      <div className="groups-section">
        <div className="groups-header">
          <h2 className="groups-title">Grupos internos de funcionários</h2>
          <p className="groups-subtitle">
            Atualize grupos como <strong>RH</strong>, <strong>Tech</strong>,{' '}
            <strong>Operações</strong>, etc. Você poderá vinculá-los aos funcionários.
          </p>
        </div>

        <div className="groups-form">
          <div className="field">
            <label className="label">Novo grupo</label>
            <div className="groups-input-row">
              <input
                className="input"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="Ex.: RH, Tech, Operações..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddGroup();
                  }
                }}
              />
              <button
                type="button"
                className="btn small"
                onClick={() => handleAddGroup()}
                disabled={saving}
              >
                ADICIONAR
              </button>
            </div>
          </div>

          {groups.length > 0 && (
            <div className="groups-list">
              {groups.map((g) => (
                <div key={g} className="group-pill">
                  <span className="group-name">{g}</span>
                  <button
                    type="button"
                    className="group-remove"
                    onClick={() => handleRemoveGroup(g)}
                    aria-label={`Remover grupo ${g}`}
                    disabled={saving}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="buttons">
        <button type="submit" className="btn primary" disabled={saving}>
          {saving ? 'Salvando...' : 'SALVAR'}
        </button>

        <button
          type="button"
          className="btn secondary"
          onClick={handleCancel}
          disabled={saving}
        >
          CANCELAR
        </button>
      </div>

      <style jsx>{`
        .form-root {
          display: block;
        }

        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
          align-items: start;
        }

        .field {
          display: flex;
          flex-direction: column;
        }

        .label {
          font-size: 12px;
          font-weight: 700;
          color: #233;
          margin-bottom: 8px;
          letter-spacing: 0.2px;
        }

        .input {
          height: 42px;
          padding: 8px 12px;
          border: 1px solid #e6e9ef;
          border-radius: 8px;
          background: #fff;
          font-size: 14px;
          outline: none;
          transition: box-shadow 0.12s ease, border-color 0.12s ease;
          color: #111827;
        }

        .input::placeholder {
          color: #9ca3af;
          opacity: 1;
        }

        .input:focus {
          border-color: #0b2527;
          box-shadow: 0 0 0 3px rgba(11, 37, 39, 0.06);
        }

        /* Seção de grupos */

        .groups-section {
          margin-top: 28px;
          padding: 16px 18px;
          border-radius: 12px;
          border: 1px solid #e5e7eb;
          background: #f9fafb;
        }

        .groups-header {
          margin-bottom: 14px;
        }

        .groups-title {
          margin: 0;
          font-size: 15px;
          font-weight: 700;
          color: #111827;
        }

        .groups-subtitle {
          margin: 4px 0 0 0;
          font-size: 12px;
          color: #6b7280;
        }

        .groups-form {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .groups-input-row {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .groups-list {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 4px;
        }

        .group-pill {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          border-radius: 999px;
          background: #e5f3f4;
          border: 1px solid #c7e3e4;
          font-size: 12px;
          gap: 6px;
        }

        .group-name {
          color: #0b2527;
        }

        .group-remove {
          border: none;
          background: transparent;
          cursor: pointer;
          font-size: 14px;
          line-height: 1;
          color: #6b7280;
          padding: 0;
        }

        .group-remove:hover {
          color: #ef4444;
        }

        .buttons {
          margin-top: 26px;
          display: flex;
          gap: 16px;
          justify-content: center;
          align-items: center;
        }

        .btn {
          min-width: 180px;
          height: 44px;
          border-radius: 999px;
          font-weight: 700;
          letter-spacing: 0.6px;
          cursor: pointer;
          border: none;
        }

        .btn.primary {
          background: #0b2527;
          color: white;
          box-shadow: 0 6px 20px rgba(11, 37, 39, 0.12);
        }

        .btn.secondary {
          background: white;
          color: #0b2527;
          border: 1px solid #0b2527;
        }

        .btn.small {
          min-width: 120px;
          height: 38px;
          padding: 0 16px;
          font-size: 12px;
          border-radius: 999px;
          background: #0b2527;
          color: #fff;
          box-shadow: 0 4px 12px rgba(11, 37, 39, 0.12);
          white-space: nowrap;
        }

        @media (max-width: 960px) {
          .grid {
            grid-template-columns: 1fr;
          }

          .groups-section {
            margin-top: 22px;
          }

          .groups-input-row {
            flex-direction: column;
            align-items: stretch;
          }

          .buttons {
            flex-direction: column;
          }

          .btn {
            width: 100%;
            min-width: 0;
          }

          .btn + .btn {
            margin-top: 8px;
          }
        }
      `}</style>
    </form>
  );
}
