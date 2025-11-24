// src/components/admin/company/CompanyEditForm.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

/*
  Reference prototype (local file):
  /mnt/data/Psyqué Protótipo Basico.pdf
*/

type Payload = {
  razaoSocial: string;
  cnpj?: string | null;
  email?: string | null;
  telefone?: string | null;
  cep?: string | null;
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
  };
}) {
  const router = useRouter();

  const [razaoSocial, setRazaoSocial] = useState(initial?.razaoSocial ?? '');
  const [cnpj, setCnpj] = useState(initial?.cnpj ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [telefone, setTelefone] = useState(initial?.telefone ?? '');
  const [cep, setCep] = useState(initial?.cep ?? '');
  const [saving, setSaving] = useState(false);

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
    };

    try {
      const res = await fetch(`/api/companies/${initial.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // tenta ler como json, mas pode ser string — por isso o catch
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

      // sucesso: normaliza mensagem se existir, senão usa padrão
      const successMsg = extractMessageFromBody(body) ?? 'Empresa atualizada com sucesso.';
      const id = toast.success(successMsg);

      // dá um pequeno delay para o usuário enxergar o toast antes de redirecionar
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
            onChange={(e) => setCnpj(e.target.value)}
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
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="+55 (11) 99999-9999"
          />
        </div>

        <div className="field">
          <label className="label">CEP</label>
          <input
            className="input"
            value={cep}
            onChange={(e) => setCep(e.target.value)}
            placeholder="00000-000"
          />
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
          color: #111827; /* cor do texto digitado */
        }

        .input::placeholder {
          color: #9ca3af; /* cor do placeholder (cinza claro) */
          opacity: 1; /* garante compatibilidade cross-browser */
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
