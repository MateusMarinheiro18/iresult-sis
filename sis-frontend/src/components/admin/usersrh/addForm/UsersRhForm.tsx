'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

type Payload = {
  nome: string;
  email?: string | null;
  telefone?: string | null;
  data_nascimento?: string | null;
  cidade?: string | null;
  gestor?: string | null;
  ativo?: number;
};

function sanitizeDigits(s?: string) {
  return s ? s.replace(/\D/g, '') : undefined;
}

export default function UsersRhForm({ companyId, initial }: { companyId?: number; initial?: any }) {
  // helper to format date to yyyy-mm-dd
  function formatDateForInput(d: string | Date) {
    const date = d instanceof Date ? d : new Date(d);
    if (Number.isNaN(date.getTime())) return '';
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  /**
   * Formata telefone BR incremental:
   * - assume +55 se não houver código de país explícito
   * - formata (DD) 9XXXX-XXXX ou (DD) XXXX-XXXX conforme comprimento
   * - também suporta números com código de país no início (ex: 5511999999999)
   */
  function formatPhone(value?: string) {
    const raw = (value ?? '').replace(/\D/g, '');
    if (!raw) return '';

    let digits = raw;
    let country = '';

    // if more than 11 digits, assume leading country code(s)
    if (digits.length > 11) {
      country = digits.slice(0, digits.length - 11);
      digits = digits.slice(digits.length - 11);
    }

    const parts: string[] = [];
    if (country) parts.push(`+${country}`);

    if (digits.length <= 2) {
      parts.push(digits);
      return parts.join(' ').trim();
    }

    const ddd = digits.slice(0, 2);
    const rest = digits.slice(2);

    if (rest.length === 0) {
      parts.push(`(${ddd})`);
      return parts.join(' ').trim();
    }

    if (rest.length <= 4) {
      parts.push(`(${ddd}) ${rest}`);
      return parts.join(' ').trim();
    }

    if (rest.length <= 7) {
      parts.push(`(${ddd}) ${rest.slice(0, rest.length - 4)}-${rest.slice(-4)}`);
      return parts.join(' ').trim();
    }

    if (rest.length <= 10) {
      parts.push(`(${ddd}) ${rest.slice(0, rest.length - 4)}-${rest.slice(-4)}`);
      return parts.join(' ').trim();
    }

    // 11+ digits (9xxxx-xxxx)
    parts.push(`(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5, 9)}`);
    return parts.join(' ').trim();
  }

  const [nome, setNome] = useState(initial?.nome ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [telefone, setTelefone] = useState<string>(initial?.telefone ? formatPhone(initial.telefone) : '');
  const [dataNascimento, setDataNascimento] = useState(initial?.data_nascimento ? formatDateForInput(initial.data_nascimento) : '');
  const [cidade, setCidade] = useState(initial?.cidade ?? '');
  const [gestor, setGestor] = useState(initial?.gestor ?? '');
  const [ativo, setAtivo] = useState(initial?.ativo === 0 ? false : true);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  // Re-format telefone caso `initial` seja carregado/alterado depois
  useEffect(() => {
    setTelefone(initial?.telefone ? formatPhone(initial.telefone) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial?.id]);

  function validate(): string | null {
    if (!nome || nome.trim().length < 2) return 'Nome é obrigatório (mínimo 2 caracteres).';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Email é obrigatório e deve ser válido.';
    if (dataNascimento) {
      const d = new Date(dataNascimento);
      if (Number.isNaN(d.getTime())) return 'Data de nascimento inválida.';
      if (d.getTime() > Date.now()) return 'Data de nascimento não pode ser no futuro.';
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = validate();
    if (v) {
      toast.error(v);
      return;
    }

    if (!companyId || Number.isNaN(Number(companyId)) || Number(companyId) <= 0) {
      toast.error('companyId inválido — impossível enviar.');
      return;
    }

    setSaving(true);

    const payload: Payload = {
      nome: nome.trim(),
      email: email.trim() || undefined,
      telefone: sanitizeDigits(telefone) || undefined,
      data_nascimento: dataNascimento || undefined,
      cidade: cidade.trim() || undefined,
      gestor: gestor.trim() || undefined,
      ativo: ativo ? 1 : 0,
    };

    const loadingId = toast.loading('Salvando usuário RH...');

    try {
      const res = await fetch(`/api/companies/${companyId}/usersrh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const text = await res.text().catch(() => '');
      let body: any = {};
      try { body = text ? JSON.parse(text) : {}; } catch (e) { body = { text }; }

      if (!res.ok) {
        console.error('Erro API /usersrh', { status: res.status, body });
        toast.error(body?.error ?? 'Erro ao salvar usuário RH.', { id: loadingId });
        setSaving(false);
        return;
      }

      toast.success('Usuário RH criado com sucesso!', { id: loadingId });
      router.push(`/admin/empresas/${companyId}/usuariosrh`);
    } catch (err) {
      console.error('Erro ao salvar usuário RH (fetch)', err);
      toast.error('Erro de rede ao salvar usuário RH.');
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
            placeholder="usuario@empresa.com"
            required
          />
        </div>

        <div className="field">
          <label className="label">Telefone</label>
          <input
            className="input"
            value={telefone}
            onChange={(e) => setTelefone(formatPhone(e.target.value))}
            placeholder="+55 (11) 99999-9999"
          />
        </div>

        <div className="field">
          <label className="label">Data de Nascimento</label>
          <input
            className="input"
            type="date"
            value={dataNascimento}
            onChange={(e) => setDataNascimento(e.target.value)}
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
          <label className="label">Gestor</label>
          <input
            className="input"
            value={gestor}
            onChange={(e) => setGestor(e.target.value)}
            placeholder="Nome do gestor"
          />
        </div>

        <div className="field" style={{ alignSelf: 'center' }}>
          <label className="label">Ativo</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              id="ativo-checkbox"
              type="checkbox"
              checked={ativo}
              onChange={(e) => setAtivo(e.target.checked)}
            />
            <label htmlFor="ativo-checkbox" style={{ fontSize: 13, color: '#374151' }}>
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
