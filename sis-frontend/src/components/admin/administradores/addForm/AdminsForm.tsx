'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

type Payload = {
  nome: string;
  email: string;
  senha: string;
  ativo?: number;
};

export default function AdminsForm({ initial }: { initial?: any } = {}) {
  const [nome, setNome] = useState(initial?.nome ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [senha, setSenha] = useState('');
  const [ativo, setAtivo] = useState(initial?.ativo === 0 ? false : true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  function validate(): string | null {
    if (!nome || nome.trim().length < 2) return 'Nome é obrigatório (mínimo 2 caracteres).';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Email é obrigatório e deve ser válido.';
    // senha obrigatória quando criando
    if (!initial && (!senha || senha.length < 6)) return 'Senha é obrigatória (mínimo 6 caracteres).';
    if (senha && senha.length > 0 && senha.length < 6) return 'Senha deve ter no mínimo 6 caracteres.';
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

    const payload: Payload = {
      nome: nome.trim(),
      email: email.trim(),
      senha: senha,
      ativo: ativo ? 1 : 0,
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

      toast.success('Administrador criado com sucesso!', { id: loadingId });
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

        <div className="field">
          <label className="label">Senha {initial ? '(opcional)' : '*'}</label>
          <input
            className="input"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder={initial ? 'Nova senha (deixe em branco para manter)' : 'Senha de acesso'}
            {...(!initial ? { required: true } : {})}
          />
        </div>

        {/* === AQUI: substituí o checkbox por um switch igual ao do EscalaBuilderForm === */}
        <div className="field" style={{ alignSelf: 'center' }}>
          <label className="label">Ativo</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label className="switch new-switch" aria-label="Ativo">
              <input
                type="checkbox"
                id="ativo-checkbox-admin"
                checked={ativo}
                onChange={(e) => setAtivo(e.target.checked)}
                aria-checked={ativo}
              />
              <span className="slider" />
            </label>
            <label htmlFor="ativo-checkbox-admin" style={{ fontSize: 13, color: '#374151' }}>
              {ativo ? 'Sim' : 'Não'}
            </label>
          </div>
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

        /* SWITCH (mesmos estilos do EscalaBuilderForm) */
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
