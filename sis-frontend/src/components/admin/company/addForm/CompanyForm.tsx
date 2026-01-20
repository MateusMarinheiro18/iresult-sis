// src/components/admin/company/addForm/CompanyForm.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  normalizeCnpj,
  formatCnpj as formatCnpjUtil,
  isValidCnpj,
} from '@/lib/cnpj';

type EscalaOption = {
  id: number;
  nome: string;
};

type Payload = {
  razaoSocial: string;
  cnpj?: string;
  email?: string;
  telefone?: string;
  cep?: string;
  escalaId?: number | null;
  grupos?: string[]; // nomes dos grupos internos
  // novos campos de endereço (só enviados se o usuário preencher)
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

/** extrai mensagens legíveis do body retornado pela API */
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

/* ---------- Component ---------- */

export default function CompanyForm({ initial }: { initial?: any }) {
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
  const [cnpjError, setCnpjError] = useState<string | null>(null);
  const [cnpjTouched, setCnpjTouched] = useState(false);

  // Escala vinculada
  const [escalas, setEscalas] = useState<EscalaOption[]>([]);
  const [escalaId, setEscalaId] = useState<string>(initial?.escalaId ? String(initial?.escalaId) : '');

  // Grupos internos da empresa
  const [groups, setGroups] = useState<string[]>(() => {
    if (Array.isArray(initial?.grupos)) {
      if (initial.grupos.length > 0 && typeof initial.grupos[0] === 'string') {
        return initial.grupos as string[];
      }
      if (initial.grupos.length > 0 && typeof initial.grupos[0] === 'object') {
        return (initial.grupos as any[]).map((g) => g.nome ?? '').filter(Boolean);
      }
    }
    return [];
  });
  const [newGroupName, setNewGroupName] = useState('');

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Se `initial` mudar (edge cases), reatribui valores
  useEffect(() => {
    setRazaoSocial(initial?.razaoSocial ?? '');
    setCnpj(initial?.cnpj ? formatCnpjUtil(initial.cnpj) : '');
    setEmail(initial?.email ?? '');
    setTelefone(initial?.telefone ? formatPhoneBR(initial.telefone) : '');
    setCep(initial?.cep ? formatCep(initial.cep) : '');
    setEscalaId(initial?.escalaId ? String(initial?.escalaId) : '');

    // endereço inicial (se houver, colocamos como values)
    setLogradouro(initial?.logradouro ?? '');
    setNumero(initial?.numero ?? '');
    setComplemento(initial?.complemento ?? '');
    setCidade(initial?.cidade ?? '');
    setEstado(initial?.estado ?? '');
    setPais(initial?.pais ?? '');

    if (Array.isArray(initial?.grupos)) {
      if (initial.grupos.length > 0 && typeof initial.grupos[0] === 'string') {
        setGroups(initial.grupos as string[]);
      } else if (initial.grupos.length > 0 && typeof initial.grupos[0] === 'object') {
        setGroups(
          (initial.grupos as any[])
            .map((g) => g.nome ?? '')
            .filter((n: string) => !!n.trim())
        );
      } else {
        setGroups([]);
      }
    } else {
      setGroups([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial?.id]);

  // Carrega lista de escalas para o select
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

  /* ------------------ CEP lookup ------------------ */

  async function fetchCepLookup(digits: string) {
    if (!digits || digits.length !== 8) return;
    setFetchingCep(true);
    try {
      const res = await fetch(`/api/cep/lookup?cep=${digits}`, { method: 'GET' });
      if (!res.ok) {
        // 404 ou outro erro — não sobrescreve inputs; avisa usuário
        if (res.status === 404) {
          toast.error('CEP não encontrado. Preencha o endereço manualmente.');
        } else {
          toast.error('Erro ao consultar CEP. Tente novamente mais tarde.');
        }
        setFetchingCep(false);
        return;
      }

      const data = await res.json();

      // ViaCEP-style: { logradouro, bairro, localidade, uf, complemento? }
      const fetchedLogradouro = data.logradouro ?? data.street ?? '';
      const fetchedCidade = data.localidade ?? data.city ?? data.cidade ?? '';
      const fetchedEstado = (data.uf ?? data.state ?? '')?.toUpperCase() ?? '';
      const fetchedPais = 'Brasil';

      // Preenche os campos (values) apenas se estiverem vazios — não sobrescreve entrada do usuário
      setLogradouro((prev) => (prev && prev.trim() ? prev : fetchedLogradouro || ''));
      setCidade((prev) => (prev && prev.trim() ? prev : fetchedCidade || ''));
      setEstado((prev) => (prev && prev.trim() ? prev : fetchedEstado || ''));
      setPais((prev) => (prev && prev.trim() ? prev : fetchedPais));

      // Obs: NÃO alteramos numero nem complemento automaticamente
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
      // chama lookup (não await para não bloquear UI)
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

  /* ------------------ CNPJ validation ------------------ */

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

  /* ------------------ Logo upload ------------------ */

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Tipo de arquivo não permitido. Use JPG, PNG ou WebP.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Tamanho máximo: 5MB.');
      return;
    }

    setLogoFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  function handleRemoveLogo() {
    setLogoFile(null);
    setLogoPreview(null);
    // Limpa o input file
    const fileInput = document.getElementById('logo-input') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  /* ------------------ Submit ------------------ */

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!razaoSocial.trim()) {
      toast.error('Razão social é obrigatória.');
      return;
    }

    // se houver CNPJ preenchido, bloqueia envio se inválido
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
      cnpj: sanitizeDigits(cnpj),
      email: email.trim() || undefined,
      telefone: sanitizeDigits(telefone),
      cep: sanitizeDigits(cep),
      escalaId: escalaId ? Number(escalaId) : null,
      grupos: groups.length > 0 ? groups : undefined,
      // envia apenas os campos que o usuário efetivamente digitou (ou que foram preenchidos pelo lookup)
      logradouro: logradouro ? logradouro.trim() : undefined,
      numero: numero ? numero.trim() : undefined,
      complemento: complemento ? complemento.trim() : undefined,
      cidade: cidade ? cidade.trim() : undefined,
      estado: estado ? estado.trim() : undefined,
      pais: pais ? pais.trim() : undefined,
    };

    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const text = await res.text().catch(() => '');
      let body: any = {};
      try {
        body = text ? JSON.parse(text) : {};
      } catch {
        body = text;
      }

      if (!res.ok) {
        const msg = extractMessageFromBody(body) ?? 'Erro ao salvar empresa.';
        toast.error(msg);
        setSaving(false);
        return;
      }

      // Upload do logo se houver
      if (logoFile && body.id) {
        const formData = new FormData();
        formData.append('logo', logoFile);
        formData.append('empresaId', String(body.id));

        await fetch('/api/companies/logo', {
          method: 'POST',
          body: formData,
        });
      }

      const successMsg = extractMessageFromBody(body) ?? 'Empresa cadastrada com sucesso.';
      toast.success(successMsg);

      setTimeout(() => router.push('/admin/empresas'), 700);
    } catch (err: any) {
      console.error(err);
      const msg = err?.message ? String(err.message) : 'Erro inesperado. Veja o console.';
      toast.error(msg);
      setSaving(false);
    }
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
                  <circle cx="12" cy="12" r="10" stroke="#421E97" strokeWidth="2" opacity="0.2"></circle>
                  <path d="M22 12a10 10 0 00-10-10" stroke="#421E97" strokeWidth="2" strokeLinecap="round"></path>
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* CAMPOS DE ENDEREÇO - agora preenchidos como values a partir do lookup caso estejam vazios */}

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

        <div className="field logo-field">
          <label className="label">Logo da empresa</label>
          <div className="logo-upload-container">
            {logoPreview ? (
              <div className="logo-preview-box">
                <img src={logoPreview} alt="Preview do logo" />
                <button
                  type="button"
                  className="remove-logo-btn"
                  onClick={handleRemoveLogo}
                  disabled={saving}
                  aria-label="Remover logo"
                >
                  ×
                </button>
              </div>
            ) : (
              <div 
                className="logo-placeholder"
                onClick={() => !saving && document.getElementById('logo-input')?.click()}
                style={{ cursor: saving ? 'not-allowed' : 'pointer' }}
              >
                <div className="placeholder-content">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                  <p>Nenhuma imagem selecionada</p>
                  <button
                    type="button"
                    className="btn-upload"
                    disabled={saving}
                    onClick={(e) => {
                      e.stopPropagation();
                      document.getElementById('logo-input')?.click();
                    }}
                  >
                    ESCOLHER IMAGEM
                  </button>
                </div>
              </div>
            )}
          </div>
          <input
            id="logo-input"
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleLogoChange}
            disabled={saving}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      {/* Seção de grupos internos da empresa */}
      <div className="groups-section">
        <div className="groups-header">
          <h2 className="groups-title">Grupos internos de funcionários</h2>
          <p className="groups-subtitle">
            Cadastre grupos como <strong>RH</strong>, <strong>Tech</strong>,{' '}
            <strong>Operações</strong>, etc. Você poderá vinculá-los aos funcionários depois.
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
          border-color: #421E97;
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
          background: #421E97;
          color: white;
          box-shadow: 0 6px 20px rgba(11, 37, 39, 0.12);
        }

        .btn.small {
          min-width: 120px;
          height: 38px;
          padding: 0 16px;
          font-size: 12px;
          border-radius: 999px;
          background: #421E97;
          color: #fff;
          box-shadow: 0 4px 12px rgba(11, 37, 39, 0.12);
          white-space: nowrap;
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
          color: #421E97;
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

        .logo-field {
          grid-column: 1 / -1;
        }

        .logo-upload-container {
          margin: 12px 0;
        }

        .logo-preview-box {
          position: relative;
          width: 200px;
          height: 200px;
          border: 2px dashed #d1d5db;
          border-radius: 8px;
          background: #f9fafb;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }

        .logo-preview-box img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }

        .remove-logo-btn {
          position: absolute;
          top: -8px;
          right: -8px;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #ef4444;
          color: white;
          border: 2px solid white;
          font-size: 20px;
          line-height: 1;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          transition: background 0.2s ease;
        }

        .remove-logo-btn:hover:not(:disabled) {
          background: #dc2626;
        }

        .remove-logo-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .logo-placeholder {
          width: 200px;
          height: 200px;
          border: 2px dashed #d1d5db;
          border-radius: 8px;
          background: #f9fafb;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: border-color 0.2s ease, background 0.2s ease;
        }

        .logo-placeholder:hover {
          border-color: #9ca3af;
          background: #f3f4f6;
        }

        .placeholder-content {
          text-align: center;
          color: #9ca3af;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .placeholder-content svg {
          color: #d1d5db;
        }

        .placeholder-content p {
          margin: 0;
          font-size: 13px;
        }

        .btn-upload {
          min-width: 160px;
          height: 38px;
          border-radius: 8px;
          background: #421E97;
          color: white;
          border: none;
          font-weight: 700;
          font-size: 12px;
          letter-spacing: 0.5px;
          cursor: pointer;
          transition: background 0.2s ease;
          box-shadow: 0 2px 8px rgba(66, 30, 151, 0.2);
        }

        .btn-upload:hover:not(:disabled) {
          background: #5a2bb8;
        }

        .btn-upload:disabled {
          opacity: 0.6;
          cursor: not-allowed;
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

          .btn {
            width: 100%;
            min-width: 0;
          }

          .buttons {
            flex-direction: column;
          }

          .btn + .btn {
            margin-top: 8px;
          }
        }
      `}</style>
    </form>
  );
}
