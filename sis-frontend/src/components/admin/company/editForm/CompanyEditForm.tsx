// src/components/admin/company/editForm/CompanyEditForm.tsx
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
  cnpj?: string | null;
  email?: string | null;
  telefone?: string | null;
  cep?: string | null;
  escalaId?: number | null;
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
  };
}) {
  const router = useRouter();

  const [razaoSocial, setRazaoSocial] = useState(initial?.razaoSocial ?? '');
  const [cnpj, setCnpj] = useState<string>(initial?.cnpj ? formatCnpj(initial.cnpj) : '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [telefone, setTelefone] = useState<string>(initial?.telefone ? formatPhoneBR(initial.telefone) : '');
  const [cep, setCep] = useState<string>(initial?.cep ? formatCep(initial.cep) : '');
  const [saving, setSaving] = useState(false);

  // Escala vinculada
  const [escalas, setEscalas] = useState<EscalaOption[]>([]);
  const [escalaId, setEscalaId] = useState<string>(
    initial?.escalaId ? String(initial.escalaId) : ''
  );

  // Se `initial` mudar (raro), reatribui valores
  useEffect(() => {
    setRazaoSocial(initial?.razaoSocial ?? '');
    setCnpj(initial?.cnpj ? formatCnpj(initial.cnpj) : '');
    setEmail(initial?.email ?? '');
    setTelefone(initial?.telefone ? formatPhoneBR(initial.telefone) : '');
    setCep(initial?.cep ? formatCep(initial.cep) : '');
    setEscalaId(initial?.escalaId ? String(initial.escalaId) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial?.id]);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!razaoSocial.trim()) {
      toast.error('Razão social é obrigatória.');
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

      <div className="buttons">
        <button type="submit" className="btn primary" disabled={saving}>
          {saving ? 'Salvando...' : 'SALVAR'}
        </button>

        <button type="button" className="btn secondary" onClick={handleCancel} disabled={saving}>
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

        @media (max-width: 960px) {
          .grid {
            grid-template-columns: 1fr;
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
