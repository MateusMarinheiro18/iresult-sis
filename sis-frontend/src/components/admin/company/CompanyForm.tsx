'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

type Payload = {
  razaoSocial: string;
  cnpj?: string;
  email?: string;
  telefone?: string;
  cep?: string;
};

function sanitizeDigits(s?: string) {
  return s ? s.replace(/\D/g, '') : undefined;
}

export default function CompanyForm({ initial }: { initial?: any }) {
  const [razaoSocial, setRazaoSocial] = useState(initial?.razaoSocial ?? '');
  const [cnpj, setCnpj] = useState(initial?.cnpj ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [telefone, setTelefone] = useState(initial?.telefone ?? '');
  const [cep, setCep] = useState(initial?.cep ?? '');
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!razaoSocial.trim()) {
      alert('Razão social é obrigatória.');
      return;
    }

    setSaving(true);

    const payload: Payload = {
      razaoSocial: razaoSocial.trim(),
      cnpj: sanitizeDigits(cnpj),
      email: email.trim() || undefined,
      telefone: sanitizeDigits(telefone),
      cep: sanitizeDigits(cep),
    };

    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(body?.message ?? 'Erro ao salvar empresa.');
        setSaving(false);
        return;
      }

      router.push('/admin/empresas');
    } catch (err) {
      console.error(err);
      alert('Erro inesperado. Veja o console.');
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

        <button
          type="button"
          className="btn secondary"
          onClick={() => {
            if (confirm('Deseja deletar esta empresa?')) {
              alert('Função de deletar será disponibilizada no modo edição.');
            }
          }}
        >
          DELETAR
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

        /* Se quiser um placeholder mais escuro, troque por:
           color: #6b7280;
        */

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
