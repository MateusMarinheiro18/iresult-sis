// src/components/admin/reports/ReportNewForm.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

type Payload = {
  titulo: string;
  texto?: string | null;
};

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

export default function ReportNewForm({ companyId }: { companyId: number }) {
  const router = useRouter();

  const [titulo, setTitulo] = useState('');
  const [texto, setTexto] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!titulo.trim()) {
      toast.error('Título do relatório é obrigatório.');
      return;
    }

    setSaving(true);

    const payload: Payload = {
      titulo: titulo.trim(),
      texto: texto.trim() || null,
    };

    try {
      const res = await fetch(`/api/companies/${companyId}/reports`, {
        method: 'POST',
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
        const msg =
          extractMessageFromBody(body) ?? 'Erro ao criar relatório.';
        toast.error(msg);
        setSaving(false);
        return;
      }

      const successMsg =
        extractMessageFromBody(body) ?? 'Relatório criado com sucesso.';
      toast.success(successMsg);

      setTimeout(() => {
        router.push(`/admin/relatorios/${companyId}`);
      }, 700);
    } catch (err: any) {
      console.error(err);
      const msg = err?.message
        ? String(err.message)
        : 'Erro inesperado. Veja o console.';
      toast.error(msg);
      setSaving(false);
    }
  }

  function handleCancel() {
    router.push(`/admin/relatorios/${companyId}`);
  }

  return (
    <form className="form-root" onSubmit={handleSubmit} noValidate>
      <div className="grid">
        <div className="field full">
          <label className="label">Título do Relatório *</label>
          <input
            className="input"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Título do relatório"
            required
          />
        </div>

        <div className="field full">
          <label className="label">Texto / Descrição</label>
          <textarea
            className="input textarea"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Digite aqui o texto ou resumo do relatório..."
            rows={6}
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

        .field.full {
          grid-column: 1 / -1;
        }

        .label {
          font-size: 12px;
          font-weight: 700;
          color: #233;
          margin-bottom: 8px;
          letter-spacing: 0.2px;
        }

        .input {
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

        .textarea {
          min-height: 140px;
          resize: vertical;
          line-height: 1.5;
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
          background: #421E97;
          color: white;
          box-shadow: 0 6px 20px rgba(11, 37, 39, 0.12);
        }

        .btn.secondary {
          background: white;
          color: #421E97;
          border: 1px solid #421E97;
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
