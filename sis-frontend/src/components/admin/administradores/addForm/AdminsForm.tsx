'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function AdminsForm({ initial }: { initial?: any } = {}) {
  const [nome, setNome] = useState(initial?.nome ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  function validate(): string | null {
    if (!nome || nome.trim().length < 2) return 'Nome é obrigatório (mínimo 2 caracteres).';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Email é obrigatório e deve ser válido.';
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = validate();
    if (v) {
      toast.error(v);
      return;
    }

    setSaving(true);

    const payload = {
      nome: nome.trim(),
      email: email.trim(),
    };

    const loadingId = toast.loading('Criando administrador...');

    try {
      const res = await fetch('/api/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const text = await res.text().catch(() => '');
      let body: any = {};
      try { body = text ? JSON.parse(text) : {}; } catch (e) { body = { text }; }

      if (!res.ok) {
        console.error('Erro API /admins', { status: res.status, body });
        toast.error(body?.error ?? 'Erro ao criar administrador.', { id: loadingId });
        setSaving(false);
        return;
      }

      toast.success('Administrador criado com sucesso! (senha enviada por e-mail)', { id: loadingId });
      router.push('/admin/administradores');
    } catch (err) {
      console.error('Erro ao criar administrador (fetch)', err);
      toast.error('Erro de rede ao criar administrador.');
      setSaving(false);
    }
  }

  return (
    <form className="form-root" onSubmit={handleSubmit} noValidate>
      <div className="grid">
        <div className="field">
          <label className="label">Nome *</label>
          <input
            className="input"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome completo"
            required
          />
        </div>

        <div className="field">
          <label className="label">Email *</label>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="usuario@dominio.com"
            required
          />
        </div>
      </div>

      <div className="buttons">
        <button type="submit" className="btn primary" disabled={saving}>
          {saving ? 'Salvando...' : 'SALVAR'}
        </button>
        <button type="button" className="btn secondary" disabled={saving} onClick={() => history.back()}>
          Cancelar
        </button>
      </div>

      <style jsx>{`
        .form-root { display: block; }
        .grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 18px;
          align-items: start;
        }
        .field { display:flex; flex-direction:column; }
        .label { font-size:12px; font-weight:700; color:#233; margin-bottom:8px; letter-spacing:0.2px; }
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
        .input::placeholder { color: #9ca3af; opacity:1; }
        .input:focus { border-color: #0b2527; box-shadow: 0 0 0 3px rgba(11,37,39,0.06); }
        .buttons { margin-top: 26px; display:flex; gap:16px; justify-content:center; align-items:center; }
        .btn { min-width: 180px; height:44px; border-radius:999px; font-weight:700; letter-spacing:0.6px; cursor:pointer; border:none; }
        .btn.primary { background: #0b2527; color: white; box-shadow: 0 6px 20px rgba(11,37,39,0.12); }
        .btn.primary:disabled { opacity:0.6; cursor:not-allowed; }
        .btn.secondary { background: white; color: #0b2527; border: 1px solid #0b2527; }

        @media (max-width: 960px) {
          .grid { grid-template-columns: 1fr; }
          .buttons { flex-direction: column; }
          .btn { width: 100%; min-width: 0; }
          .btn + .btn { margin-top: 8px; }
        }
      `}</style>
    </form>
  );
}
