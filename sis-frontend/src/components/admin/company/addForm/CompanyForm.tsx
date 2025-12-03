// src/components/admin/company/addForm/CompanyForm.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

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

function formatCnpj(value?: string) {
  const d = (value ?? '').replace(/\D/g, '').slice(0, 14);
  if (!d) return '';
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

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
  const [cnpj, setCnpj] = useState<string>(initial?.cnpj ? formatCnpj(initial.cnpj) : '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [telefone, setTelefone] = useState<string>(
    initial?.telefone ? formatPhoneBR(initial.telefone) : ''
  );
  const [cep, setCep] = useState<string>(initial?.cep ? formatCep(initial.cep) : '');
  const [saving, setSaving] = useState(false);

  // Escala vinculada
  const [escalas, setEscalas] = useState<EscalaOption[]>([]);
  const [escalaId, setEscalaId] = useState<string>(
    initial?.escalaId ? String(initial.escalaId) : ''
  );

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

  // Se `initial` mudar (edge cases), reatribui valores
  useEffect(() => {
    setRazaoSocial(initial?.razaoSocial ?? '');
    setCnpj(initial?.cnpj ? formatCnpj(initial.cnpj) : '');
    setEmail(initial?.email ?? '');
    setTelefone(initial?.telefone ? formatPhoneBR(initial.telefone) : '');
    setCep(initial?.cep ? formatCep(initial.cep) : '');
    setEscalaId(initial?.escalaId ? String(initial.escalaId) : '');

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!razaoSocial.trim()) {
      toast.error('Razão social é obrigatória.');
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
            onChange={(e) => setCnpj(formatCnpj(e.target.value))}
            placeholder="00.000.000/0001-00"
          />
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
          <input
            className="input"
            value={cep}
            onChange={(e) => setCep(formatCep(e.target.value))}
            placeholder="00000-000"
          />
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
